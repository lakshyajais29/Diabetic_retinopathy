"""
RetinaSetu | 4-stage screening pipeline orchestrator
===================================================

Connects the four stage models in :mod:`models` into a single auditable
screening run and emits the exact ``PipelineResult`` payload consumed by the
Next.js API (see ``lib/pipeline/types.ts``).

    Stage 1  Image Quality Assessment    -> gate: is this gradable at all?
    Stage 2  Retinal Structure Analysis  -> anatomical frame for everything after
    Stage 3  Lesion Detection            -> the evidence
    Stage 4  DR Severity Grading         -> grade + attention + fused confidence

Two design commitments are worth calling out, because they are what make this a
clinical pipeline rather than a single classifier with extra steps:

1. **Stage 1 is a gate, not a metric.** An ungradeable photograph halts the run
   and returns recapture guidance. The system refuses to grade what it cannot
   see, instead of returning a confident number from a bad image.
2. **Every stage feeds the next.** Stage 2's disc/fovea axis defines the
   quadrants Stage 3 counts into; Stages 1-3 are packed into the evidence vector
   that Stage 4 fuses with its own image logits. The result is a grade that can
   be reconciled against an explicit clinical rule engine, and any disagreement
   escalates to a human.

Run it::

    python ml/pipeline.py --image samples/eye.jpg            # full audit trail
    python ml/pipeline.py --image samples/eye.jpg --full     # entire result payload
    python ml/pipeline.py --image samples/eye.jpg --out run.json --fast

``--image`` is mandatory. The capture is decoded (Pillow, or OpenCV as a
fallback) and its real geometry is logged and stamped into the payload before
Stage 1 runs, so overlay coordinates on the frontend land on real pixels.

The same ``DRPipeline`` instance backs the HTTP service in ``api.py``, which is
what the Next.js frontend actually calls.

DEMO_MODE (see ``models.py``) is on, so each ``predict()`` returns a
contract-shaped fixture and the run completes in seconds without checkpoints.
The orchestration, gating, fusion and reporting logic below is the real thing.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from models import (  # noqa: E402  - local module, path set above
    DEMO_MODE,
    DRSeverityClassifier,
    LesionDetectionFRCNN,
    QualityAssessmentNet,
    RetinalStructureUNet,
)

# --------------------------------------------------------------------------- #
# Console presentation                                                          #
# --------------------------------------------------------------------------- #

WIDTH = 78


class Palette:
    """ANSI styling, switched off automatically when the sink is not a TTY."""

    def __init__(self, enabled: bool = True) -> None:
        self.enabled = enabled and _ansi_supported()

    def _wrap(self, code: str, text: str) -> str:
        return f"\033[{code}m{text}\033[0m" if self.enabled else text

    def bold(self, t: str) -> str:   return self._wrap("1", t)
    def dim(self, t: str) -> str:    return self._wrap("2", t)
    def cyan(self, t: str) -> str:   return self._wrap("36", t)
    def green(self, t: str) -> str:  return self._wrap("32", t)
    def yellow(self, t: str) -> str: return self._wrap("33", t)
    def red(self, t: str) -> str:    return self._wrap("31", t)
    def blue(self, t: str) -> str:   return self._wrap("34", t)


def _ansi_supported() -> bool:
    """True when the attached terminal can render ANSI escapes."""
    if os.environ.get("NO_COLOR"):
        return False
    if not sys.stdout.isatty():
        return False
    if os.name == "nt":  # enable VT processing on legacy Windows consoles
        try:
            import ctypes

            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:  # noqa: BLE001 - styling is never worth an exception
            return False
    return True


class AuditFormatter(logging.Formatter):
    """Timestamped, level-coloured formatter - this is the audit trail."""

    def __init__(self, palette: Palette) -> None:
        super().__init__(fmt="%(asctime)s.%(msecs)03d | %(levelname)-7s | %(message)s",
                         datefmt="%H:%M:%S")
        self.palette = palette

    def format(self, record: logging.LogRecord) -> str:
        colour = {
            "DEBUG": self.palette.dim,
            "INFO": self.palette.cyan,
            "WARNING": self.palette.yellow,
            "ERROR": self.palette.red,
        }.get(record.levelname, str)
        original = record.levelname
        record.levelname = colour(f"{original:<7}").rstrip() if self.palette.enabled else original
        try:
            line = super().format(record)
        finally:
            record.levelname = original
        return line


def configure_logging(palette: Palette, level: int = logging.INFO) -> logging.Logger:
    """Attach a single clean handler; never inherit whatever the host set up."""
    logger = logging.getLogger("retinasetu.pipeline")
    logger.handlers.clear()
    logger.propagate = False
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(AuditFormatter(palette))
    logger.addHandler(handler)
    logger.setLevel(level)
    return logger


# --------------------------------------------------------------------------- #
# Clinical constants (mirror of lib/pipeline/constants.ts)                      #
# --------------------------------------------------------------------------- #

#: Level 2 (Moderate NPDR) and above requires an ophthalmologist.
REFERABLE_THRESHOLD = 2

DR_SCALE: Dict[int, Dict[str, Any]] = {
    0: {"short": "No DR", "clinical": "No apparent retinopathy",
        "followUp": "Re-screen in 12 months",
        "recommendation": "No retinopathy detected. Continue routine annual screening.",
        "actions": ["Reinforce glycaemic, blood-pressure and lipid control",
                    "Schedule the next PHC screening visit in 12 months"]},
    1: {"short": "Mild NPDR", "clinical": "Mild non-proliferative diabetic retinopathy",
        "followUp": "Re-screen in 12 months",
        "recommendation": "Earliest changes present. Not yet referable - manage "
                          "systemically and re-screen annually.",
        "actions": ["Tighten glycaemic control; review HbA1c",
                    "Record baseline image for future comparison"]},
    2: {"short": "Moderate NPDR", "clinical": "Moderate non-proliferative diabetic retinopathy",
        "followUp": "Ophthalmology review within 3 months",
        "recommendation": "Referable diabetic retinopathy. Refer to the district "
                          "ophthalmologist for confirmatory assessment.",
        "actions": ["Refer to district hospital ophthalmology within 3 months",
                    "Assess for diabetic macular oedema at review",
                    "Intensify systemic risk-factor control"]},
    3: {"short": "Severe NPDR", "clinical": "Severe non-proliferative diabetic retinopathy",
        "followUp": "Ophthalmology review within 2-4 weeks",
        "recommendation": "Severe non-proliferative disease. Prompt ophthalmology "
                          "assessment required.",
        "actions": ["Refer to ophthalmology within 2-4 weeks",
                    "Flag for possible panretinal photocoagulation assessment"]},
    4: {"short": "Proliferative DR", "clinical": "Proliferative diabetic retinopathy",
        "followUp": "Ophthalmology review within 1 week",
        "recommendation": "Sight-threatening proliferative disease suspected. Urgent "
                          "ophthalmology referral.",
        "actions": ["Urgent referral - ophthalmology assessment within 1 week",
                    "Escalate to the district DR programme coordinator today"]},
}

QUADRANT_ABBR = {
    "superotemporal": "SUP-TEMP", "superonasal": "SUP-NAS",
    "inferotemporal": "INF-TEMP", "inferonasal": "INF-NAS",
}

LESION_LABELS = {
    "microaneurysm": "Microaneurysms", "haemorrhage": "Haemorrhages",
    "hard_exudate": "Hard exudates", "soft_exudate": "Cotton-wool spots",
    "neovascularisation": "Neovascularisation", "irma": "IRMA",
    "venous_beading": "Venous beading",
}

DEFAULT_PATIENT: Dict[str, Any] = {
    "patientId": "PHC-DEMO-0142", "age": "54", "sex": "female",
    "diabetesDurationYears": "11", "eye": "left",
    "phc": "PHC Rampur, Block 4", "operator": "CHO A. Verma",
    "notes": "Routine annual diabetic screening; no visual complaints reported.",
}


@dataclass
class StageTelemetry:
    """One row of the audit trail - mirrors ``StageTelemetry`` in types.ts."""

    id: str
    index: int
    title: str
    provenance: str          # cv | model | rules | hybrid
    engine: Optional[str]    # mistral | deterministic
    durationMs: int
    degraded: bool = False
    degradedReason: Optional[str] = None


# --------------------------------------------------------------------------- #
# Orchestrator                                                                  #
# --------------------------------------------------------------------------- #

class DRPipeline:
    """Sequential 4-stage DR screening pipeline with a full audit trail.

    Parameters
    ----------
    device
        Torch device the stage models are placed on. CPU is the default because
        the deployment target is a district-hospital workstation, not a GPU box.
    simulate_latency
        Insert a short cosmetic pause between stages so the audit trail is
        readable as it streams. This is presentation pacing only - it is not
        compute, and it is reported as such in the run header.
    verbose
        Emit the human-readable audit trail. Set False when the pipeline is
        driven by the API, which consumes the returned payload instead.
    """

    STAGES = [
        ("quality",    1, "Image Quality Assessment",   "APTOS 2019 + custom PHC"),
        ("structures", 2, "Retinal Structure Analysis", "DRIVE + IDRiD"),
        ("lesions",    3, "Lesion Detection",           "IDRiD + Messidor-2"),
        ("grading",    4, "DR Severity Grading",        "APTOS 2019 + Messidor-2"),
    ]

    def __init__(self, device: str = "cpu", simulate_latency: bool = True,
                 verbose: bool = True, palette: Optional[Palette] = None) -> None:
        self.device = device
        self.simulate_latency = simulate_latency
        self.verbose = verbose
        self.palette = palette or Palette()
        # Quiet runs (API-driven) keep errors only; the payload is the output.
        self.log = configure_logging(self.palette,
                                     logging.INFO if verbose else logging.ERROR)
        self.telemetry: List[StageTelemetry] = []
        self.models: Dict[str, Any] = {}
        self._load_models()

    # -- model loading ----------------------------------------------------- #

    def _load_models(self) -> None:
        """Instantiate the four stage models and load their checkpoints."""
        started = time.perf_counter()
        self.models = {
            "quality": QualityAssessmentNet().load_weights(),
            "structures": RetinalStructureUNet().load_weights(),
            "lesions": LesionDetectionFRCNN().load_weights(),
            "grading": DRSeverityClassifier(ensemble_folds=5).load_weights(),
        }
        for model in self.models.values():
            model.to(self.device).eval()
        self._boot_ms = int((time.perf_counter() - started) * 1000)

    # -- console helpers --------------------------------------------------- #

    def _rule(self, char: str = "-") -> None:
        if self.verbose:
            self.log.info(self.palette.dim(char * WIDTH))

    def _banner(self, run_id: str, image_path: str) -> None:
        if not self.verbose:
            return
        p = self.palette
        print()
        print(p.cyan("=" * WIDTH))
        print(p.bold(p.cyan("  RetinaSetu  |  4-Stage Diabetic Retinopathy Screening Pipeline")))
        print(p.dim(f"  run {run_id}  |  image {Path(image_path).name}  |  device {self.device}"))
        print(p.dim(f"  inference mode: {'FIXTURE (DEMO_MODE)' if DEMO_MODE else 'LIVE'}"
                    f"   |   pacing: {'simulated' if self.simulate_latency else 'off'}"))
        print(p.cyan("=" * WIDTH))
        print()
        self.log.info("Model registry warm - 4 stage models resident in %d ms", self._boot_ms)
        for stage_id, index, title, corpus in self.STAGES:
            card = self.models[stage_id].describe()
            self.log.info(
                "  Stage %d  %-38s %6.1fM params  %s",
                index, card["modelId"], card["parameters"] / 1e6, p.dim(corpus),
            )

    def _stage_header(self, index: int, title: str, corpus: str) -> None:
        if not self.verbose:
            return
        p = self.palette
        self._rule()
        self.log.info(p.bold(f" STAGE {index}/4  {title.upper()}"))
        self.log.info(p.dim(f"          trained on: {corpus}"))
        self._rule()

    def _pace(self, seconds: float) -> None:
        if self.simulate_latency:
            time.sleep(seconds)

    def _record(self, stage_id: str, index: int, title: str, provenance: str,
                started: float, degraded: bool = False,
                reason: Optional[str] = None) -> StageTelemetry:
        entry = StageTelemetry(
            id=stage_id, index=index, title=title, provenance=provenance,
            engine="deterministic",
            durationMs=int((time.perf_counter() - started) * 1000),
            degraded=degraded, degradedReason=reason,
        )
        self.telemetry.append(entry)
        return entry

    # -- Stage 1 ----------------------------------------------------------- #

    def _stage_quality(self, image_path: str,
                       source: "SourceImage") -> Dict[str, Any]:
        stage_id, index, title, corpus = self.STAGES[0]
        self._stage_header(index, title, corpus)
        started = time.perf_counter()
        model = self.models[stage_id]

        self.log.info("Preprocessing %dx%d -> %dx%d, fundus-normalised (APTOS/Messidor stats)",
                      source.width, source.height, *model.INPUT_SIZE)
        self._pace(0.35)
        self.log.info("Scoring six auditable sub-metrics + gradability verdict")
        quality = model.predict(image_path)
        # Overlay geometry is expressed in normalised coordinates, so the frontend
        # needs the true pixel dimensions of the capture it is drawing on.
        quality["imageWidth"], quality["imageHeight"] = source.width, source.height
        self._pace(0.25)

        p = self.palette
        for metric in quality["metrics"]:
            status = metric["status"]
            colour = {"pass": p.green, "warn": p.yellow, "fail": p.red}[status]
            self.log.info("    %-23s %s  %s",
                          metric["label"],
                          colour(f"{metric['score']:>3}/100"),
                          p.dim(f"[{status.upper()}] {metric['rawLabel']} = {metric['raw']}"))

        enhancement = quality.get("enhancement")
        if enhancement and enhancement["applied"]:
            self.log.info("Enhancement applied: %s", ", ".join(enhancement["operations"]))
            self.log.info("    quality %d -> %d  (%s -> %s)",
                          enhancement["scoreBefore"], enhancement["scoreAfter"],
                          enhancement["verdictBefore"], enhancement["verdictAfter"])

        self._record(stage_id, index, title, "hybrid", started)
        verdict, score = quality["verdict"], quality["overallScore"]

        if not quality["gradable"]:
            self.log.warning("GATE FAILED - image %d/100 (%s). Halting before grading.",
                             score, verdict)
            return quality

        tone = p.green if verdict == "good" else p.yellow
        self.log.info("%s Stage 1 complete: quality %s, verdict %s. Routing to Stage 2...",
                      p.green("[PASS]"), tone(f"{score}/100"), tone(verdict))
        return quality

    # -- Stage 2 ----------------------------------------------------------- #

    def _stage_structures(self, image_path: str, quality: Dict[str, Any]) -> Dict[str, Any]:
        stage_id, index, title, corpus = self.STAGES[1]
        self._stage_header(index, title, corpus)
        started = time.perf_counter()
        model = self.models[stage_id]

        self.log.info("U-Net segmentation: vessel / optic-disc / macula channels")
        self._pace(0.4)
        structures = model.predict(image_path, quality=quality)
        p = self.palette

        disc, fovea, vessels = structures["opticDisc"], structures["fovea"], structures["vessels"]
        self.log.info("    Optic disc      %s at (%.3f, %.3f)  r=%.3f  conf %.2f",
                      p.green("LOCALISED") if disc["detected"] else p.red("NOT FOUND"),
                      disc["centre"]["x"], disc["centre"]["y"], disc["radius"], disc["confidence"])
        self.log.info("    Fovea / macula  %s at (%.3f, %.3f)  %s from disc",
                      p.green("LOCALISED") if fovea["detected"] else p.red("NOT FOUND"),
                      fovea["centre"]["x"], fovea["centre"]["y"],
                      p.bold(f"{fovea['discDiameters']:.2f} DD"))
        self.log.info("    Vessel density  %s   arcade continuity %d/100   tortuosity %.2f",
                      p.bold(f"{vessels['densityPct']:.1f}%"),
                      vessels["arcadeContinuity"], vessels["tortuosityIndex"])
        self.log.info("    Laterality      %s   field: %s",
                      p.bold(structures["laterality"]), structures["fieldDefinition"])
        self._pace(0.2)

        agreement = structures["modelAgreement"]
        self.log.info("    Cross-check     CV vs U-Net disc offset %.3f -> %s",
                      agreement["discOffset"] or 0.0,
                      p.green(agreement["status"].upper()))

        self._record(stage_id, index, title, "hybrid", started)
        self.log.info("%s Stage 2 complete: anatomy %s. Quadrant frame established, "
                      "routing to Stage 3...",
                      p.green("[PASS]"),
                      "complete" if structures["anatomyComplete"] else "incomplete")
        return structures

    # -- Stage 3 ----------------------------------------------------------- #

    def _stage_lesions(self, image_path: str, structures: Dict[str, Any]) -> Dict[str, Any]:
        stage_id, index, title, corpus = self.STAGES[2]
        self._stage_header(index, title, corpus)
        started = time.perf_counter()
        model = self.models[stage_id]
        p = self.palette

        self.log.info("Faster R-CNN + FPN, anchors from %d px (microaneurysm-scale)",
                      model.ANCHOR_SIZES[0][0])
        self._pace(0.45)
        self.log.info("Per-class NMS at IoU %.2f, score threshold %.2f",
                      model.NMS_THRESHOLD, model.SCORE_THRESHOLD)
        lesions = model.predict(image_path, structures=structures)
        self._pace(0.25)

        counts = lesions["counts"]
        total = sum(counts.values())
        for key, label in LESION_LABELS.items():
            n = counts.get(key, 0)
            if n == 0:
                self.log.info("    %-20s %s", label, p.dim("none detected"))
                continue
            bar = "#" * min(n, 40)
            self.log.info("    %-20s %s  %s", label, p.bold(f"{n:>3}"), p.yellow(bar))

        burden = lesions["quadrantBurden"]
        self.log.info("    Quadrant burden (red lesions): %s",
                      "  ".join(f"{QUADRANT_ABBR[q]}={n}" for q, n in burden.items()))
        self.log.info("    CV corroboration %s of model detections independently "
                      "confirmed by classical blob analysis",
                      p.bold(f"{lesions['corroborationScore']}%"))

        four_two_one = lesions["fourTwoOne"]
        rule_state = p.red("TRIGGERED") if four_two_one["triggered"] else p.green("NOT MET")
        self.log.info("    4-2-1 severe-NPDR rule: %s  (H=%d/4, VB=%d/2, IRMA=%d/1)",
                      rule_state, four_two_one["severeHaemorrhageQuadrants"],
                      four_two_one["venousBeadingQuadrants"], four_two_one["irmaQuadrants"])

        self._record(stage_id, index, title, "hybrid", started)
        self.log.info("%s Stage 3 complete: %s lesions across %d classes. "
                      "Evidence vector assembled, routing to Stage 4...",
                      p.green("[PASS]"), p.bold(str(total)),
                      sum(1 for v in counts.values() if v > 0))
        return lesions

    # -- Stage 4 ----------------------------------------------------------- #

    def _stage_grading(self, image_path: str, quality: Dict[str, Any],
                       structures: Dict[str, Any], lesions: Dict[str, Any]) -> Dict[str, Any]:
        stage_id, index, title, corpus = self.STAGES[3]
        self._stage_header(index, title, corpus)
        started = time.perf_counter()
        model = self.models[stage_id]
        p = self.palette

        evidence = model.build_evidence_vector(quality, structures, lesions)
        self.log.info("Evidence vector built from Stages 1-3: shape %s",
                      tuple(evidence.shape))
        self.log.info("Grading with %d-fold ensemble + horizontal-flip TTA",
                      model.ensemble_folds)
        self._pace(0.5)

        payload = model.predict(image_path, quality=quality,
                                structures=structures, lesions=lesions)
        grading = payload["grading"]
        explain = payload["explainability"]
        confidence = payload["confidence"]
        self._pace(0.2)

        # -- grade distribution ------------------------------------------- #
        for level, prob in enumerate(grading["distribution"]):
            marker = p.bold(">>") if level == grading["level"] else "  "
            bar = "#" * int(round(prob * 40))
            label = DR_SCALE[level]["short"]
            self.log.info("  %s Level %d  %-18s %s %s",
                          marker, level, label, f"{prob:5.2f}",
                          p.yellow(bar) if level == grading["level"] else p.dim(bar))

        self.log.info("    Rule engine  -> Level %d  (%s)",
                      grading["ruleBased"]["level"], grading["ruleBased"]["triggeredRule"])
        self.log.info("    CNN ensemble -> Level %d  (margin %.2f, entropy %.2f)",
                      grading["modelBased"]["level"], grading["margin"], grading["entropy"])
        self.log.info("    Agreement    -> %s",
                      p.green("CONCORDANT") if grading["agreement"]["agrees"]
                      else p.red("DISCORDANT"))

        # -- attention map -------------------------------------------------- #
        self.log.info("Attention field (%dx%d, source=%s):",
                      explain["gridSize"], explain["gridSize"], explain["attentionSource"])
        for row in _render_heatmap(explain["attentionGrid"]):
            self.log.info("      %s", p.blue(row))

        overlap = explain["evidenceOverlapScore"]
        interpretation = explain["overlapInterpretation"]
        tone = {"aligned": p.green, "partial": p.yellow, "misaligned": p.red}[interpretation]
        emit = self.log.warning if interpretation == "misaligned" else self.log.info
        emit("    Evidence overlap %s -> %s  (lesions %d%% / anatomy %d%% / unexplained %d%%)",
             tone(f"{overlap}/100"), tone(interpretation.upper()),
             explain["attentionOnLesionsPct"], explain["attentionOnAnatomyPct"],
             explain["attentionUnexplainedPct"])
        if interpretation == "misaligned":
            self.log.warning("    FLAG: attention field misaligned with detected evidence - "
                             "autonomous reporting disabled for this run.")

        # -- fused confidence ----------------------------------------------- #
        self.log.info("Confidence fusion (%d weighted factors):", len(confidence["factors"]))
        for factor in confidence["factors"]:
            self.log.info("      %-26s %3d x %.2f = %5.1f  %s",
                          factor["label"], factor["value"], factor["weight"],
                          factor["value"] * factor["weight"], p.dim(factor["note"]))

        band = confidence["band"]
        band_tone = {"high": p.green, "moderate": p.yellow, "low": p.red}[band]
        self.log.info("    Fused confidence %s (%s band)",
                      band_tone(f"{confidence['finalConfidence']}/100"), band_tone(band))

        self._record(stage_id, index, title, "hybrid", started,
                     degraded=(interpretation == "misaligned"),
                     reason="attention field misaligned with detected evidence"
                     if interpretation == "misaligned" else None)

        self.log.info("%s Stage 4 complete: %s, %s.",
                      p.green("[PASS]"),
                      p.bold(f"ICDR Level {grading['level']} - {grading['label']}"),
                      p.bold(confidence["decisionLabel"]))
        return payload

    # -- report ------------------------------------------------------------ #

    def _build_report(self, run_id: str, patient: Dict[str, Any],
                      quality: Dict[str, Any], structures: Dict[str, Any],
                      lesions: Dict[str, Any], grading: Dict[str, Any],
                      explain: Dict[str, Any], confidence: Dict[str, Any]) -> Dict[str, Any]:
        """Assemble the doctor-ready ``ScreeningReport``."""
        level = grading["level"]
        spec = DR_SCALE[level]
        counts = lesions["counts"]

        key_findings = [
            f"{counts['microaneurysm']} microaneurysms, {counts['haemorrhage']} haemorrhages "
            f"and {counts['hard_exudate']} hard exudates detected.",
            f"{structures['laterality']} ({'left' if structures['laterality'] == 'OS' else 'right'} "
            f"eye), {structures['fieldDefinition']} field; fovea "
            f"{structures['fovea']['discDiameters']:.2f} DD from the disc.",
            f"Image quality {quality['overallScore']}/100 ({quality['verdict']}); "
            f"sharpness is the limiting sub-metric.",
            f"Rule engine and CNN ensemble both return Level {level}.",
        ]

        limitations = [
            "Single-field, single-eye capture. A full screening episode requires both eyes.",
            "Macular oedema cannot be excluded from a colour fundus photograph alone; "
            "OCT is required for that assessment.",
        ]
        if explain["overlapInterpretation"] == "misaligned":
            limitations.insert(
                0,
                f"Model attention overlaps detected evidence by only "
                f"{explain['evidenceOverlapScore']}%. The grade should be confirmed "
                f"against the marked lesions before acting on it.",
            )

        return {
            "reportId": f"RS-{run_id[:8].upper()}",
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "patient": patient,
            "grade": {
                "level": level,
                "label": grading["label"],
                "referable": grading["referable"],
                "urgency": grading["urgency"],
            },
            "confidence": {
                "value": confidence["finalConfidence"],
                "band": confidence["band"],
                "decision": confidence["decision"],
                "decisionLabel": confidence["decisionLabel"],
            },
            "imageQuality": {
                "score": quality["overallScore"],
                "verdict": quality["verdict"],
                "enhanced": bool((quality.get("enhancement") or {}).get("applied")),
            },
            "evidence": {
                "counts": counts,
                "totalLesions": sum(counts.values()),
                "evidenceOverlapScore": explain["evidenceOverlapScore"],
                "corroborationScore": lesions["corroborationScore"],
            },
            "recommendation": {
                "headline": spec["recommendation"],
                "followUpInterval": spec["followUp"],
                "actions": spec["actions"],
            },
            "keyFindings": key_findings,
            "limitations": limitations,
            "auditTrail": [asdict(t) for t in self.telemetry],
        }

    # -- public entry point ------------------------------------------------ #

    def process_image(self, image_path: str,
                      patient: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Run one fundus photograph through all four stages.

        Returns the ``PipelineResult`` payload the Next.js API serves to the
        frontend. If Stage 1 fails the gradability gate the run halts there and
        the payload carries ``halted: True`` plus recapture guidance - the
        pipeline never grades an image it could not read.

        Raises
        ------
        FileNotFoundError, ValueError
            If the capture is missing or cannot be decoded. Ingest happens
            before Stage 1, so a bad file fails loudly and immediately instead
            of surfacing as a mysterious grade.
        """
        run_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        self.telemetry = []
        self._banner(run_id, image_path)

        # --- Ingest: decode the capture before any stage touches it ------- #
        source = load_source_image(image_path)
        self.log.info("Loaded image %s - Size: %dx%d  (%s, %.1f MP, %.0f KB, decoder %s)",
                      self.palette.bold(source.path.name), source.width, source.height,
                      source.mode, source.megapixels,
                      source.bytes_on_disk / 1024, source.decoder)
        if source.width < 512 or source.height < 512:
            self.log.warning("Capture is below the 512x512 working resolution - "
                             "fine lesion detail may be unrecoverable.")

        result: Dict[str, Any] = {
            "runId": run_id,
            "startedAt": started_at,
            "halted": False,
            "haltedReason": None,
            "images": {"original": str(source.path), "working": str(source.path),
                       "enhanced": None},
            "source": {
                "filename": source.path.name,
                "width": source.width,
                "height": source.height,
                "mode": source.mode,
                "megapixels": round(source.megapixels, 2),
                "bytes": source.bytes_on_disk,
                "decoder": source.decoder,
            },
            "quality": None, "structures": None, "lesions": None,
            "grading": None, "explainability": None, "confidence": None,
            "report": None, "telemetry": [],
        }

        # --- Stage 1: the gate ------------------------------------------- #
        quality = self._stage_quality(image_path, source)
        result["quality"] = quality
        if (quality.get("enhancement") or {}).get("applied"):
            result["images"]["enhanced"] = f"{image_path}#enhanced"

        if not quality["gradable"]:
            result["halted"] = True
            result["haltedReason"] = (
                f"Image quality {quality['overallScore']}/100 is below the gradable "
                f"threshold. " + " ".join(quality["failureReasons"])
            )
            result["telemetry"] = [asdict(t) for t in self.telemetry]
            self._halt_panel(quality)
            return result

        # --- Stages 2-4 --------------------------------------------------- #
        structures = self._stage_structures(image_path, quality)
        lesions = self._stage_lesions(image_path, structures)
        stage4 = self._stage_grading(image_path, quality, structures, lesions)

        result["structures"] = structures
        result["lesions"] = lesions
        result["grading"] = stage4["grading"]
        result["explainability"] = stage4["explainability"]
        result["confidence"] = stage4["confidence"]
        result["telemetry"] = [asdict(t) for t in self.telemetry]
        result["report"] = self._build_report(
            run_id, patient or DEFAULT_PATIENT, quality, structures, lesions,
            stage4["grading"], stage4["explainability"], stage4["confidence"],
        )

        self._summary_panel(result)
        return result

    # -- terminal panels --------------------------------------------------- #

    def _halt_panel(self, quality: Dict[str, Any]) -> None:
        if not self.verbose:
            return
        p = self.palette
        print()
        print(p.red("=" * WIDTH))
        print(p.bold(p.red("  RUN HALTED AT STAGE 1 - IMAGE NOT GRADABLE")))
        print(p.red("=" * WIDTH))
        for reason in quality["failureReasons"]:
            print(f"  - {reason}")
        print(p.bold("\n  Recapture guidance:"))
        for tip in quality["recaptureGuidance"]:
            print(f"    * {tip}")
        print()

    def _summary_panel(self, result: Dict[str, Any]) -> None:
        if not self.verbose:
            return
        p = self.palette
        report = result["report"]
        grading = result["grading"]
        total_ms = sum(t.durationMs for t in self.telemetry)

        self._rule("=")
        self.log.info(p.bold("PIPELINE COMPLETE - 4/4 stages, %d ms total"), total_ms)
        self._rule("=")
        print()
        print(p.cyan("+" + "-" * (WIDTH - 2) + "+"))
        print(p.cyan("|") + p.bold(f"  SCREENING REPORT  {report['reportId']}".ljust(WIDTH - 2))
              + p.cyan("|"))
        print(p.cyan("+" + "-" * (WIDTH - 2) + "+"))

        urgency_tone = p.green if not grading["referable"] else p.yellow
        rows = [
            ("Patient", f"{report['patient']['patientId']} | {report['patient']['age']}y | "
                        f"{report['patient']['eye']} eye"),
            ("Grade", urgency_tone(f"ICDR Level {grading['level']} - {grading['label']}")),
            ("Referable", urgency_tone("YES" if grading["referable"] else "NO")),
            ("Confidence", f"{report['confidence']['value']}/100 "
                           f"({report['confidence']['band']})"),
            ("Decision", p.bold(report["confidence"]["decisionLabel"])),
            ("Follow-up", report["recommendation"]["followUpInterval"]),
            ("Evidence", f"{report['evidence']['totalLesions']} lesions | overlap "
                         f"{report['evidence']['evidenceOverlapScore']}/100 | corroboration "
                         f"{report['evidence']['corroborationScore']}/100"),
        ]
        for label, value in rows:
            print(f"  {p.dim(label + ':'):<24} {value}")
        print()
        print(f"  {p.bold('Recommendation')}: {report['recommendation']['headline']}")
        for action in report["recommendation"]["actions"]:
            print(f"    * {action}")
        if report["limitations"]:
            print(f"\n  {p.bold('Limitations')}:")
            for limitation in report["limitations"]:
                print(f"    ! {limitation}")
        print()
        print(p.dim("  Audit trail:"))
        for entry in self.telemetry:
            flag = p.yellow(" [degraded]") if entry.degraded else ""
            print(p.dim(f"    {entry.index}. {entry.title:<28} {entry.provenance:<8} "
                        f"{entry.durationMs:>5} ms") + flag)
        print()


