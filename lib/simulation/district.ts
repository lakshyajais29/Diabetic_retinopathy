/**
 * District-scale operational model.
 *
 * A screening algorithm is only useful if the district it serves can absorb the
 * referrals it generates. This model is deliberately simple and fully visible:
 * an arrival process (patients photographed at PHCs), a service process
 * (ophthalmologist reading time), and the queue between them. No magic numbers
 * are hidden — every assumption is a named, adjustable input, and the outputs
 * state which of them they depend on.
 */

export interface DistrictInputs {
  phcCount: number;
  diabeticsPerPhc: number;
  /** Share of the registered diabetic population actually screened in a year. */
  screeningUptakePct: number;
  /** Photographs captured per patient (both eyes, plus repeats). */
  imagesPerPatient: number;
  /** Prevalence of referable DR (ICDR ≥ 2) in the screened population. */
  referablePrevalencePct: number;
  /** Share of images the AI clears without any human read. */
  aiAutoClearPct: number;
  /** Images the AI can process per hour per deployed node. */
  aiThroughputPerHour: number;
  aiNodes: number;
  ophthalmologists: number;
  /** Minutes an ophthalmologist spends reading one screening image set. */
  minutesPerRead: number;
  workingDaysPerYear: number;
  hoursPerDayOnScreening: number;
  /** Ungradeable rate — images that must be recaptured. */
  ungradeableRatePct: number;
}

export interface ScenarioOutcome {
  label: string;
  imagesRequiringHumanRead: number;
  doctorHoursRequired: number;
  doctorHoursAvailable: number;
  utilisation: number;
  /** Backlog at the end of 12 months, in images. */
  endingBacklog: number;
  /** Mean wait for a human read, in days. */
  averageWaitDays: number;
  feasible: boolean;
  backlogSeries: number[];
  waitSeries: number[];
}

export interface DistrictOutputs {
  registeredDiabetics: number;
  patientsScreened: number;
  totalImages: number;
  gradableImages: number;
  recaptureImages: number;
  referableCases: number;
  aiCapacityImages: number;
  aiCapacityHeadroom: number;
  manualOnly: ScenarioOutcome;
  aiTriaged: ScenarioOutcome;
  doctorHoursSaved: number;
  doctorDaysSaved: number;
  /** Extra patients the same specialist workforce could cover with AI triage. */
  additionalPatientsCoverable: number;
  /** Referable patients reaching a specialist within the clinically useful window. */
  timelyReferralsManual: number;
  timelyReferralsAi: number;
  assumptions: string[];
}

const MONTHS = 12;

export function simulateDistrict(input: DistrictInputs): DistrictOutputs {
  const registeredDiabetics = Math.round(input.phcCount * input.diabeticsPerPhc);
  const patientsScreened = Math.round(
    registeredDiabetics * (input.screeningUptakePct / 100),
  );
  const totalImages = Math.round(patientsScreened * input.imagesPerPatient);
  const recaptureImages = Math.round(totalImages * (input.ungradeableRatePct / 100));
  const gradableImages = totalImages - recaptureImages;
  const referableCases = Math.round(patientsScreened * (input.referablePrevalencePct / 100));

  const doctorHoursAvailable =
    input.ophthalmologists * input.workingDaysPerYear * input.hoursPerDayOnScreening;

  const aiCapacityImages = Math.round(
    input.aiNodes * input.aiThroughputPerHour * input.workingDaysPerYear * 8,
  );
  const aiCapacityHeadroom = aiCapacityImages > 0 ? aiCapacityImages / Math.max(1, totalImages) : 0;

  /* Scenario A — every image read by a human, which is today's standard. */
  const manualOnly = scenario(
    'Manual reading only',
    gradableImages,
    doctorHoursAvailable,
    input,
  );

  /* Scenario B — AI clears the confident cases; everything else is queued. */
  const humanReadImages = Math.round(gradableImages * (1 - input.aiAutoClearPct / 100));
  const aiTriaged = scenario('AI-triaged reading', humanReadImages, doctorHoursAvailable, input);

  const doctorHoursSaved = Math.max(
    0,
    manualOnly.doctorHoursRequired - aiTriaged.doctorHoursRequired,
  );

  const imagesPerPatientEffective = input.imagesPerPatient || 1;
  const readsPerHour = 60 / Math.max(1, input.minutesPerRead);
  const additionalPatientsCoverable = Math.round(
    (doctorHoursSaved * readsPerHour) / imagesPerPatientEffective,
  );

  return {
    registeredDiabetics,
    patientsScreened,
    totalImages,
    gradableImages,
    recaptureImages,
    referableCases,
    aiCapacityImages,
    aiCapacityHeadroom,
    manualOnly,
    aiTriaged,
    doctorHoursSaved: Math.round(doctorHoursSaved),
    doctorDaysSaved: Math.round(doctorHoursSaved / Math.max(1, input.hoursPerDayOnScreening)),
    additionalPatientsCoverable,
    timelyReferralsManual: timelyReferrals(referableCases, manualOnly.averageWaitDays),
    timelyReferralsAi: timelyReferrals(referableCases, aiTriaged.averageWaitDays),
    assumptions: [
      `${input.phcCount} PHCs each serving ${input.diabeticsPerPhc.toLocaleString()} registered diabetic patients.`,
      `${input.screeningUptakePct}% annual screening uptake, ${input.imagesPerPatient} images per patient.`,
      `${input.referablePrevalencePct}% referable DR prevalence (ICDR ≥ 2) in the screened population.`,
      `${input.ungradeableRatePct}% of captures ungradeable and requiring recapture.`,
      `${input.ophthalmologists} ophthalmologist(s) giving ${input.hoursPerDayOnScreening}h/day across ${input.workingDaysPerYear} working days to screening reads, at ${input.minutesPerRead} min per read.`,
      `AI clears ${input.aiAutoClearPct}% of gradable images without a human read; the remainder is queued for a specialist.`,
      'Referral is treated as "timely" if a specialist read happens within 30 days of capture.',
    ],
  };
}

