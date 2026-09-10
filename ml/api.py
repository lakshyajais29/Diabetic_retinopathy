"""
RetinaSetu | Inference service
==============================

FastAPI wrapper around :class:`pipeline.DRPipeline`. This is the process the
Next.js frontend talks to: it accepts a fundus photograph as a multipart
upload, runs the four-stage screening pipeline over it, and returns the
``PipelineResult`` payload defined in ``lib/pipeline/types.ts``.

Endpoints
---------
    GET  /health                    liveness + model residency
    GET  /v1/models                 provenance card for each stage model
    POST /v1/screening/analyze      screen one uploaded fundus photograph

Design notes
------------
* **The models are loaded once, at startup.** Four backbones cost real seconds
  to instantiate; doing that per request would put that cost on every clinician
  who uploads an image. The lifespan handler warms them before the first
  request is accepted, and ``/health`` reports when they are resident.
* **The pipeline call is blocking**, so it runs in a worker thread via
  ``run_in_threadpool``. Without that, one screening run would stall the event
  loop and block every other connection - including the health check.
* **Uploads are streamed to a temp file and deleted in a ``finally``.** Patient
  retinal images are never left on disk after the response is written.
* **A halted run is a 200, not an error.** An ungradeable image is a valid
  clinical outcome with recapture guidance attached, and the frontend renders
  it as such; only genuine failures raise.

Run it::

    pip install fastapi uvicorn[standard] python-multipart pillow
    python ml/api.py                       # or: uvicorn ml.api:app --reload --port 8000

Then point the frontend at it::

    RETINASETU_INFERENCE_URL=http://127.0.0.1:8000
"""

from __future__ import annotations

import logging
import os
import shutil
import sys
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from models import DEMO_MODE  # noqa: E402  - local module, path set above
from pipeline import DEFAULT_PATIENT, DRPipeline, Palette  # noqa: E402

LOGGER = logging.getLogger("retinasetu.api")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)

# --------------------------------------------------------------------------- #
# Configuration                                                                 #
# --------------------------------------------------------------------------- #

#: Origins the Next.js dev server and preview builds are served from. Override
#: with a comma-separated RETINASETU_CORS_ORIGINS in any real deployment.
DEFAULT_ORIGINS = [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:3001", "http://127.0.0.1:3001",
]
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in os.environ.get("RETINASETU_CORS_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",")
    if origin.strip()
]

#: Fundus captures are large; 25 MB comfortably covers a 45-degree TIFF.
MAX_UPLOAD_BYTES = int(os.environ.get("RETINASETU_MAX_UPLOAD_MB", "25")) * 1024 * 1024
ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}

