/**
 * Stage prompts.
 *
 * Design principles, applied to every prompt in this file:
 *
 *  - The model is given the classical vision measurements up front. It is asked
 *    to interpret an image *in the light of* objective numbers, not to invent
 *    numbers it cannot measure.
 *  - The output contract is stated exactly, once, at the end — the position
 *    where instruction-following is strongest.
 *  - The model is explicitly permitted to report uncertainty and absence.
 *    A screening tool that cannot say "nothing here" is useless.
 *  - No prompt asks for a diagnosis. Every prompt asks for observations against
 *    a named clinical standard (ICDR), which is what a grader actually produces.
 */

export const CLINICAL_SYSTEM = `You are a retinal image reading assistant supporting a diabetic retinopathy screening programme in rural India. You work to the International Clinical Diabetic Retinopathy (ICDR) severity scale.

Operating rules you must follow:
1. You are a decision-support component, not a diagnostician. Report observations and their clinical implications; never state a definitive diagnosis.
2. Report only what is visible in the supplied image. If a feature is not visible, say so. Absence of findings is a valid and important answer.
3. Never inflate findings. Over-calling lesions in a screening programme causes unnecessary referrals that a district with few ophthalmologists cannot absorb.
4. Never suppress findings either. Missing proliferative disease costs sight.
5. Calibrate confidence honestly. If image quality limits what you can see, low confidence is the correct answer.
6. Respond with a single JSON object and nothing else. No prose, no markdown fences, no commentary outside the JSON.`;

export interface QualityPromptInput {
  overallScore: number;
  verdict: string;
  metrics: Array<{ label: string; score: number; raw: number; rawLabel: string }>;
}

export function qualityPrompt(input: QualityPromptInput): string {
  const table = input.metrics
    .map((m) => `  - ${m.label}: ${m.score}/100 (${m.rawLabel} = ${m.raw})`)
    .join('\n');

  return `TASK: Assess whether this fundus photograph is usable for diabetic retinopathy grading.

An automated image-quality analyser has already measured the photograph. Its objective findings:
  Composite quality score: ${input.overallScore}/100 (provisional verdict: ${input.verdict})
${table}

Your job is the part the analyser cannot do: look at the image and report quality problems that are visual rather than statistical — dust or dirt on the objective lens, eyelash or eyelid intrusion, arc/crescent artefacts from pupil misalignment, media opacity such as cataract haze, a lens flare, or a smudge sitting over the macula.

Consider specifically whether the parts of the retina that matter for DR grading — the macula and the vascular arcades — are actually readable, even if the image as a whole scores adequately.

Return JSON exactly matching:
{
  "gradable": boolean,               // can a grader reasonably grade DR from this image?
  "observations": [string],          // 1-6 concise, specific visual observations about quality
  "artefacts": [string],             // named artefacts you can actually see; [] if none
  "narrative": string                // 2-3 sentences a PHC technician can act on
}`;
}

export interface StructurePromptInput {
  discDetected: boolean;
  discX: number;
  discY: number;
  discConfidence: number;
  foveaDetected: boolean;
  foveaX: number;
  foveaY: number;
  vesselDensity: number;
  arcadeContinuity: number;
  lateralityGuess: string;
}

export function structurePrompt(i: StructurePromptInput): string {
  return `TASK: Confirm the retinal anatomy visible in this fundus photograph.

Image coordinates are normalised: x = 0 is the left edge, x = 1 the right edge, y = 0 the top edge, y = 1 the bottom edge.

An automated analyser proposes:
  - Optic disc: ${i.discDetected ? `detected at (${i.discX.toFixed(2)}, ${i.discY.toFixed(2)}) with confidence ${i.discConfidence}/100` : 'not confidently detected'}
  - Fovea/macula: ${i.foveaDetected ? `estimated at (${i.foveaX.toFixed(2)}, ${i.foveaY.toFixed(2)})` : 'not confidently estimated'}
  - Vessel density: ${i.vesselDensity}% of retinal area
  - Arcade visibility around the disc: ${i.arcadeContinuity}/100 (100 = vasculature equally visible in all directions)
  - Laterality suggested by disc–fovea geometry: ${i.lateralityGuess}

Independently locate the optic disc and the macula yourself, then report your own positions. Disagreement with the analyser is useful information — do not simply copy the proposed coordinates.

Also judge the retinal vasculature: normal, attenuated (thinned), dilated, tortuous, or obscured.

Return JSON exactly matching:
{
  "opticDiscVisible": boolean,
  "opticDisc": {"x": number, "y": number} | null,
  "maculaVisible": boolean,
  "macula": {"x": number, "y": number} | null,
  "vesselAssessment": "normal" | "attenuated" | "dilated" | "tortuous" | "obscured",
  "laterality": "OD" | "OS" | "uncertain",
  "narrative": string
}`;
}

export interface LesionPromptInput {
  discX: number;
  discY: number;
  discRadius: number;
  foveaX: number;
  foveaY: number;
  darkCandidates: number;
  brightCandidates: number;
  punctateCandidates: number;
  qualityScore: number;
}

