# RetinaSetu — Rural Diabetic Retinopathy Screening Platform
### SIH Build Task Board

> **Single source of truth for project progress.** Every phase below is worked through in
> order. Check items off as they are completed. New work discovered during the build gets
> added here rather than done invisibly.

---

## 0. Product Definition (locked)

**Name:** RetinaSetu — *setu* (सेतु) = bridge. A bridge between rural PHCs and scarce ophthalmologists.

**One line:** An explainable, staged clinical decision-support pipeline that turns a fundus
photograph captured at a rural Primary Health Centre into a doctor-ready diabetic retinopathy
assessment — and knows when to hand the case to a human.

**Non-negotiables**
- Seven visible pipeline stages, each with its own structured output.
- Never a black box: every grade is backed by counted, located, visual evidence.
- Never overconfident: uncertainty and poor image quality route to Doctor Review.
- Clinical product design, not "AI tool" design.

**Architectural rule:** every stage is an isolated module with a typed input and a typed
structured output, behind a pluggable *engine* interface. Mistral is today's engine for the
reasoning stages; a trained model can replace any single stage later without the rest of the
system or the UI changing.

---

## Phase 0 — Foundations & Scaffold

- [x] 0.1 Decide stack (Next.js App Router + TypeScript + Tailwind) and record rationale
- [x] 0.2 Scaffold Next.js project, TypeScript strict, Tailwind
- [x] 0.3 Install dependencies (zod, sharp, mistral client, lucide-react)
- [x] 0.4 Project folder architecture (`app/`, `lib/pipeline/`, `lib/mistral/`, `lib/vision/`, `lib/simulation/`, `components/`)
- [x] 0.5 Design system: colour tokens, typography scale, spacing, elevation, clinical theme
- [x] 0.6 `.env.example`, config loader, engine-selection logic (Mistral vs. deterministic fallback)
- [x] 0.7 `README.md` with setup + architecture summary

---

## Phase 1 — Domain Model & Pipeline Contracts

- [x] 1.1 `lib/pipeline/types.ts` — canonical types for all 7 stage outputs
- [x] 1.2 Zod schemas for every stage output (validation + repair of model JSON)
- [x] 1.3 DR severity scale constants (Level 0–4, clinical names, referable threshold >= 2)
- [x] 1.4 Lesion taxonomy (MA, haemorrhage, hard/soft exudate, neovascularisation, IRMA, venous beading)
- [x] 1.5 `StageEngine` interface — one contract, two implementations (Mistral / deterministic)
- [x] 1.6 Pipeline orchestrator with per-stage timing, status, and early exit on ungradeable image

---

## Phase 2 — Stage 1: Image Quality Assessment

- [x] 2.1 Real server-side CV metrics: sharpness (Laplacian variance), brightness, contrast (RMS), illumination uniformity, field coverage, colour saturation
- [x] 2.2 Normalise raw metrics to 0–100 sub-scores with documented thresholds
- [x] 2.3 Composite quality score + verdict (`good` / `borderline` / `ungradeable`)
- [x] 2.4 Failure-reason generation ("out of focus — sharpness 18/100", "under-exposed nasal field")
- [x] 2.5 Ungradeable path: reject, explain, recapture guidance, "Simulate Recapture" action
- [x] 2.6 Borderline path: enhancement (CLAHE-style contrast + illumination flattening + denoise)
- [x] 2.7 Re-score after enhancement, before/after comparison with metric deltas
- [x] 2.8 UI: quality gauge, per-metric bars, verdict banner, before/after slider

---

## Phase 3 — Stage 2: Retinal Structure Analysis

- [x] 3.1 Optic disc localisation (brightest-region analysis) → centre + radius + confidence
- [x] 3.2 Fovea/macula estimation (darkest macular region ~2.5 disc diameters temporal)
- [x] 3.3 Vessel map extraction (green-channel morphology) → vessel density, arcade continuity
- [x] 3.4 Laterality inference (OD / OS) from disc-to-fovea geometry
- [x] 3.5 Mistral structural read to corroborate CV output; agreement flag
- [x] 3.6 UI: labelled anatomical overlay (disc, fovea, arcades, macular zone), toggleable

---

## Phase 4 — Stage 3: Lesion Detection

- [x] 4.1 CV candidate detection: dark-red blob candidates (MA/haemorrhage), bright blob candidates (exudates)
- [x] 4.2 Mistral vision pass → structured lesion findings with normalised coordinates, size, confidence, quadrant
- [x] 4.3 Cross-corroboration score between CV candidates and model findings
- [x] 4.4 Per-class counts, density per disc area, quadrant distribution (4-2-1 rule inputs)
- [x] 4.5 Neovascularisation suspicion flag with rationale
- [x] 4.6 UI: lesion overlay with per-class colour coding, per-class toggle, count chips, findings table