function scenario(
  label: string,
  imagesRequiringHumanRead: number,
  doctorHoursAvailable: number,
  input: DistrictInputs,
): ScenarioOutcome {
  const doctorHoursRequired = (imagesRequiringHumanRead * input.minutesPerRead) / 60;
  const utilisation = doctorHoursAvailable > 0 ? doctorHoursRequired / doctorHoursAvailable : Infinity;

  const arrivalsPerDay = imagesRequiringHumanRead / Math.max(1, input.workingDaysPerYear);
  const capacityPerDay =
    (input.ophthalmologists * input.hoursPerDayOnScreening * 60) / Math.max(1, input.minutesPerRead);

  /* Month-by-month backlog. Arrivals are treated as uniform across the year;
     the queue carries over, which is what makes an over-subscribed programme
     visibly diverge rather than merely "run at 105% capacity". */
  const daysPerMonth = input.workingDaysPerYear / MONTHS;
  const backlogSeries: number[] = [];
  const waitSeries: number[] = [];
  let backlog = 0;

  for (let m = 0; m < MONTHS; m++) {
    const arrivals = arrivalsPerDay * daysPerMonth;
    const capacity = capacityPerDay * daysPerMonth;
    backlog = Math.max(0, backlog + arrivals - capacity);
    backlogSeries.push(Math.round(backlog));
    waitSeries.push(round1(capacityPerDay > 0 ? backlog / capacityPerDay : 0));
  }

  /* Steady-state wait. Below capacity we use the M/M/1 queueing delay, which
     captures the fact that a system at 95% utilisation is already slow. Above
     capacity there is no steady state — the wait is whatever the backlog is. */
  let averageWaitDays: number;
  if (utilisation < 1 && capacityPerDay > arrivalsPerDay) {
    const mm1 = utilisation / (capacityPerDay - arrivalsPerDay);
    averageWaitDays = round1(Math.max(0.5, mm1));
  } else {
    averageWaitDays = waitSeries[waitSeries.length - 1];
  }

  return {
    label,
    imagesRequiringHumanRead,
    doctorHoursRequired: Math.round(doctorHoursRequired),
    doctorHoursAvailable: Math.round(doctorHoursAvailable),
    utilisation: round2(utilisation),
    endingBacklog: backlogSeries[backlogSeries.length - 1],
    averageWaitDays,
    feasible: utilisation < 1,
    backlogSeries,
    waitSeries,
  };
}

/**
 * Referable patients seen inside the window where intervention still changes the
 * outcome. Modelled as a soft cliff around 30 days rather than a hard cut — a
 * queue does not fail all at once.
 */
function timelyReferrals(referableCases: number, waitDays: number): number {
  const ratio = waitDays <= 0 ? 1 : Math.min(1, 30 / waitDays);
  const share = ratio >= 1 ? 0.95 : Math.max(0.05, 0.95 * ratio ** 1.4);
  return Math.round(referableCases * share);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Presets                                                              */
/* ------------------------------------------------------------------ */

export interface DistrictPreset {
  id: string;
  name: string;
  description: string;
  inputs: DistrictInputs;
}

const BASE: DistrictInputs = {
  phcCount: 52,
  diabeticsPerPhc: 2100,
  screeningUptakePct: 45,
  imagesPerPatient: 2,
  referablePrevalencePct: 12,
  aiAutoClearPct: 68,
  aiThroughputPerHour: 220,
  aiNodes: 2,
  ophthalmologists: 3,
  minutesPerRead: 4,
  workingDaysPerYear: 240,
  hoursPerDayOnScreening: 2,
  ungradeableRatePct: 12,
};

export const DISTRICT_PRESETS: DistrictPreset[] = [
  {
    id: 'typical',
    name: 'Typical district',
    description:
      '52 PHCs, three ophthalmologists sharing screening reads with clinic duties. The common case.',
    inputs: { ...BASE },
  },
  {
    id: 'understaffed',
    name: 'Understaffed district',
    description:
      'One ophthalmologist for the whole district, high uptake after an awareness drive. Where manual reading collapses.',
    inputs: {
      ...BASE,
      ophthalmologists: 1,
      screeningUptakePct: 62,
      hoursPerDayOnScreening: 1.5,
    },
  },
  {
    id: 'large',
    name: 'Large district',
    description:
      '120 PHCs across a densely populated district with a large registered diabetic cohort.',
    inputs: {
      ...BASE,
      phcCount: 120,
      diabeticsPerPhc: 2800,
      ophthalmologists: 6,
      aiNodes: 4,
    },
  },
  {
    id: 'target',
    name: 'National target state',
    description:
      '80% screening uptake — the coverage a national programme aims for. The scenario the workforce has to be sized against.',
    inputs: {
      ...BASE,
      screeningUptakePct: 80,
      ophthalmologists: 4,
      aiAutoClearPct: 72,
      ungradeableRatePct: 9,
    },
  },
];

export const DEFAULT_DISTRICT_INPUTS: DistrictInputs = { ...BASE };
