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

/**
 * The doctor-ready report.
 *
 * Designed to be read in under a minute on screen and to print cleanly on A4 at
 * a district hospital. No new inference happens here — everything shown was
 * produced by an earlier stage and is reproducible from the audit trail.
 */
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
        <p className="text-[12px] text-ink-500">
          Screening report — review, then print or save as PDF for the patient record.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-4 py-2 text-[12.5px] font-semibold text-ink-200 transition hover:border-ink-500 hover:text-white"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          Print / save PDF
        </button>
      </div>

      <article className="print-sheet rounded-xl border border-ink-800 bg-panel p-7 shadow-panel">
        {/* ---- Letterhead ---- */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-800 pb-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-white">
              <ScanEye className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold text-ink-50">
                Diabetic Retinopathy Screening Report
              </h1>
              <p className="print-muted mt-1 text-[11.5px] text-ink-400">
                RetinaSetu · automated decision support · District DR screening programme
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="tabular font-mono text-[12px] font-semibold text-ink-100">
              {report.reportId}
            </p>
            <p className="print-muted mt-1 text-[11px] text-ink-500">
              {formatDateTime(report.generatedAt)}
            </p>
          </div>
        </header>

        {/* ---- Patient ---- */}
        <section className="grid gap-x-8 gap-y-2 border-b border-ink-800 py-5 sm:grid-cols-3">
          <ReportField label="Patient ID" value={report.patient.patientId || '—'} />
          <ReportField
            label="Age / sex"
            value={`${report.patient.age || '—'} / ${
              report.patient.sex === 'unstated' ? '—' : report.patient.sex
            }`}
          />
          <ReportField
            label="Eye imaged"
            value={
              report.patient.eye === 'unstated'
                ? structures?.laterality && structures.laterality !== 'indeterminate'
                  ? `${structures.laterality} (inferred)`
                  : '—'
                : report.patient.eye === 'right'
                  ? 'Right (OD)'
                  : 'Left (OS)'
            }
          />
          <ReportField
            label="Diabetes duration"
            value={
              report.patient.diabetesDurationYears
                ? `${report.patient.diabetesDurationYears} years`
                : '—'
            }
          />
          <ReportField label="Capture site" value={report.patient.phc || '—'} />
          <ReportField label="Operator" value={report.patient.operator || '—'} />
        </section>

        {/* ---- Verdict ---- */}
        <section
          className={cn(
            'print-card my-5 rounded-lg border px-5 py-4',
            status === 'good' && 'border-[#0ca30c]/40 bg-[#0ca30c]/8',
            status === 'warning' && 'border-[#fab219]/45 bg-[#fab219]/8',
            status === 'critical' && 'border-[#d03b3b]/50 bg-[#d03b3b]/10',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[260px] flex-1">
              <StatusBadge status={status} size="lg">
                {report.confidence.decisionLabel}
              </StatusBadge>
              <p className="mt-3 text-[14px] leading-relaxed font-semibold text-ink-50">
                {report.recommendation.headline}
              </p>
              <p className="print-muted mt-1.5 text-[12px] text-ink-400">
                Follow-up: {report.recommendation.followUpInterval}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="grid h-14 w-14 place-items-center rounded-xl text-2xl font-bold text-ink-950"
                style={{ background: `var(--dr-${report.grade.level})` }}
              >
                {report.grade.level}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink-50">{spec.clinical}</p>
                <p className="print-muted mt-0.5 text-[11.5px] text-ink-400">
                  {report.grade.referable ? 'Referable' : 'Not referable'} · urgency{' '}
                  {report.grade.urgency}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Key numbers ---- */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReportStat
            label="ICDR grade"
            value={`L${report.grade.level}`}
            hint={spec.short}
          />
          <ReportStat
            label="Confidence"
            value={`${report.confidence.value}`}
            hint={`${report.confidence.band} band`}
          />
          <ReportStat
            label="Image quality"
            value={`${report.imageQuality.score}`}
            hint={`${report.imageQuality.verdict}${report.imageQuality.enhanced ? ' · enhanced' : ''}`}
          />
          <ReportStat
            label="Findings"
            value={`${report.evidence.totalLesions}`}
            hint={`overlap ${report.evidence.evidenceOverlapScore}/100`}
          />
        </section>

        {/* ---- Visual evidence ---- */}
        {image ? (
          <section className="print-keep mt-6">
            <ReportHeading>Visual evidence</ReportHeading>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <ImageViewer
                src={image}
                alt="Fundus photograph with detected findings marked"
                structures={structures}
                lesions={lesions}
                explainability={null}
                layers={{ anatomy: true, lesions: true, heatmap: false }}
                visibleClasses={new Set(LESION_CLASSES)}
              />
              <div>
                <p className="print-muted text-[11px] text-ink-500">
                  Anatomical landmarks and every located finding, marked by class. Shapes
                  differ per class so the overlay stays readable in print and greyscale.
                </p>
                <dl className="mt-3 space-y-1.5">
                  {present.length === 0 ? (
                    <p className="text-[12px] text-ink-300">No lesions located.</p>
                  ) : (
                    present.map((c) => (
                      <div key={c} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-[11.5px] text-ink-300">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0"
                            style={{
                              border: `1.5px solid ${LESION_TAXONOMY[c].colour}`,
                              background: `${LESION_TAXONOMY[c].colour}40`,
                              borderRadius:
                                c === 'microaneurysm' || c === 'haemorrhage' ? '999px' : '2px',
                            }}
                          />
                          {LESION_TAXONOMY[c].label}
                        </dt>
                        <dd className="tabular font-mono text-[12px] font-semibold text-ink-100">
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

        {/* ---- Findings ---- */}
        <section className="print-keep mt-6">
          <ReportHeading>Key findings</ReportHeading>
          <ul className="mt-2.5 space-y-1.5">
            {report.keyFindings.map((f) => (
              <li key={f} className="flex gap-2 text-[12px] leading-relaxed text-ink-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-500" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Recommendation ---- */}
        <section className="print-keep mt-6">
          <ReportHeading>Recommended action</ReportHeading>
          <ol className="mt-2.5 space-y-2">
            {report.recommendation.actions.map((a, i) => (
              <li key={a} className="flex gap-3 text-[12px] leading-relaxed text-ink-200">
                <span className="tabular mt-px font-mono text-[11px] font-semibold text-brand-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Limitations ---- */}
        <section className="print-keep mt-6">
          <ReportHeading>Limitations of this assessment</ReportHeading>
          <ul className="mt-2.5 space-y-1.5">
            {report.limitations.map((l) => (
              <li key={l} className="print-muted text-[11.5px] leading-relaxed text-ink-400">
                · {l}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Audit trail ---- */}
        <section className="print-keep mt-6">
          <ReportHeading>Processing audit trail</ReportHeading>
          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left">
              <thead>
                <tr className="border-b border-ink-800">
                  {['#', 'Stage', 'Method', 'Duration', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="print-muted pb-1.5 text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.auditTrail.map((t) => (
                  <tr key={t.id} className="border-b border-ink-850/70">
                    <td className="tabular py-1.5 font-mono text-[11px] text-ink-500">
                      {t.index}
                    </td>
                    <td className="py-1.5 text-[11.5px] text-ink-200">{t.title}</td>
                    <td className="print-muted py-1.5 text-[11px] text-ink-400 capitalize">
                      {t.provenance}
                      {t.engine ? ` · ${t.engine}` : ''}
                    </td>
                    <td className="tabular py-1.5 font-mono text-[11px] text-ink-400">
                      {formatDuration(t.durationMs)}
                    </td>
                    <td className="py-1.5 text-[11px]">
                      {t.degraded ? (
                        <span className="text-[#fab219]">degraded</span>
                      ) : (
                        <span className="text-ink-500">ok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Signature ---- */}
        <footer className="mt-7 border-t border-ink-800 pt-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="print-muted text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
                Reviewing ophthalmologist
              </p>
              <div className="mt-6 border-t border-ink-700 pt-1.5">
                <p className="print-muted text-[10.5px] text-ink-500">
                  Name, registration number, signature and date
                </p>
              </div>
            </div>
            <div>
              <p className="print-muted text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
                Declaration
              </p>
              <p className="print-muted mt-2 text-[10.5px] leading-relaxed text-ink-500">
                This report was produced by an automated decision-support system. It is not a
                diagnosis and does not replace a dilated fundus examination. Clinical
                responsibility for any action taken rests with the reviewing clinician.
                Generated {formatDateTime(report.generatedAt)}.
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
    <h2 className="border-b border-ink-800 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">
      {children}
    </h2>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="print-muted text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[12.5px] text-ink-100 capitalize">{value}</p>
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
    <div className="print-card rounded-lg border border-ink-800 bg-ink-900/50 px-3.5 py-3">
      <p className="print-muted text-[9.5px] font-semibold tracking-[0.1em] text-ink-500 uppercase">
        {label}
      </p>
      <p className="tabular mt-1.5 text-xl leading-none font-semibold text-ink-50">{value}</p>
      <p className="print-muted mt-1 text-[10.5px] text-ink-500 capitalize">{hint}</p>
    </div>
  );
}