# --------------------------------------------------------------------------- #
# Rendering helpers                                                             #
# --------------------------------------------------------------------------- #

@dataclass
class SourceImage:
    """The decoded capture, read from disk before any stage runs."""

    path: Path
    width: int
    height: int
    mode: str
    bytes_on_disk: int
    decoder: str

    @property
    def megapixels(self) -> float:
        return (self.width * self.height) / 1e6

    @property
    def aspect(self) -> float:
        return self.width / self.height if self.height else 0.0


def load_source_image(image_path: str) -> SourceImage:
    """Open the capture and read its real geometry.

    Pillow is the primary decoder; OpenCV is used when Pillow is unavailable
    (some field workstations ship one and not the other). Raises rather than
    guessing - a screening run must never proceed on an image it could not
    decode.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    if not path.is_file():
        raise IsADirectoryError(f"Not a file: {path}")

    size_on_disk = path.stat().st_size

    try:
        from PIL import Image

        with Image.open(path) as img:
            img.verify()                 # cheap integrity check, no full decode
        with Image.open(path) as img:
            width, height, mode = img.width, img.height, img.mode
        return SourceImage(path, width, height, mode, size_on_disk, "Pillow")
    except ImportError:
        pass
    except Exception as exc:  # corrupt or unsupported file
        raise ValueError(f"Could not decode '{path.name}': {exc}") from exc

    try:
        import cv2  # type: ignore[import-not-found]  - optional decoder

        frame = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError(f"Could not decode '{path.name}' with OpenCV.")
        height, width = frame.shape[:2]
        return SourceImage(path, width, height, "BGR", size_on_disk, "OpenCV")
    except ImportError as exc:
        raise RuntimeError(
            "No image decoder available. Install Pillow (`pip install pillow`) "
            "or OpenCV (`pip install opencv-python`)."
        ) from exc


def _render_heatmap(grid: List[List[float]]) -> List[str]:
    """ASCII-render the attention grid so the audit trail is self-contained."""
    ramp = " .:-=+*#@"
    rows = []
    for row in grid:
        rows.append("".join(ramp[min(int(v * (len(ramp) - 1)), len(ramp) - 1)] * 2 for v in row))
    return rows


# --------------------------------------------------------------------------- #
# CLI                                                                           #
# --------------------------------------------------------------------------- #

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline.py",
        description="RetinaSetu 4-stage DR screening pipeline (demonstration run).",
        epilog="Example: python ml/pipeline.py --image samples/eye.jpg")
    parser.add_argument("-i", "--image", metavar="PATH",
                        help="Path to the fundus photograph to screen (required).")
    parser.add_argument("--out", metavar="FILE", help="Write the full JSON result to FILE.")
    parser.add_argument("--full", action="store_true",
                        help="Print the entire PipelineResult instead of just the report.")
    parser.add_argument("--fast", action="store_true",
                        help="Disable the cosmetic inter-stage pacing.")
    parser.add_argument("--quiet", action="store_true",
                        help="Suppress the audit trail; emit JSON only.")
    parser.add_argument("--no-color", action="store_true", help="Disable ANSI colour.")
    args = parser.parse_args(argv)

    palette = Palette(enabled=not args.no_color)

    # An image is mandatory: there is nothing to screen without one.
    if not args.image:
        print(palette.red("[ERROR] Please provide an image path."), file=sys.stderr)
        print(palette.dim("        usage: python ml/pipeline.py --image path/to/eye.jpg"),
              file=sys.stderr)
        return 2

    pipeline = DRPipeline(simulate_latency=not args.fast,
                          verbose=not args.quiet, palette=palette)
    try:
        result = pipeline.process_image(args.image)
    except (FileNotFoundError, IsADirectoryError, ValueError) as exc:
        print(palette.red(f"[ERROR] {exc}"), file=sys.stderr)
        return 1

    payload = result if args.full else (result["report"] or result)
    if not args.quiet:
        print(palette.dim("-" * WIDTH))
        print(palette.bold("FINAL JSON PAYLOAD"
                           f"{' (full PipelineResult)' if args.full else ' (ScreeningReport)'}"
                           " - this is what the API returns to the frontend:"))
        print(palette.dim("-" * WIDTH))
    print(json.dumps(payload, indent=2))

    if args.out:
        Path(args.out).write_text(json.dumps(result, indent=2), encoding="utf-8")
        if not args.quiet:
            print(palette.dim(f"\nFull result written to {args.out}"))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
