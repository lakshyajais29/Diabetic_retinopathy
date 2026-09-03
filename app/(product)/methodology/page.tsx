import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import {
  CONFIDENCE_THRESHOLDS,
  DR_LEVELS,
  DR_SCALE,
  LESION_CLASSES,
  LESION_TAXONOMY,
  QUALITY_THRESHOLDS,
  STAGES,
} from '@/lib/pipeline/constants';
import { Panel, PanelHeader, SectionLabel } from '@/components/ui/primitives';

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How each stage of the RetinaSetu pipeline decides: measurements, thresholds, fusion rules and stated limitations.',
};

const METHODS: Array<{ id: string; heading: string; body: string[]; detail?: string[] }> = [
  {
    id: 'quality',
    heading: 'Stage 1 — Image quality assessment',
    body: [
      'Six statistics are measured on the decoded image, inside the detected retinal field of view only — including the camera’s black surround would make every photograph look under-exposed.',
      'Sharpness is the variance of the 4-neighbour Laplacian on the green channel, log-scaled between 12 (a microaneurysm cannot be resolved at all) and 350 (further sharpness buys nothing diagnostically). Contrast is RMS luminance. Illumination uniformity is the coefficient of variation across an 8×8 grid of block means, which is what catches vignetting and single-sided flash. Exposure combines mean luminance with a clipping penalty. Field coverage checks the retinal circle is present and not cut off. Colour fidelity checks the image has not been desaturated to the point where red and bright lesions cannot be told apart by hue.',
      'The six sub-scores are combined with fixed weights — sharpness 0.30, contrast 0.18, illumination 0.16, exposure 0.16, field coverage 0.12, colour 0.08 — because a blurred photograph hides the earliest sign of the disease.',
    ],
    detail: [
      `Composite below ${QUALITY_THRESHOLDS.ungradeableBelow} → ungradeable; the pipeline halts.`,
      `Composite below ${QUALITY_THRESHOLDS.borderlineBelow} → borderline; grading proceeds, and the reduced quality is carried into the confidence calculation.`,
      `Any single sub-score below ${QUALITY_THRESHOLDS.criticalMetricFloor} forces at least a borderline verdict — a catastrophic single metric is not allowed to be averaged away by five good ones.`,
      'Sub-optimal images get one enhancement attempt (illumination flattening, percentile contrast stretch, median denoise, unsharp mask). It is accepted only if it measurably raises the composite score.',
      'The vision model may only make the verdict stricter, never more permissive.',
    ],
  },
  {
    id: 'structures',
    heading: 'Stage 2 — Retinal structure analysis',
    body: [
      'The optic disc and fovea are located with classical image analysis rather than a model, because their appearance is highly stereotyped and because every downstream measurement — lesion quadrant, distance from the macula, lesion density per disc area — needs a stable and reproducible frame of reference.',
      'The disc is found as the strongest peak in a blurred red+green brightness field, restricted to well inside the retinal mask so the bright rim cannot win. Confidence is the peak’s standard-deviation distance above the retinal background. The fovea is the darkest point in an annulus 1.7–3.6 disc diameters from the disc, with a penalty for vertical displacement, encoding the anatomical prior that the macula sits near the horizontal meridian.',
      'Laterality is inferred from disc-to-fovea geometry: the disc lies nasal to the fovea, so in a non-mirrored fundus photograph a disc to the right of the macula indicates a right eye. The rule is printed in the interface so a clinician can audit it rather than trust it.',
    ],
    detail: [
      'The model is asked to locate the disc independently. Agreement within roughly one disc diameter is a match.',
      'Disagreement beyond that marks the anatomy as incomplete, which reduces confidence and triggers human review — it is not silently averaged.',
      'Vessel tortuosity and calibre variation are reported as explicitly-labelled morphological proxies, not as validated clinical measurements.',
    ],
  },
  {
    id: 'lesions',
    heading: 'Stage 3 — Lesion detection',
    body: [
      'Two independent methods run on every image. A classical blob detector finds dark-red and bright candidates by subtracting a smoothed background from the green channel, rejecting anything elongated (vessel crossings), anything that is not red-dominant for red lesions, and anything within 1.6 disc radii of the optic disc for bright lesions — otherwise every image would report a large exudate at the disc.',
      'The vision model separately reports each lesion it can see, with a class, a normalised position, a radius, and a confidence. It is given the candidate counts as a prior on how much there is to find, and explicitly told the candidates are unfiltered.',
      'The two are then cross-checked. A finding within 3.5% of image width of an independent candidate is marked corroborated and drawn with a solid marker; a model-only finding is drawn dashed. Two independent methods agreeing is evidence. One method asserting alone is not.',
    ],
    detail: [
      'Corroboration is scored two-sidedly: 65% on the share of model findings backed by a candidate, 35% on the share of strong candidates the model accounted for.',
      'A model that plots lesions nothing else can see scores badly — and so does one that ignores strong objective candidates.',
      'Quadrant counts, red-lesion density per disc area, and the 4-2-1 inputs are all derived from the located findings, not asserted.',
    ],
  },
  {
    id: 'grading',
    heading: 'Stage 4 — DR severity grading',
    body: [
      'Two graders, kept separate. A transparent rule engine applies the published ICDR criteria literally to the lesion counts — no weights, no embeddings, an auditable path from counts to grade. The vision model grades the image directly and returns a probability distribution over all five levels.',
      'The two are fused 60/40 in the model’s favour, because it sees the image while the rule engine only sees counts — but the rule engine retains enough weight to pull back an ungrounded model grade.',
      'Referral is deliberately wider than the fused grade: a patient is flagged referable if the fused grade, the rule engine, OR the model reaches Level 2. Averaging must never be able to hide sight-threatening findings, so where the two methods disagree the system errs toward referral and says so.',
    ],
    detail: [
      'Any disagreement of two or more ICDR levels forces human review at stage 6.',
      'If either grader reaches Level 4, urgency is escalated regardless of the fused result.',
      'Decision margin (top level minus runner-up) and normalised entropy are both computed and carried forward as confidence inputs.',
    ],
  },
  {
    id: 'explainability',
    heading: 'Stage 5 — Explainability',
    body: [
      'Deliberately deterministic. Explanation generated by the same model being explained is narration, not explanation — so nothing here is written by the model.',
      'The attention field comes from the grading stage: the regions the model reported as driving its decision, rasterised to a 16×16 grid. When no model attention is available, the field is the image-derived lesion-response energy map instead, and the interface says which one is being shown.',
      'The evidence overlap score measures how far the attention sits from independently located findings, weighted by attention mass with a Gaussian kernel about one disc diameter wide. Proximity is the fair question — attention is coarse and lesions are small, so strict pixel coincidence would penalise a correct read.',
    ],
    detail: [
      'Above 70 — aligned: the grade is supported by locatable evidence.',
      '45 to 70 — partial: supported, but a meaningful share of the signal is unaccounted for.',
      'Below 45 — misaligned: the grade was driven by regions containing no detected evidence. This forces human review regardless of the confidence score.',
      'A strict mass decomposition (on lesions / on normal anatomy / unaccounted for) is reported alongside, because the soft score alone could flatter a diffuse attention map.',
    ],
  },
  {
    id: 'confidence',
    heading: 'Stage 6 — Confidence and human-in-the-loop',
    body: [
      'Five signals are fused into one number, each shown with its own weight and its own contribution: image quality (0.26), grade decisiveness (0.22), evidence alignment (0.20), detector corroboration (0.18) and anatomical certainty (0.14).',
      'Then — and this is the part that matters — a set of hard safety rules runs after the number and outranks it. A confidence score can be wrong. A rule that says “the two graders disagreed by two ICDR levels, send it to a doctor” cannot.',
    ],
    detail: [
      `Above ${CONFIDENCE_THRESHOLDS.highAbove} with no rule triggered → the AI result stands as the screening outcome.`,
      `Below ${CONFIDENCE_THRESHOLDS.highAbove}, or any safety rule triggered → queued for an ophthalmologist re-read.`,
      'Suspected proliferative disease or neovascularisation → urgent specialist review, on every occasion, irrespective of confidence.',
      'Always-escalate rules: Level 3 or 4, two-level grader disagreement, misaligned evidence, borderline quality below 55, incomplete anatomy, corroboration below 40.',
    ],
  },
  {
    id: 'report',
    heading: 'Stage 7 — Doctor-ready report',
    body: [
      'No new inference. The report selects, orders and phrases what the earlier stages produced, so a district ophthalmologist can act on the case in under a minute and a medical officer auditing the programme six months later can reconstruct exactly how the answer was reached.',
      'It carries a per-stage audit trail with method, engine and duration, and it states its own limitations explicitly — including when a stage ran in degraded mode without model support.',
    ],
  },
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-ink-50">Methodology</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
          What each stage actually measures, the thresholds it uses, and where it stops being
          reliable. A screening system that cannot explain its own thresholds should not be
          trusted with a patient’s sight.
        </p>
      </header>

      <div
        role="note"
        className="mb-8 flex items-start gap-3 rounded-xl border border-[#fab219]/40 bg-[#fab219]/8 px-4 py-3.5"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#fab219]" aria-hidden />
        <div>
          <p className="text-[12.5px] font-semibold text-ink-100">
            Status: prototype, not a validated medical device
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
            The reasoning stages are currently backed by a general-purpose vision-language
            model rather than a retinal model trained on graded fundus data. Sensitivity and
            specificity have not been measured against a reference standard. The pipeline
            architecture is designed so any individual stage can be replaced by a
            purpose-trained model without altering the rest of the system — that substitution,
            and a proper validation study against expert grading, is the work between this and
            clinical use.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {METHODS.map((m) => {
          const spec = STAGES.find((s) => `${s.id}` === m.id);
          return (
            <Panel key={m.id}>
              <PanelHeader title={m.heading} subtitle={spec?.question} />
              <div className="space-y-4 p-5">
                {m.body.map((p) => (
                  <p key={p} className="text-[12.5px] leading-relaxed text-ink-300">
                    {p}
                  </p>
                ))}
                {m.detail ? (
                  <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4">
                    <SectionLabel>Thresholds and rules</SectionLabel>
                    <ul className="mt-2.5 space-y-1.5">
                      {m.detail.map((d) => (
                        <li key={d} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-400">
                          <span
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400"
                            aria-hidden
                          />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Panel>
          );
        })}

        {/* Reference tables */}
        <Panel>
          <PanelHeader
            title="Reference — ICDR severity scale"
            subtitle="The scale the output is expressed on, and what each level means for the patient."
          />
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-ink-800">
                  {['Level', 'Clinical name', 'Definition', 'Referable', 'Follow-up'].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DR_LEVELS.map((level) => {
                  const s = DR_SCALE[level];
                  return (
                    <tr key={level} className="border-b border-ink-850/70 align-top">
                      <td className="py-2.5">
                        <span
                          className="grid h-6 w-6 place-items-center rounded-md font-mono text-[11px] font-bold text-ink-950"
                          style={{ background: `var(--dr-${level})` }}
                        >
                          {level}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-[12px] font-medium text-ink-200">
                        {s.clinical}
                      </td>
                      <td className="py-2.5 pr-4 text-[11.5px] leading-relaxed text-ink-400">
                        {s.meaning}
                      </td>
                      <td className="py-2.5 pr-4 text-[11.5px]">
                        {s.referable ? (
                          <span className="font-semibold text-[#fab219]">Yes</span>
                        ) : (
                          <span className="text-ink-500">No</span>
                        )}
                      </td>
                      <td className="py-2.5 text-[11.5px] text-ink-400">{s.followUp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Reference — lesion taxonomy"
            subtitle="What the detection stage looks for, and why each finding changes management."
          />
          <div className="space-y-4 p-5">
            {LESION_CLASSES.map((c) => {
              const s = LESION_TAXONOMY[c];
              return (
                <div key={c} className="border-l-2 pl-3.5" style={{ borderColor: s.colour }}>
                  <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-100">
                    {s.label}
                    <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                      {s.shortLabel}
                    </span>
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{s.appearance}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-300">
                    {s.significance}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
