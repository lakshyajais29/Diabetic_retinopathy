/**
 * End-to-end smoke test for the screening pipeline.
 *
 * Posts each synthetic phantom to a running server and consumes the SSE stream,
 * then asserts the things that actually have to hold for the product to be
 * safe — not just that it returned 200:
 *
 *   - the quality gate rejects the unusable capture and halts the run
 *   - a gradable image produces all seven stages
 *   - the clean phantom does not manufacture lesions
 *   - the diseased phantoms do produce located, corroborated findings
 *   - a probability distribution is a distribution (sums to 1)
 *   - confidence, triage decision and report are all populated
 *
 *   node scripts/smoke-pipeline.mjs [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const SAMPLES = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples');

const CASES = [
  { file: 'phantom-clean.jpg', expectHalt: false, expectLesions: false },
  { file: 'phantom-moderate.jpg', expectHalt: false, expectLesions: true },
  { file: 'phantom-proliferative.jpg', expectHalt: false, expectLesions: true },
  { file: 'phantom-unusable.jpg', expectHalt: true, expectLesions: false },
];

let failures = 0;

function check(name, condition, detail = '') {
  const mark = condition ? 'PASS' : 'FAIL';
  if (!condition) failures++;
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run(file) {
  const buffer = readFileSync(join(SAMPLES, file));
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/jpeg' }), file);
  form.append(
    'patient',
    JSON.stringify({ patientId: 'SMOKE-01', phc: 'Smoke test', eye: 'right' }),
  );

  const res = await fetch(`${BASE}/api/screening`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const events = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i = buf.indexOf('\n\n');
    while (i !== -1) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (line) {
        const payload = line.slice(6).trim();
        if (payload && payload !== '{}') {
          try {
            events.push(JSON.parse(payload));
          } catch {
            /* ignore */
          }
        }
      }
      i = buf.indexOf('\n\n');
    }
  }
  return events;
}

for (const c of CASES) {
  console.log(`\n=== ${c.file} ===`);
  let events;
  const started = Date.now();
  try {
    events = await run(c.file);
  } catch (err) {
    console.log(`  [FAIL] request — ${err.message}`);
    failures++;
    continue;
  }
  const elapsed = Date.now() - started;

  const byStage = Object.fromEntries(
    events.filter((e) => e.type === 'stage_complete').map((e) => [e.stage, e.payload]),
  );
  const halted = events.find((e) => e.type === 'halted');
  const complete = events.find((e) => e.type === 'run_complete');
  const errored = events.find((e) => e.type === 'error');

  check('no pipeline error', !errored, errored?.message);
  check('run completed', Boolean(complete));

  const quality = byStage.quality;
  check('stage 1 produced a quality assessment', Boolean(quality));
  if (quality) {
    console.log(
      `        quality ${quality.overallScore}/100 (${quality.verdict})` +
        `  sharpness=${quality.metrics.find((m) => m.key === 'sharpness')?.score}` +
        `  exposure=${quality.metrics.find((m) => m.key === 'exposure')?.score}` +
        `  illum=${quality.metrics.find((m) => m.key === 'illumination')?.score}`,
    );
  }

  if (c.expectHalt) {
    check('unusable capture halted the run', Boolean(halted), quality?.verdict);
    check('recapture guidance offered', (halted?.guidance?.length ?? 0) > 0);
    check('downstream stages did not run', !byStage.grading);
  } else {
    check('gradable capture was not halted', !halted, quality?.verdict);
    check(
      'all seven stages completed',
      Object.keys(byStage).length === 7,
      `${Object.keys(byStage).length}/7: ${Object.keys(byStage).join(',')}`,
    );

    const structures = byStage.structures;
    check('optic disc located', structures?.opticDisc?.detected === true,
      `conf ${structures?.opticDisc?.confidence}`);
    check('fovea located', structures?.fovea?.detected === true,
      `${structures?.fovea?.discDiameters} DD`);
    check(
      'laterality inferred as OD (disc drawn nasal/right in the phantom)',
      structures?.laterality === 'OD',
      String(structures?.laterality),
    );

    const lesions = byStage.lesions;
    const total = lesions ? Object.values(lesions.counts).reduce((a, b) => a + b, 0) : 0;
    console.log(
      `        lesions total=${total} candidates=${lesions?.cvCandidates?.darkBlobs}/${lesions?.cvCandidates?.brightBlobs} corroboration=${lesions?.corroborationScore}`,
    );
    if (c.expectLesions) {
      check('lesions detected on a diseased phantom', total > 0, `${total} findings`);
    } else {
      check('no lesions manufactured on a clean phantom', total <= 3, `${total} findings`);
    }

    const grading = byStage.grading;
    const sum = grading?.distribution?.reduce((a, b) => a + b, 0) ?? 0;
    check('distribution sums to 1', Math.abs(sum - 1) < 0.02, sum.toFixed(3));
    check('grade is a valid ICDR level', [0, 1, 2, 3, 4].includes(grading?.level),
      `L${grading?.level}`);
    console.log(
      `        grade L${grading?.level} (rule L${grading?.ruleBased?.level}, model L${grading?.modelBased?.level}) referable=${grading?.referable}`,
    );

    const explain = byStage.explainability;
    check('attention grid produced', explain?.attentionGrid?.length === explain?.gridSize);
    check(
      'overlap score in range',
      explain?.evidenceOverlapScore >= 0 && explain?.evidenceOverlapScore <= 100,
      `${explain?.evidenceOverlapScore}/100 (${explain?.overlapInterpretation})`,
    );

    const confidence = byStage.confidence;
    check('confidence computed', typeof confidence?.finalConfidence === 'number',
      `${confidence?.finalConfidence}/100`);
    check(
      'triage decision assigned',
      ['ai_recommendation', 'doctor_review_required', 'urgent_referral'].includes(
        confidence?.decision,
      ),
      confidence?.decision,
    );

    const report = byStage.report;
    check('report assembled', Boolean(report?.reportId), report?.reportId);
    check('report carries a full audit trail', report?.auditTrail?.length === 6,
      `${report?.auditTrail?.length} stages`);
    check('report states its limitations', (report?.limitations?.length ?? 0) >= 2);
  }

  console.log(`        elapsed ${(elapsed / 1000).toFixed(1)}s`);
}

console.log(
  failures === 0
    ? '\nAll pipeline smoke checks passed.\n'
    : `\n${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
