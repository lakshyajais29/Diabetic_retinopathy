'use client';

import { Printer, ScanEye } from 'lucide-react';
import type {
  LesionAnalysis,
  PipelineResult,
  ScreeningReport,
  StructureAnalysis,
} from '@/lib/pipeline/types';
import { DR_SCALE, LESION_TAXONOMY, LESION_CLASSES } from '@/lib/pipeline/constants';
import { ImageViewer } from '@/components/screening/ImageViewer';
import { cn, decisionStatus, formatDateTime, formatDuration } from '@/lib/ui';
import { StatusBadge } from '@/components/ui/primitives';

export function ReportView({
  report,
  result,
  structures,
  lesions,
}: {
  report: ScreeningReport;
  result: PipelineResult | null;
  structures: StructureAnalysis | null;
  lesions: LesionAnalysis | null;
}) {
  const spec = DR_SCALE[report.grade.level];
  const status = decisionStatus(report.confidence.decision);
  const present = LESION_CLASSES.filter((c) => report.evidence.counts[c] > 0);
  const image = result?.images.working ?? result?.images.original ?? null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="print-hide mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Official Clinical Report — review on screen, print or export PDF for patient records.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Print / Export PDF Slip
        </button>
      </div>

      <article className="print-sheet medical-card p-8">
        {/* ---- Letterhead ---- */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
              <ScanEye className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold text-white font-display">
                Diabetic Retinopathy Clinical Screening Report
              </h1>
              <p className="print-muted mt-1 text-xs text-slate-400">
                RetinaSetu · Staged Clinical Decision Support · District Screening Programme
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="tabular font-mono text-xs font-bold text-sky-400">
              {report.reportId}
            </p>
            <p className="print-muted mt-1 text-[11px] text-slate-400">
              {formatDateTime(report.generatedAt)}
            </p>
          </div>
        </header>

        {/* ---- Patient ---- */}
        <section className="grid gap-x-8 gap-y-3 border-b border-slate-800 py-6 sm:grid-cols-3">
          <ReportField label="Patient ID" value={report.patient.patientId || '—'} />
          <ReportField
            label="Age / Sex"
            value={`${report.patient.age || '—'} Yrs / ${
              report.patient.sex === 'unstated' ? 'Unstated' : report.patient.sex
            }`}
          />
          <ReportField
            label="Eye Imaged"
            value={
              report.patient.eye === 'unstated'
                ? structures?.laterality && structures.laterality !== 'indeterminate'
                  ? `${structures.laterality} (Inferred)`
                  : '—'
                : report.patient.eye === 'right'
                  ? 'Right (OD)'
                  : 'Left (OS)'
            }
          />
          <ReportField
            label="Diabetes Duration"
            value={
              report.patient.diabetesDurationYears
                ? `${report.patient.diabetesDurationYears} Years`
                : '—'
            }
          />
          <ReportField label="Capture PHC Site" value={report.patient.phc || '—'} />
          <ReportField label="Ophthalmic Screener" value={report.patient.operator || '—'} />
        </section>

        {/* ---- Verdict ---- */}
        <section
          className={cn(
            'print-card my-6 rounded-2xl border p-5',
            status === 'good' && 'border-emerald-500/40 bg-emerald-500/10',
            status === 'warning' && 'border-amber-500/40 bg-amber-500/10',
            status === 'critical' && 'border-rose-500/40 bg-rose-500/10',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[260px] flex-1">
              <StatusBadge status={status} size="lg">
                {report.confidence.decisionLabel}
              </StatusBadge>
              <p className="mt-3 text-base font-bold text-white">
                {report.recommendation.headline}
              </p>
              <p className="print-muted mt-1.5 text-xs text-slate-300">
                Recommended Follow-up: <span className="font-semibold text-white">{report.recommendation.followUpInterval}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="grid h-14 w-14 place-items-center rounded-2xl text-2xl font-extrabold text-slate-950 shadow-lg"
                style={{ background: `var(--dr-${report.grade.level})` }}
              >
                {report.grade.level}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{spec.clinical}</p>
                <p className="print-muted mt-0.5 text-xs text-slate-400">
                  {report.grade.referable ? 'Referral Recommended' : 'Routine Screening'} · Urgency:{' '}
                  <span className="font-semibold text-slate-200 capitalize">{report.grade.urgency}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Key numbers ---- */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReportStat
            label="ICDR Grade"
            value={`Level ${report.grade.level}`}
            hint={spec.short}
          />
          <ReportStat
            label="Confidence"
            value={`${report.confidence.value}%`}
            hint={`${report.confidence.band} confidence`}
          />
          <ReportStat
            label="Image Quality"
            value={`${report.imageQuality.score}/100`}
            hint={`${report.imageQuality.verdict}${report.imageQuality.enhanced ? ' · enhanced' : ''}`}
          />
          <ReportStat
            label="Lesion Findings"
            value={`${report.evidence.totalLesions}`}
            hint={`Overlap: ${report.evidence.evidenceOverlapScore}/100`}
          />
        </section>

        {/* ---- Visual evidence ---- */}
        {image ? (
          <section className="print-keep mt-7">
            <ReportHeading>Visual Retinal Evidence</ReportHeading>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <ImageViewer
                src={image}
                alt="Fundus photograph with detected findings marked"
                structures={structures}
                lesions={lesions}
                explainability={null}
                layers={{ anatomy: true, lesions: true, heatmap: false }}
                visibleClasses={new Set(LESION_CLASSES)}
              />
              <div className="glass-panel p-4">
                <p className="print-muted text-xs text-slate-400 leading-relaxed">
                  Anatomical landmarks and located lesion candidates. Shapes differ per class for CVD accessibility and greyscale print clarity.
                </p>
                <dl className="mt-4 space-y-2">
                  {present.length === 0 ? (
                    <p className="text-xs text-slate-400">No pathological lesions located.</p>
                  ) : (
                    present.map((c) => (
                      <div key={c} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-xs text-slate-300">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0"
                            style={{
                              border: `1.5px solid ${LESION_TAXONOMY[c].colour}`,
                              background: `${LESION_TAXONOMY[c].colour}40`,
                              borderRadius:
                                c === 'microaneurysm' || c === 'haemorrhage' ? '999px' : '3px',
                            }}
                          />
                          {LESION_TAXONOMY[c].label}
                        </dt>
                        <dd className="tabular font-mono text-xs font-bold text-white">
                          {report.evidence.counts[c]}
                        </dd>
                      </div>
                    ))
                  )}
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---- Key Findings ---- */}
        <section className="print-keep mt-7">
          <ReportHeading>Key Clinical Findings</ReportHeading>
          <ul className="mt-3 space-y-2">
            {report.keyFindings.map((f) => (
              <li key={f} className="flex gap-2.5 text-xs leading-relaxed text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Recommendation ---- */}
        <section className="print-keep mt-7">
          <ReportHeading>Recommended Action Steps</ReportHeading>
          <ol className="mt-3 space-y-2.5">
            {report.recommendation.actions.map((a, i) => (
              <li key={a} className="flex gap-3 text-xs leading-relaxed text-slate-200">
                <span className="tabular font-mono text-xs font-bold text-sky-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Audit trail ---- */}
        <section className="print-keep mt-7">
          <ReportHeading>Processing Audit Trail</ReportHeading>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Stage</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {report.auditTrail.map((t) => (
                  <tr key={t.id}>
                    <td className="tabular py-2 font-mono text-slate-500">{t.index}</td>
                    <td className="py-2 font-medium text-slate-200">{t.title}</td>
                    <td className="py-2 text-slate-400 capitalize">
                      {t.provenance}
                      {t.engine ? ` · ${t.engine}` : ''}
                    </td>
                    <td className="tabular py-2 font-mono text-slate-400">
                      {formatDuration(t.durationMs)}
                    </td>
                    <td className="py-2">
                      {t.degraded ? (
                        <span className="text-amber-400 font-semibold">degraded</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Signature ---- */}
        <footer className="mt-8 border-t border-slate-800 pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Reviewing Ophthalmologist Signature
              </p>
              <div className="mt-8 border-t border-slate-700 pt-2">
                <p className="text-[11px] text-slate-500">
                  Doctor Name, Registration No., Signature & Date
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Medical Disclaimer
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                This report was generated by an automated clinical decision-support system. It is not a standalone diagnosis. Clinical responsibility rests with the reviewing ophthalmologist. Generated {formatDateTime(report.generatedAt)}.
              </p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function ReportHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-slate-800 pb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
      {children}
    </h2>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-200 capitalize">{value}</p>
    </div>
  );
}

function ReportStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="glass-panel p-3.5">
      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </p>
      <p className="tabular mt-2 text-lg font-bold text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400 capitalize">{hint}</p>
    </div>
  );
}