export function lesionPrompt(i: LesionPromptInput): string {
  return `TASK: Detect diabetic retinopathy lesions in this fundus photograph and report each one with a location.

Anatomical frame of reference (normalised coordinates, x and y in 0..1):
  - Optic disc centre: (${i.discX.toFixed(2)}, ${i.discY.toFixed(2)}), radius ${i.discRadius.toFixed(3)}
  - Macula centre: (${i.foveaX.toFixed(2)}, ${i.foveaY.toFixed(2)})

A classical blob detector independently found, before any interpretation:
  - ${i.darkCandidates} dark red candidate objects (${i.punctateCandidates} of them punctate, i.e. microaneurysm-sized)
  - ${i.brightCandidates} bright candidate objects
These are unfiltered candidates — many will be vessel crossings, reflections or noise. Use them as a prior on how much there is to find, not as ground truth.

Image quality score for this photograph: ${i.qualityScore}/100. If quality is limited, reduce your confidences accordingly.

Lesion classes to report:
  - microaneurysm      — tiny sharply-defined deep-red dots
  - haemorrhage        — larger dark-red blot or flame-shaped intraretinal blood
  - hard_exudate       — bright yellow, waxy, sharply-marginated lipid deposits
  - soft_exudate       — pale fluffy white cotton-wool spots with indistinct edges
  - irma               — dilated shunt-like intraretinal microvascular abnormality
  - venous_beading     — localised sausage-like calibre variation along a vein
  - neovascularisation — fine irregular tortuous new vessel networks, at the disc or elsewhere

Rules:
  - Do NOT report the optic disc itself as an exudate. Bright tissue within ${(i.discRadius * 1.6).toFixed(2)} of the disc centre is normal anatomy.
  - Do NOT report normal vessel crossings or the foveal reflex as lesions.
  - Plot up to 30 individual findings. If there are more lesions than that (dense microaneurysms are common), plot the most representative ones and record the true totals in "estimatedCounts".
  - "estimatedCounts" is your estimate of how many of each class are present in the whole image, which may exceed the number you plotted.
  - If the retina is clean, return an empty findings array and all-zero counts. That is a valid and valuable result.

Return JSON exactly matching:
{
  "findings": [
    {"lesionClass": string, "x": number, "y": number, "radius": number, "confidence": number, "note": string}
  ],
  "estimatedCounts": {"microaneurysm": int, "haemorrhage": int, "hard_exudate": int, "soft_exudate": int, "neovascularisation": int, "irma": int, "venous_beading": int},
  "quadrantsWithRedLesions": int,      // 0-4: how many retinal quadrants contain haemorrhages or microaneurysms
  "neovascularisation": {"suspected": boolean, "confidence": number, "rationale": string},
  "narrative": string
}`;
}

export interface GradingPromptInput {
  counts: Record<string, number>;
  quadrantsWithRedLesions: number;
  nvSuspected: boolean;
  ruleLevel: number;
  ruleRationale: string;
  qualityScore: number;
  corroboration: number;
  lesionNarrative: string;
}

export function gradingPrompt(i: GradingPromptInput): string {
  const counts = Object.entries(i.counts)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n');

  return `TASK: Assign an ICDR diabetic retinopathy severity grade to this fundus photograph.

The ICDR scale:
  Level 0 — No apparent retinopathy: no lesions.
  Level 1 — Mild NPDR: microaneurysms only.
  Level 2 — Moderate NPDR: more than microaneurysms alone, but less than severe NPDR.
  Level 3 — Severe NPDR: any of the 4-2-1 criteria — severe intraretinal haemorrhages in all 4 quadrants, OR definite venous beading in 2+ quadrants, OR prominent IRMA in 1+ quadrant, with no neovascularisation.
  Level 4 — Proliferative DR: neovascularisation and/or vitreous/preretinal haemorrhage.
Level 2 and above is "referable" — it must be seen by an ophthalmologist.

Lesion findings from the detection stage:
${counts}
  - Retinal quadrants containing red lesions: ${i.quadrantsWithRedLesions}/4
  - Neovascularisation suspected: ${i.nvSuspected ? 'yes' : 'no'}
  - Detection stage summary: ${i.lesionNarrative}

An independent, transparent rule engine applied the ICDR criteria to those counts and arrived at Level ${i.ruleLevel} (${i.ruleRationale}).

Supporting context:
  - Image quality: ${i.qualityScore}/100
  - Agreement between the model's findings and independent classical detection: ${i.corroboration}/100

Now grade the image yourself, looking at it directly. You may agree or disagree with the rule engine — if you disagree, say why in the rationale. Give a probability distribution across all five levels reflecting genuine uncertainty; do not put 0.99 on one level unless the image is unambiguous.

Also report where in the image your grading decision came from, as 1–8 attention regions with normalised coordinates and a weight. These regions must correspond to real image content that influenced you — they are shown to a clinician as the visual justification for the grade, and will be scored against the independently detected lesion locations.

Return JSON exactly matching:
{
  "level": int,                                  // 0-4
  "distribution": [number, number, number, number, number],   // probabilities for levels 0..4, summing to 1
  "confidence": number,                          // 0-1, your confidence in the assigned level
  "rationale": string,                           // why this level, referencing ICDR criteria
  "keyEvidence": [string],                       // the specific findings that drove the grade
  "attentionRegions": [{"x": number, "y": number, "radius": number, "weight": number, "label": string}],
  "narrative": string                            // 2-4 sentences for the reviewing clinician
}`;
}