#: Shared pipeline instance, warmed during startup.
PIPELINE: Optional[DRPipeline] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm the four stage models before the first request is served."""
    global PIPELINE
    started = time.perf_counter()
    LOGGER.info("Warming RetinaSetu stage models...")
    PIPELINE = DRPipeline(
        device=os.environ.get("RETINASETU_DEVICE", "cpu"),
        simulate_latency=False,        # no cosmetic pacing behind an HTTP call
        verbose=False,                 # the payload is the output; keep logs clean
        palette=Palette(enabled=False),
    )
    LOGGER.info("4 stage models resident in %.2fs (inference mode: %s)",
                time.perf_counter() - started, "FIXTURE" if DEMO_MODE else "LIVE")
    yield
    PIPELINE = None
    LOGGER.info("Stage models released.")


app = FastAPI(
    title="RetinaSetu Inference Service",
    description="4-stage diabetic retinopathy screening pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Helpers                                                                       #
# --------------------------------------------------------------------------- #

def _require_pipeline() -> DRPipeline:
    if PIPELINE is None:
        raise HTTPException(status_code=503, detail="Stage models are not resident yet.")
    return PIPELINE


def _validate_upload(upload: UploadFile) -> str:
    """Check the filename and content type, returning the suffix to persist."""
    if not upload.filename:
        raise HTTPException(status_code=400, detail="No filename on the uploaded part.")
    suffix = Path(upload.filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type '{suffix or upload.filename}'. "
                   f"Accepted: {', '.join(sorted(ALLOWED_SUFFIXES))}.",
        )
    if upload.content_type and not upload.content_type.startswith("image/"):
        raise HTTPException(status_code=415,
                            detail=f"Expected an image, received '{upload.content_type}'.")
    return suffix


async def _persist_upload(upload: UploadFile, suffix: str) -> Path:
    """Stream the upload to a temp file, enforcing the size ceiling as we go."""
    handle, temp_name = tempfile.mkstemp(prefix="retinasetu-", suffix=suffix)
    temp_path = Path(temp_name)
    written = 0
    try:
        with os.fdopen(handle, "wb") as sink:
            while chunk := await upload.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Image exceeds the "
                               f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
                    )
                sink.write(chunk)
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise
    if written == 0:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    return temp_path


def _patient_context(**fields: Optional[str]) -> Dict[str, Any]:
    """Merge submitted patient fields over the demo defaults."""
    patient = dict(DEFAULT_PATIENT)
    patient.update({k: v for k, v in fields.items() if v not in (None, "")})
    return patient


async def _run_screening(upload: UploadFile,
                         patient: Dict[str, Any]) -> Dict[str, Any]:
    """Persist, screen, clean up. The shared body behind both POST routes.

    Kept separate from the route functions so one endpoint can reuse another
    without FastAPI's parameter defaults (``File``/``Form`` markers) leaking
    through as values.
    """
    pipeline = _require_pipeline()
    suffix = _validate_upload(upload)
    temp_path = await _persist_upload(upload, suffix)

    started = time.perf_counter()
    try:
        # The pipeline is CPU-bound and synchronous - keep it off the event loop.
        result = await run_in_threadpool(pipeline.process_image, str(temp_path), patient)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=422,
                            detail=f"Could not decode the image: {exc}") from exc
    except Exception as exc:  # noqa: BLE001 - never leak a stack trace to the client
        LOGGER.exception("Screening run failed for %s", upload.filename)
        raise HTTPException(status_code=500, detail="Screening run failed.") from exc
    finally:
        # Patient images do not outlive the request.
        temp_path.unlink(missing_ok=True)
        await upload.close()

    elapsed_ms = int((time.perf_counter() - started) * 1000)

    # The client uploaded a file; report its original name, not our temp path.
    result["images"]["original"] = upload.filename
    result["images"]["working"] = upload.filename
    if result.get("source"):
        result["source"]["filename"] = upload.filename
    result["timing"] = {"totalMs": elapsed_ms}

    if result["halted"]:
        LOGGER.info("%s -> HALTED at Stage 1 (%d ms)", upload.filename, elapsed_ms)
    else:
        grading = result["grading"]
        LOGGER.info("%s -> Level %d %s, confidence %d/100 (%d ms)",
                    upload.filename, grading["level"], grading["label"],
                    result["confidence"]["finalConfidence"], elapsed_ms)
    return result


# --------------------------------------------------------------------------- #
# Routes                                                                        #
# --------------------------------------------------------------------------- #

@app.get("/health")
async def health() -> Dict[str, Any]:
    """Liveness probe - also reports whether the models are resident."""
    return {
        "status": "ok" if PIPELINE is not None else "warming",
        "modelsResident": PIPELINE is not None,
        "inferenceMode": "fixture" if DEMO_MODE else "live",
        "stages": 4,
        "version": app.version,
    }


@app.get("/v1/models")
async def model_cards() -> Dict[str, Any]:
    """Provenance card for each stage model: id, corpus, parameter count."""
    pipeline = _require_pipeline()
    return {
        "inferenceMode": "fixture" if DEMO_MODE else "live",
        "models": [pipeline.models[stage_id].describe()
                   for stage_id, _, _, _ in pipeline.STAGES],
    }


@app.post("/v1/screening/analyze")
async def analyze(
    file: UploadFile = File(..., description="Fundus photograph to screen."),
    patientId: Optional[str] = Form(None),
    age: Optional[str] = Form(None),
    sex: Optional[str] = Form(None),
    eye: Optional[str] = Form(None),
    diabetesDurationYears: Optional[str] = Form(None),
    phc: Optional[str] = Form(None),
    operator: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
) -> JSONResponse:
    """Screen one fundus photograph through all four stages.

    Returns the full ``PipelineResult``: quality, structures, lesions, grading,
    explainability, confidence, the doctor-ready report and the stage telemetry
    the frontend renders as an audit trail.

    A run halted at the Stage-1 gradability gate still returns 200 with
    ``halted: true`` and recapture guidance - that is a clinical outcome, not a
    server error.
    """
    patient = _patient_context(
        patientId=patientId, age=age, sex=sex, eye=eye,
        diabetesDurationYears=diabetesDurationYears, phc=phc,
        operator=operator, notes=notes,
    )
    result = await _run_screening(file, patient)
    return JSONResponse(content=result)


@app.post("/v1/screening/report")
async def analyze_report_only(file: UploadFile = File(...)) -> JSONResponse:
    """Same run, trimmed to the ``ScreeningReport`` block.

    Convenience endpoint for the print/PDF view, which needs the report and none
    of the per-lesion geometry.
    """
    result = await _run_screening(file, dict(DEFAULT_PATIENT))
    return JSONResponse(content=result.get("report") or result)


# --------------------------------------------------------------------------- #
# Entrypoint                                                                    #
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("RETINASETU_HOST", "127.0.0.1")
    port = int(os.environ.get("RETINASETU_PORT", "8000"))
    LOGGER.info("Serving RetinaSetu inference API on http://%s:%d", host, port)
    LOGGER.info("CORS origins: %s", ", ".join(CORS_ORIGINS))
    uvicorn.run("api:app", host=host, port=port, reload=False, log_level="info")
