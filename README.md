# RetinaSetu

**A rural diabetic retinopathy screening platform.** *Setu* (सेतु) means *bridge* — between
the Primary Health Centre that can take a fundus photograph and the ophthalmologist who is
four hours away.

Upload a retinal photograph and a seven-stage clinical pipeline runs on it: it checks the
image is usable, locates the anatomy, finds and counts lesions, grades severity on the ICDR
scale, shows the evidence behind the grade, decides whether it is confident enough to stand
without a doctor, and produces a report a district ophthalmologist can act on.

> Prototype for Smart India Hackathon. **Not a medical device.** Not clinically validated.
> Decision support for a trained screener — never a diagnosis.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional — see "Engines" below
npm run samples                # generate the synthetic test phantoms
npm run dev                    # http://localhost:3000
```

The platform runs fully without an API key. See **Engines**.

| Route | What it is |
|---|---|
| `/` | Landing page — the problem, the pipeline, the safety model |
| `/screening` | The clinical workspace: upload, watch all seven stages, read the report |
| `/district` | Operational model of a district programme: demand, capacity, queue, impact |
| `/methodology` | Every measurement, threshold and fusion rule, written down |

---

## The pipeline

```
fundus image
     │
     ▼
 ① Image quality ──── ungradeable ──▶ halt · explain · recapture guidance
     │ good / borderline (enhance, re-score)
     ▼
 ② Retinal structures      optic disc · fovea · arcades · laterality
     ▼
 ③ Lesion detection        MA · haemorrhage · exudate · CWS · IRMA · beading · NV
     ▼
 ④ Severity grading        ICDR 0–4, rule engine ⊕ vision model, full distribution
     ▼
 ⑤ Explainability          attention field · evidence map · overlap score
     ▼
 ⑥ Confidence & HITL       5-signal fusion, then hard safety rules that outrank it
     ▼
 ⑦ Doctor-ready report     grade · evidence · recommendation · audit trail
```

Every stage is an isolated module with a typed input and a typed structured output. The UI
never knows whether a stage was computed by classical computer vision, a rule engine, or a
model — which is what makes any single stage replaceable by a purpose-trained retinal model
without touching anything else.

The whole run streams to the browser over SSE, stage by stage, so the reasoning arrives in
the order it was produced rather than appearing as a finished verdict.

---

## Engines

Two interchangeable backings for the reasoning stages:

| Engine | When it is used | What it does |
|---|---|---|
| `mistral` | `MISTRAL_API_KEY` is set | Vision-language model reads the image for artefacts, anatomy, lesions and the grade |
| `deterministic` | no key, or `RETINASETU_ENGINE=deterministic` | Stages run on the classical vision measurements alone |

The deterministic engine is not a demo stub. It is the degradation path a real PHC needs when
the district uplink is down, and it is what keeps the product honest: if a model call fails
mid-run, **that stage alone** degrades, the audit trail records it, and the report lists it as
a limitation. Nothing silently pretends to be model-backed when it is not.

Measurement is always classical, in both engines. Sharpness, illumination, contrast, disc and
fovea localisation, vessel density and blob candidates are computed from pixels — the model is
asked to interpret numbers, not to invent them.

---

## What is actually computed

Not decorative — these are real measurements, and the interface shows the raw value beside
every score so a clinician can audit it.

- **Sharpness** — variance of the 4-neighbour Laplacian on the green channel, inside the
  detected retinal field only.
- **Illumination uniformity** — coefficient of variation across an 8×8 grid of block means.
- **Optic disc** — peak of a blurred red+green brightness field, with confidence as its
  standard-deviation distance above the retinal background.
- **Fovea** — darkest point in an annulus 1.7–3.6 disc diameters from the disc, with a
  vertical-displacement penalty encoding the anatomical prior.
- **Lesion candidates** — background-subtracted blob detection with vessel, shape, colour and
  disc-proximity rejection, cross-checked against the model's findings both ways.
- **Evidence overlap** — attention mass weighted by proximity to independently located
  findings, using a Gaussian kernel about one disc diameter wide.
- **District queue** — M/M/1 delay below capacity, explicit month-by-month backlog above it.

---

## Safety model

The design assumption is that the system will sometimes be wrong, so every mechanism exists to
make that visible and survivable.

- **Two independent graders.** A transparent ICDR rule engine and a vision model grade
  separately. They are fused for display, but referral is triggered if *either* reaches the
  referable threshold — averaging must never be able to hide sight-threatening findings.
- **Safety rules outrank the confidence score.** Suspected proliferative disease, a two-level
  grader disagreement, misaligned evidence, incomplete anatomy or low corroboration each force
  human review no matter how high the number is.
- **The quality gate can stop everything.** Grading an ungradeable photograph would produce a
  confident-looking result with nothing behind it — the most dangerous failure mode a
  screening tool has.
- **Colour never carries meaning alone.** Five points on a green→red severity ramp are
  indistinguishable under red-green colour vision deficiency (measured: Level 0 vs Level 1
  separate by ΔE 3.2 under protanopia). So severity is carried by position, numeral and
  clinical name; status colour is a four-role accent that always ships with an icon and a
  label; and every lesion class has its own marker *shape* as well as its own hue.

---

## Project layout

```
app/
  page.tsx                  landing
  (product)/                clinical shell — screening, district, methodology
  api/screening/route.ts    SSE endpoint for a screening run
lib/
  pipeline/
    types.ts                canonical contracts for all seven stages
    constants.ts            ICDR scale, lesion taxonomy, thresholds
    orchestrator.ts         sequencing, timing, streaming, halt logic
    stages/                 one module per stage
  vision/                   raster primitives, quality, anatomy, lesions, enhancement
  mistral/                  client, prompts, output schemas
  simulation/district.ts    district operational model
components/                 landing, shell, screening, district, ui primitives
scripts/
  generate-samples.mjs      synthetic fundus phantoms
  smoke-pipeline.mjs        end-to-end pipeline assertions
  check-tasks.mjs           task-board helper
```

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run samples    # regenerate the synthetic phantoms in public/samples
npm run smoke      # end-to-end pipeline assertions against a running server
npm run lint
```

`task.md` is the build's task board and the source of truth for progress.

---

## Demo data

There is no fundus camera attached to this build. Upload any posterior-pole retinal
photograph — APTOS, IDRiD and Messidor-style images all work. Four **synthetic phantoms** ship
in `public/samples` for exercising specific paths (clean retina, lesion burden, proliferative
disease, and an unusable capture that trips the quality gate). They are rendered test images,
not photographs of real people, and the interface says so wherever they appear.

Uploaded images are processed for the duration of a run and are not retained.