---

## Phase 5 — Stage 4: DR Severity Grading

- [x] 5.1 Rule-based ICDR grader driven by lesion counts/distribution (transparent, auditable)
- [x] 5.2 Mistral clinical grading pass → level + 5-way probability distribution + rationale
- [x] 5.3 Fusion of rule-based and model grade; disagreement surfaced, never hidden
- [x] 5.4 Referable DR determination (>= Level 2) + urgency banding
- [x] 5.5 Distribution margin / entropy computation for downstream confidence
- [x] 5.6 UI: grade card, 5-level probability bars, referable flag, rule-vs-model comparison panel

---

## Phase 6 — Stage 5: Explainability

- [x] 6.1 Model attention grid (normalised saliency grid) from the grading stage
- [x] 6.2 Render attention as a smooth heatmap canvas overlay with opacity control
- [x] 6.3 Lesion evidence map (all detected lesions plotted as evidence points)
- [x] 6.4 **Evidence Overlap Score** — fraction of attention mass falling inside detected lesion regions
- [x] 6.5 Interpretation of the overlap score (aligned / partially aligned / misaligned → trust signal)
- [x] 6.6 Per-finding "why this matters" clinical notes
- [x] 6.7 UI: side-by-side original / heatmap / evidence map, layer toggles, overlap meter

---

## Phase 7 — Stage 6: Confidence & Human-in-the-Loop

- [x] 7.1 Confidence fusion: model confidence x quality score x distribution margin x CV corroboration x evidence overlap
- [x] 7.2 Triage decision matrix → `ai_recommendation` / `doctor_review_required` / `urgent_referral`
- [x] 7.3 Explicit list of the reasons that triggered a doctor review
- [x] 7.4 Safety rules that always force human review (ungradeable, NV suspicion, grade/rule disagreement, low overlap)
- [x] 7.5 UI: confidence breakdown with each contributing factor, prominent triage verdict treatment

---

## Phase 8 — Stage 7: Doctor-Ready Report

- [x] 8.1 Report data assembly from all stage outputs
- [x] 8.2 Patient/encounter metadata capture in the upload step (ID, age, sex, diabetes duration, PHC, operator)
- [x] 8.3 Report layout: header, verdict, grade, referable status, confidence, quality, evidence counts, visual evidence, recommendation, audit trail
- [x] 8.4 Clinical recommendation + follow-up interval per grade
- [x] 8.5 Print stylesheet (clean A4 output) + save/export
- [x] 8.6 Signature/disclaimer block — decision support, not a diagnosis

---

## Phase 9 — District-Scale Simulation

- [x] 9.1 Simulation model: PHCs, patients/year, screening uptake, throughput, AI auto-clear rate, referral rate, ophthalmologist count, minutes per read
- [x] 9.2 Queueing math (arrival rate vs. service capacity, utilisation, backlog growth, wait time)
- [x] 9.3 Counterfactual: manual-only screening vs. AI-triaged screening
- [x] 9.4 Derived impact metrics: doctor-hours saved, cases screened, sight preserved estimate
- [x] 9.5 Interactive parameter controls with live recompute
- [x] 9.6 Charts: backlog over time, capacity vs. demand, wait-time curve, workload split
- [x] 9.7 Scenario presets (small district / large district / understaffed / target state)

---

## Phase 10 — Mistral Integration

- [x] 10.1 Mistral client wrapper (retry, timeout, JSON mode, error surfacing)
- [x] 10.2 Prompt engineering per stage — clinically framed, strictly structured output contracts
- [x] 10.3 Output validation + auto-repair; never render unvalidated model text
- [x] 10.4 Graceful degradation to the deterministic engine when the API is unavailable
- [ ] 10.5 **Ask user for the Mistral API key** and wire it into `.env.local`
- [ ] 10.6 End-to-end verification against real fundus images
- [x] 10.7 Engine-provenance labelling in the UI (which stage was model-driven vs. CV-driven)

---

## Phase 11 — Application Shell & Streaming UX

- [x] 11.1 SSE endpoint streaming stage-by-stage events so the demo unfolds live
- [x] 11.2 Pipeline runner state machine on the client
- [x] 11.3 Stage rail / stepper showing pending → running → complete, with per-stage timing
- [x] 11.4 Dashboard shell: sidebar nav, top bar, page frame
- [x] 11.5 Screening workspace layout (image canvas + stage detail panel)
- [x] 11.6 Error, empty, and loading states throughout

---

