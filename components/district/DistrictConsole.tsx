'use client';

import { useMemo, useState } from 'react';
import { Building2, Clock, RotateCcw, TrendingUp, Users } from 'lucide-react';
import {
  DEFAULT_DISTRICT_INPUTS,
  DISTRICT_PRESETS,
  simulateDistrict,
  type DistrictInputs,
} from '@/lib/simulation/district';
import { BacklogChart, ComparisonBars, SplitBar } from '@/components/district/Charts';
import {
  Panel,
  PanelHeader,
  StatTile,
  StatusBadge,
} from '@/components/ui/primitives';
import { cn, formatCompact, formatNumber } from '@/lib/ui';

const SERIES_AI = '#1aa197';
const SERIES_MANUAL = '#d95926';

interface ControlSpec {
  key: keyof DistrictInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
}

const CONTROL_GROUPS: Array<{ title: string; controls: ControlSpec[] }> = [
  {
    title: 'Demand',
    controls: [
      {
        key: 'phcCount',
        label: 'Primary Health Centres',
        min: 5,
        max: 200,
        step: 1,
        unit: 'PHCs',
        hint: 'Capture points feeding the programme',
      },
      {
        key: 'diabeticsPerPhc',
        label: 'Registered diabetics per PHC',
        min: 200,
        max: 6000,
        step: 100,
        unit: 'patients',
        hint: 'Size of the catchment cohort',
      },
      {
        key: 'screeningUptakePct',
        label: 'Annual screening uptake',
        min: 5,
        max: 100,
        step: 1,
        unit: '%',
        hint: 'Share of the cohort actually screened each year',
      },
      {
        key: 'imagesPerPatient',
        label: 'Images per patient',
        min: 1,
        max: 4,
        step: 1,
        unit: 'images',
        hint: 'Two eyes, plus repeats',
      },
      {
        key: 'ungradeableRatePct',
        label: 'Ungradeable capture rate',
        min: 0,
        max: 40,
        step: 1,
        unit: '%',
        hint: 'Rejected by the stage-1 quality gate; needs recapture',
      },
    ],
  },
  {
    title: 'Clinical profile',
    controls: [
      {
        key: 'referablePrevalencePct',
        label: 'Referable DR prevalence',
        min: 1,
        max: 40,
        step: 1,
        unit: '%',
        hint: 'ICDR ≥ 2 in the screened population',
      },
      {
        key: 'aiAutoClearPct',
        label: 'AI auto-clear rate',
        min: 0,
        max: 95,
        step: 1,
        unit: '%',
        hint: 'Images the AI resolves without any human read',
      },
    ],
  },
  {
    title: 'Reading capacity',
    controls: [
      {
        key: 'ophthalmologists',
        label: 'Ophthalmologists',
        min: 0,
        max: 20,
        step: 1,
        unit: 'specialists',
        hint: 'Available to the district screening programme',
      },
      {
        key: 'hoursPerDayOnScreening',
        label: 'Hours per day on reads',
        min: 0.5,
        max: 8,
        step: 0.5,
        unit: 'h/day',
        hint: 'Screening reads compete with clinic and theatre',
      },
      {
        key: 'minutesPerRead',
        label: 'Minutes per read',
        min: 1,
        max: 15,
        step: 0.5,
        unit: 'min',
        hint: 'Specialist time to read one image set',
      },
      {
        key: 'workingDaysPerYear',
        label: 'Working days per year',
        min: 120,
        max: 320,
        step: 5,
        unit: 'days',
        hint: 'Programme operating calendar',
      },
    ],
  },
];