## Phase 12 — Landing Page

- [x] 12.1 Hero: problem framing + product promise
- [x] 12.2 The problem section (scale of DR blindness, ophthalmologist scarcity)
- [x] 12.3 How it works — the 7-stage pipeline visualised
- [x] 12.4 Trust/safety section (human-in-the-loop, explainability, honest uncertainty)
- [x] 12.5 District-scale impact teaser
- [x] 12.6 Footer + call to action into the screening workspace

---

## Phase 13 — Design Pass & Polish

- [x] 13.1 Typography, spacing, and colour audit across every view
- [x] 13.2 Motion pass (stage transitions, reveal animations) — purposeful, not decorative
- [x] 13.3 Responsive behaviour (demo laptop + projector resolutions)
- [x] 13.4 Accessibility: contrast, focus states, keyboard navigation, ARIA on custom controls
- [x] 13.5 Demo hardening: bundled sample images, deterministic fallback, no dead ends
- [x] 13.6 Final build check + lint clean

---

## Discovered Tasks (added during the build)

### Defects found by the end-to-end smoke test — all fixed

- [x] D1 **Vessel guard was swallowing lesions.** The vessel extractor keys on "locally darker
      than background", which is exactly what a microaneurysm is — so red lesions landed in the
      vessel mask and were then excluded as vasculature. Zero dark candidates were being found on
      images containing 30 of them. Fixed by stripping compact, small components out of the mask
      before using it as a guard: vessels are elongated and sparsely fill their bounding box,
      lesions are round and dense.
- [x] D2 **An out-of-focus image could enhance its way past the quality gate.** The enhancement
      pass applies an unsharp mask, which raises measured Laplacian variance by amplifying noise
      without adding any diagnostic information — so a defocused capture scoring 0/100 for
      sharpness came out the other side scoring 100/100 and was graded. Sharpening cannot restore
      optical resolution. Fixed by always carrying the sharpness sub-score from the original
      capture: enhancement may fix lighting, contrast and exposure, never focus.
- [x] D3 **The rule engine ranked Level 1 above Level 0 on a clean retina.** The soft distribution
      spilled probability to both neighbours, and at the ends of the scale the single neighbour was
      credited twice — so a retina with zero findings graded Mild NPDR. Fixed the spill, and made
      decisiveness level-aware: zero findings is a decisive negative, not an uncertain one.
- [x] D4 **Evidence overlap was being used as a trust signal when it was not independent.** With no
      model attention, the field was image-derived and so was the lesion list; the score was
      therefore near-meaningless, always read "misaligned", and force-routed every offline run to a
      doctor. Fixed by tracking `attentionSource`/`overlapAssessed`, scoring the factor neutrally
      when it is not an independent check, and suppressing the corresponding safety rule.
- [x] D5 **Deterministic saliency was a picture of the vascular tree.** Vasculature is the strongest
      departure from a smooth background in any fundus image, so it dominated the energy map. Now
      suppressed, and the grid is smoothed into coherent regions.

### Additional work

- [x] A1 Synthetic fundus phantom generator (`scripts/generate-samples.mjs`) — four rendered test
      images exercising the clean, moderate, proliferative and ungradeable paths, so the demo never
      dead-ends and each path can be triggered deliberately. Clearly labelled as synthetic in the UI.
- [x] A2 End-to-end smoke test (`scripts/smoke-pipeline.mjs`) asserting the properties that have to
      hold for the product to be safe — not just HTTP 200.
- [x] A3 Metric diagnostic tool (`scripts/inspect-metrics.mjs`) to trace a surprising quality score
      back to the pixels.
- [x] A4 **Colour-vision safety redesign of the severity encoding.** A five-hue green→red ramp was
      the obvious choice and is wrong: measured against the panel surface, "No DR" and "Mild NPDR"
      separate by ΔE 3.2 under protanopia, so ~8% of male clinicians could not tell them apart. In a
      screening tool that is a patient-safety defect. Severity now rides on position, level numeral
      and clinical name; magnitude rides on bar length in one validated hue; status colour is a
      four-role accent always paired with an icon and a label. Every lesion class additionally has
      its own marker *shape*, so the overlay survives greyscale printing.
- [x] A5 SSE event-queue bridge so stage progress reaches the client while a stage is still running,
      rather than being buffered until it completes.
- [x] A6 `scripts/check-tasks.mjs` task-board helper.

### Open

- [ ] O1 Wire the Mistral API key into `.env.local` (blocked — waiting on the key from the user).
- [ ] O2 Verify the model-backed path end to end against real APTOS/IDRiD/Messidor fundus images,
      and tune the stage prompts against what comes back.