export function DistrictConsole() {
  const [inputs, setInputs] = useState<DistrictInputs>({ ...DEFAULT_DISTRICT_INPUTS });
  const [presetId, setPresetId] = useState('typical');

  const out = useMemo(() => simulateDistrict(inputs), [inputs]);

  const set = (key: keyof DistrictInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setPresetId('custom');
  };

  const applyPreset = (id: string) => {
    const preset = DISTRICT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setInputs({ ...preset.inputs });
    setPresetId(id);
  };

  const humanReadShare =
    out.gradableImages > 0
      ? out.aiTriaged.imagesRequiringHumanRead / out.gradableImages
      : 0;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-ink-50">District-scale operational model</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-400">
          A screening algorithm is only useful if the district can absorb the referrals it
          generates. This models the whole programme: arrivals from every PHC, specialist
          reading capacity, and the queue between them — with and without AI triage. Every
          assumption below is an adjustable input; nothing is hidden in a constant.
        </p>
      </header>

      {/* ---- Presets ---- */}
      <div className="mb-5 flex flex-wrap gap-2">
        {DISTRICT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={cn(
              'rounded-lg border px-3.5 py-2 text-left transition',
              presetId === p.id
                ? 'border-brand-500/60 bg-brand-600/12'
                : 'border-ink-800 bg-panel hover:border-ink-600',
            )}
          >
            <span className="block text-[12px] font-semibold text-ink-100">{p.name}</span>
            <span className="mt-0.5 block max-w-[240px] text-[10.5px] leading-snug text-ink-500">
              {p.description}
            </span>
          </button>
        ))}
        {presetId === 'custom' ? (
          <button
            type="button"
            onClick={() => applyPreset('typical')}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-ink-800 bg-panel px-3.5 py-2 text-[12px] font-semibold text-ink-300 transition hover:border-ink-600"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        {/* ---- Controls ---- */}
        <div className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          {CONTROL_GROUPS.map((group) => (
            <Panel key={group.title}>
              <PanelHeader title={group.title} />
              <div className="space-y-5 p-4">
                {group.controls.map((c) => (
                  <Control
                    key={String(c.key)}
                    spec={c}
                    value={inputs[c.key] as number}
                    onChange={(v) => set(c.key, v)}
                  />
                ))}
              </div>
            </Panel>
          ))}
        </div>

        {/* ---- Outputs ---- */}
        <div className="min-w-0 space-y-5">
          {/* Headline */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Patients screened / yr"
              value={formatCompact(out.patientsScreened)}
              hint={`from ${formatNumber(out.registeredDiabetics)} registered`}
            />
            <StatTile
              label="Images captured / yr"
              value={formatCompact(out.totalImages)}
              hint={`${formatCompact(out.recaptureImages)} need recapture`}
            />
            <StatTile
              label="Referable cases found"
              value={formatCompact(out.referableCases)}
              hint={`at ${inputs.referablePrevalencePct}% prevalence`}
              status="warning"
            />
            <StatTile
              label="Specialist hours available"
              value={formatNumber(out.manualOnly.doctorHoursAvailable)}
              unit="h/yr"
              hint={`${inputs.ophthalmologists} specialists × ${inputs.hoursPerDayOnScreening}h`}
            />
          </div>

          {/* Feasibility verdict */}
          <Panel>
            <PanelHeader
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
              title="Can the district actually read this volume?"
              subtitle="Specialist hours required against specialist hours available, per year."
            />
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div>
                <ComparisonBars
                  unit="hours"
                  reference={out.manualOnly.doctorHoursAvailable}
                  referenceLabel="Capacity available"
                  data={[
                    {
                      label: 'Manual reading only',
                      value: out.manualOnly.doctorHoursRequired,
                      colour: SERIES_MANUAL,
                      note: `${(out.manualOnly.utilisation * 100).toFixed(0)}% of available capacity — ${
                        out.manualOnly.feasible ? 'sustainable' : 'not achievable'
                      }`,
                    },
                    {
                      label: 'With RetinaSetu triage',
                      value: out.aiTriaged.doctorHoursRequired,
                      colour: SERIES_AI,
                      note: `${(out.aiTriaged.utilisation * 100).toFixed(0)}% of available capacity — ${
                        out.aiTriaged.feasible ? 'sustainable' : 'still not achievable'
                      }`,
                    },
                  ]}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={out.manualOnly.feasible ? 'good' : 'critical'} size="sm">
                    Manual: {out.manualOnly.feasible ? 'queue clears' : 'backlog grows'}
                  </StatusBadge>
                  <StatusBadge status={out.aiTriaged.feasible ? 'good' : 'critical'} size="sm">
                    AI-triaged: {out.aiTriaged.feasible ? 'queue clears' : 'backlog grows'}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Wait — manual"
                    value={
                      out.manualOnly.averageWaitDays > 900
                        ? '900+'
                        : formatNumber(out.manualOnly.averageWaitDays, 1)
                    }
                    unit="days"
                    status={out.manualOnly.averageWaitDays > 30 ? 'critical' : 'good'}
                  />
                  <StatTile
                    label="Wait — AI-triaged"
                    value={
                      out.aiTriaged.averageWaitDays > 900
                        ? '900+'
                        : formatNumber(out.aiTriaged.averageWaitDays, 1)
                    }
                    unit="days"
                    status={out.aiTriaged.averageWaitDays > 30 ? 'critical' : 'good'}
                  />
                </div>

                <p className="text-[11.5px] leading-relaxed text-ink-400">
                  Waiting time below capacity uses the M/M/1 queueing delay, which is why a
                  programme running at 95% utilisation is already slow rather than
                  comfortable. Above capacity there is no steady state and the figure shown
                  is the twelve-month backlog.
                </p>
              </div>
            </div>
          </Panel>

          {/* Backlog */}
          <Panel>
            <PanelHeader
              icon={<Clock className="h-4 w-4" aria-hidden />}
              title="Unread image backlog over twelve months"
              subtitle="Arrivals accumulate against reading capacity. A programme that cannot keep up does not run at 105% — it diverges."
            />
            <div className="p-5">
              <BacklogChart
                yLabel="Images waiting"
                series={[
                  {
                    key: 'manual',
                    label: 'Manual reading only',
                    colour: SERIES_MANUAL,
                    values: out.manualOnly.backlogSeries,
                  },
                  {
                    key: 'ai',
                    label: 'With RetinaSetu triage',
                    colour: SERIES_AI,
                    values: out.aiTriaged.backlogSeries,
                  },
                ]}
              />
            </div>
          </Panel>

          {/* Workload split + impact */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                icon={<Users className="h-4 w-4" aria-hidden />}
                title="Where the images go"
                subtitle="How triage divides the annual capture volume."
              />
              <div className="p-5">
                <SplitBar
                  total={out.totalImages}
                  segments={[
                    {
                      label: 'Auto-cleared by AI (no human read)',
                      value: out.gradableImages - out.aiTriaged.imagesRequiringHumanRead,
                      colour: SERIES_AI,
                    },
                    {
                      label: 'Escalated for specialist read',
                      value: out.aiTriaged.imagesRequiringHumanRead,
                      colour: '#3987e5',
                    },
                    {
                      label: 'Rejected at the quality gate — recapture',
                      value: out.recaptureImages,
                      colour: '#fab219',
                    },
                  ]}
                />
                <p className="mt-4 border-t border-ink-850 pt-3 text-[11.5px] leading-relaxed text-ink-400">
                  {(humanReadShare * 100).toFixed(0)}% of gradable images still reach a
                  specialist. That is the point: triage is meant to concentrate scarce
                  expertise on the cases that need it, not to remove the clinician.
                </p>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                icon={<Building2 className="h-4 w-4" aria-hidden />}
                title="Programme impact"
                subtitle="What the freed capacity is worth."
              />
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Specialist hours freed"
                    value={formatCompact(out.doctorHoursSaved)}
                    unit="h/yr"
                    hint={`≈ ${formatNumber(out.doctorDaysSaved)} working days`}
                    status="good"
                  />
                  <StatTile
                    label="Extra patients coverable"
                    value={formatCompact(out.additionalPatientsCoverable)}
                    hint="Same workforce, freed time"
                    status="good"
                  />
                  <StatTile
                    label="Timely referrals — manual"
                    value={formatCompact(out.timelyReferralsManual)}
                    hint="Seen within 30 days"
                    status={
                      out.timelyReferralsManual < out.referableCases * 0.6 ? 'critical' : 'good'
                    }
                  />
                  <StatTile
                    label="Timely referrals — AI"
                    value={formatCompact(out.timelyReferralsAi)}
                    hint="Seen within 30 days"
                    status={
                      out.timelyReferralsAi < out.referableCases * 0.6 ? 'critical' : 'good'
                    }
                  />
                </div>

                <p className="text-[11.5px] leading-relaxed text-ink-400">
                  Of {formatNumber(out.referableCases)} referable patients found, triage moves{' '}
                  <span className="font-semibold text-ink-200">
                    {formatNumber(Math.max(0, out.timelyReferralsAi - out.timelyReferralsManual))}
                  </span>{' '}
                  more of them into a specialist consultation inside the window where
                  treatment still changes the outcome.
                </p>

                <div className="rounded-lg border border-ink-800 bg-ink-900/50 px-3.5 py-3">
                  <p className="text-[11px] font-semibold text-ink-300">
                    AI processing headroom
                  </p>
                  <p className="tabular mt-1 font-mono text-[12px] text-brand-300">
                    {out.aiCapacityHeadroom.toFixed(1)}× the annual volume
                  </p>
                  <p className="mt-1 text-[10.5px] leading-snug text-ink-500">
                    {inputs.aiNodes} node(s) at {inputs.aiThroughputPerHour} images/hour.
                    Inference is not the bottleneck in this system — specialist reading is.
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Assumptions */}
          <Panel>
            <PanelHeader
              title="Stated assumptions"
              subtitle="Every number above follows from these. Change a control and they change with it."
            />
            <ul className="space-y-2 p-5">
              {out.assumptions.map((a) => (
                <li key={a} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-400">
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-500"
                    aria-hidden
                  />
                  {a}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Control({
  spec,
  value,
  onChange,
}: {
  spec: ControlSpec;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={`ctl-${String(spec.key)}`}
          className="text-[12px] font-medium text-ink-200"
        >
          {spec.label}
        </label>
        <span className="tabular font-mono text-[12px] font-semibold text-brand-300">
          {value % 1 === 0 ? formatNumber(value) : value}
          <span className="ml-1 text-[10px] font-normal text-ink-500">{spec.unit}</span>
        </span>
      </div>
      <input
        id={`ctl-${String(spec.key)}`}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#1aa197]"
        aria-describedby={`hint-${String(spec.key)}`}
      />
      <p id={`hint-${String(spec.key)}`} className="mt-1 text-[10.5px] leading-snug text-ink-500">
        {spec.hint}
      </p>
    </div>
  );
}

export const SERIES = { ai: SERIES_AI, manual: SERIES_MANUAL };
