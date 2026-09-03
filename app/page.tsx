import Link from 'next/link';
import {
  ArrowRight,
  Activity,
  BarChart3,
  Eye,
  Layers,
  ScanEye,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { RetinaSchematic } from '@/components/landing/RetinaSchematic';
import { STAGES, DR_SCALE, DR_LEVELS } from '@/lib/pipeline/constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-ink-900">
      <SiteNav />
      <Hero />
      <ProblemSection />
      <PipelineSection />
      <ScaleSection />
      <TrustSection />
      <ClosingSection />
      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Wordmark({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white shadow-sm">
        <ScanEye className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={
            tone === 'dark'
              ? 'text-[15px] font-semibold tracking-tight text-ink-900'
              : 'text-[15px] font-semibold tracking-tight text-white'
          }
        >
          RetinaSetu
        </span>
        <span
          className={
            tone === 'dark'
              ? 'mt-0.5 text-[10px] font-medium tracking-[0.12em] text-ink-500 uppercase'
              : 'mt-0.5 text-[10px] font-medium tracking-[0.12em] text-ink-400 uppercase'
          }
        >
          DR Screening Platform
        </span>
      </span>
    </span>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/70 bg-[#f6f8fa]/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Wordmark />
        <div className="hidden items-center gap-8 md:flex">
          <a href="#problem" className="text-[13px] font-medium text-ink-600 hover:text-ink-900">
            The problem
          </a>
          <a href="#pipeline" className="text-[13px] font-medium text-ink-600 hover:text-ink-900">
            How it works
          </a>
          <a href="#scale" className="text-[13px] font-medium text-ink-600 hover:text-ink-900">
            District scale
          </a>
          <a href="#safety" className="text-[13px] font-medium text-ink-600 hover:text-ink-900">
            Safety
          </a>
        </div>
        <Link
          href="/screening"
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-800"
        >
          Open workspace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink-200/70">
      <div className="bg-grid-light absolute inset-0 opacity-60" aria-hidden />
      <div
        className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full bg-brand-200/40 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-600/25 bg-brand-50 px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-brand-800 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden />
            Clinical decision support
          </p>

          <h1 className="font-display mt-6 text-[2.75rem] leading-[1.08] text-ink-950 sm:text-6xl">
            A fundus photograph at the village clinic.
            <br />
            <span className="text-brand-700">A graded, evidenced answer</span> before
            the patient stands up.
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-600">
            Diabetic retinopathy blinds people who could have been treated — not because
            the disease is hard to see, but because there is nobody to look. RetinaSetu
            puts a seven-stage reading pipeline at the Primary Health Centre: it checks the
            photograph is usable, finds the anatomy, counts the lesions, grades severity on
            the ICDR scale, shows its evidence, and routes anything it is not certain about
            to a doctor.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/screening"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-800"
            >
              Start a screening
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/district"
              className="inline-flex items-center gap-2 rounded-xl border border-ink-300 bg-white px-5 py-3 text-sm font-semibold text-ink-800 transition hover:border-ink-400 hover:bg-ink-50"
            >
              <BarChart3 className="h-4 w-4" aria-hidden />
              District-scale model
            </Link>
          </div>

          <p className="mt-6 max-w-lg text-[12px] leading-relaxed text-ink-500">
            Decision support for a trained screener — not a diagnosis, and not a substitute
            for an ophthalmologist. Every output states its own confidence and its own
            limitations.
          </p>
        </div>

        <div className="animate-fade-up relative" style={{ animationDelay: '120ms' }}>
          <div className="rounded-2xl border border-ink-800 bg-ink-950 p-3 shadow-lift">
            <div className="flex items-center justify-between px-2 pt-1 pb-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-ink-500 uppercase">
                Reading workspace · OD
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-brand-300">
                <span className="animate-pulse-ring h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
                STAGE 3/7
              </span>
            </div>
            <div className="overflow-hidden rounded-xl bg-black">
              <RetinaSchematic className="h-auto w-full" />
            </div>
            <div className="grid grid-cols-3 gap-2 px-1 pt-3 pb-1">
              <MiniStat label="Quality" value="82" suffix="/100" />
              <MiniStat label="Lesions" value="10" suffix="found" />
              <MiniStat label="Grade" value="2" suffix="ICDR" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900/70 px-3 py-2">
      <p className="text-[9px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{label}</p>
      <p className="tabular mt-1 text-lg leading-none font-semibold text-ink-50">
        {value}
        <span className="ml-1 text-[10px] font-medium text-ink-500">{suffix}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProblemSection() {
  const facts = [
    {
      figure: '1 in 3',
      caption: 'people living with diabetes develop some degree of retinopathy',
      detail:
        'India has one of the largest diabetic populations in the world, and the majority of it lives outside the districts where eye specialists practise.',
    },
    {
      figure: 'Asymptomatic',
      caption: 'until sight is already being lost',
      detail:
        'Retinopathy causes no pain and no early visual symptoms. By the time a patient notices, the damage that has occurred is largely irreversible.',
    },
    {
      figure: 'Preventable',
      caption: 'in the large majority of cases, if caught in time',
      detail:
        'Timely laser treatment or anti-VEGF therapy prevents most severe visual loss. The bottleneck is detection, not treatment.',
    },
  ];

  return (
    <section id="problem" className="border-b border-ink-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <SectionEyebrow>The problem</SectionEyebrow>
          <h2 className="font-display mt-4 text-4xl leading-tight text-ink-950">
            The disease is visible. The person who can see it is four hours away.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
            Diagnosing diabetic retinopathy needs one thing: somebody trained to read a
            photograph of the back of the eye. A Primary Health Centre can take that
            photograph today — fundus cameras are cheap and a health worker can be trained
            in an afternoon. What a rural district does not have is the ophthalmologist to
            read the tens of thousands of images that follow.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {facts.map((f) => (
            <div
              key={f.figure}
              className="rounded-xl border border-ink-200 bg-[#fbfcfd] p-6 transition hover:border-brand-600/30"
            >
              <p className="font-display text-3xl text-brand-800">{f.figure}</p>
              <p className="mt-2 text-[13px] font-semibold text-ink-800">{f.caption}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-600">{f.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-ink-200 bg-[#fbfcfd] p-7">
          <h3 className="text-sm font-semibold text-ink-900">
            What a screening system actually has to get right
          </h3>
          <div className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {[
              'Cope with real field images — blurred, badly lit, half-framed — instead of assuming lab-quality photographs.',
              'Find the specific lesions that define the disease, not just emit a severity number.',
              'Grade on the scale clinicians already use, so the output slots into existing referral pathways.',
              'Show its evidence, because a grade nobody can check is a grade nobody will act on.',
              'Know when it is out of its depth and say so, rather than guessing confidently.',
              'Reduce specialist workload rather than adding to it, or the district cannot deploy it.',
            ].map((item) => (
              <div key={item} className="flex gap-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                  aria-hidden
                />
                <p className="text-[13px] leading-relaxed text-ink-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const STAGE_ICONS = [Eye, Layers, ScanEye, Activity, BarChart3, UserCheck, Stethoscope];

function PipelineSection() {
  return (
    <section id="pipeline" className="border-b border-ink-200/70 bg-[#f6f8fa]">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="font-display mt-4 text-4xl leading-tight text-ink-950">
            Seven stages, each one visible, each one answerable.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
            A clinician does not look at a retina and produce a number. They check the
            photograph is readable, orient themselves on the disc and macula, hunt for
            lesions, weigh what they found against a published scale, and decide whether
            they are sure. RetinaSetu is built the same way — as seven separate stages with
            typed inputs and structured outputs, so each one can be inspected, audited, and
            later replaced by a purpose-trained model without disturbing the rest.
          </p>
        </div>

        <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, i) => {
            const Icon = STAGE_ICONS[i] ?? Eye;
            return (
              <li
                key={stage.id}
                className="group relative flex flex-col rounded-xl border border-ink-200 bg-white p-5 transition hover:border-brand-600/40 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-ink-400">
                    STAGE {stage.index}
                  </span>
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-ink-900">{stage.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
                  {stage.subtitle}
                </p>
                <p className="mt-3 border-t border-ink-200/80 pt-3 text-[12px] leading-relaxed text-ink-600 italic">
                  “{stage.question}”
                </p>
              </li>
            );
          })}
          <li className="flex flex-col justify-center rounded-xl border border-dashed border-brand-600/40 bg-brand-50/50 p-5">
            <p className="text-[13px] leading-relaxed font-medium text-brand-900">
              Every stage streams to the screen as it completes, so a reviewer watches the
              reasoning arrive in order rather than receiving a verdict from nowhere.
            </p>
            <Link
              href="/screening"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-800 hover:text-brand-900"
            >
              Watch it run
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        </ol>

        <div className="mt-12 overflow-hidden rounded-xl border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-ink-900">
              The output: ICDR severity, the scale district ophthalmology already runs on
            </h3>
          </div>
          <div className="grid divide-ink-200 sm:grid-cols-5 sm:divide-x">
            {DR_LEVELS.map((level) => {
              const spec = DR_SCALE[level];
              return (
                <div key={level} className="border-b border-ink-200 p-5 last:border-b-0 sm:border-b-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-6 w-6 place-items-center rounded-md font-mono text-[12px] font-bold text-white"
                      style={{ background: `var(--dr-${level})` }}
                      aria-hidden
                    >
                      {level}
                    </span>
                    <span className="text-[12px] font-semibold text-ink-900">{spec.short}</span>
                  </div>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-600">{spec.meaning}</p>
                  <p
                    className={
                      spec.referable
                        ? 'mt-3 text-[11px] font-semibold text-[#b0532a]'
                        : 'mt-3 text-[11px] font-semibold text-ink-500'
                    }
                  >
                    {spec.referable ? 'Referable — needs an ophthalmologist' : 'Routine re-screening'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ScaleSection() {
  return (
    <section id="scale" className="border-b border-ink-800 bg-ink-950">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionEyebrow tone="light">Built for a district, not a demo</SectionEyebrow>
            <h2 className="font-display mt-4 text-4xl leading-tight text-white">
              One image is a science project. Fifty PHCs is a health system.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-300">
              A screening programme fails the moment it generates more referrals than the
              district can read. RetinaSetu ships with an operational model of the thing it
              is actually part of: arrivals from every PHC, ophthalmologist reading capacity,
              the queue between them, and what happens to waiting times when the AI clears
              the confident cases and escalates the rest.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
              Change the number of specialists, the screening uptake, or the auto-clear rate,
              and watch the backlog either stabilise or run away. Every assumption is a named,
              adjustable input — nothing is buried.
            </p>
            <Link
              href="/district"
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-5 py-3 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20"
            >
              <BarChart3 className="h-4 w-4" aria-hidden />
              Open the district model
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'PHCs modelled', value: '52', hint: 'each a capture point' },
              { label: 'Patients / year', value: '49k', hint: 'at 45% uptake' },
              { label: 'Images / year', value: '98k', hint: 'two eyes per patient' },
              { label: 'Ophthalmologists', value: '3', hint: 'sharing screening reads' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-ink-800 bg-panel p-5">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">
                  {s.label}
                </p>
                <p className="tabular mt-2 text-3xl leading-none font-semibold text-white">
                  {s.value}
                </p>
                <p className="mt-2 text-[11px] text-ink-500">{s.hint}</p>
              </div>
            ))}
            <div className="col-span-2 rounded-xl border border-brand-600/30 bg-brand-950/40 p-5">
              <p className="text-[12px] leading-relaxed text-brand-100">
                In the default district, manual-only reading needs roughly{' '}
                <span className="font-semibold">4.5×</span> the specialist hours available.
                With AI triage clearing the confident cases, the same three ophthalmologists
                move from an unbounded backlog to a queue that clears.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function TrustSection() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'The system is allowed to be unsure',
      body: 'Confidence is fused from five independent signals — image quality, how decisively the grade was won, evidence alignment, agreement between two detectors, and anatomical certainty. Each is shown with its own weight. Below threshold, the case goes to a human.',
    },
    {
      icon: UserCheck,
      title: 'Safety rules outrank the score',
      body: 'Suspected proliferative disease, a two-level disagreement between the rule engine and the model, or attention that lands where no lesion was found — any one of these routes the case to a doctor no matter how confident the number looks.',
    },
    {
      icon: Layers,
      title: 'Two independent opinions, never merged silently',
      body: 'A transparent ICDR rule engine grades the lesion counts. A vision model grades the image. Where they disagree, the report says so and the disagreement raises the referral, rather than being averaged into a comfortable middle.',
    },
    {
      icon: Activity,
      title: 'Evidence you can point at',
      body: 'Every grade carries located, counted, colour- and shape-coded findings, an attention map, and an overlap score measuring how far the two are apart. A grade with no locatable evidence behind it is flagged, not published.',
    },
  ];

  return (
    <section id="safety" className="border-b border-ink-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <SectionEyebrow>Safety &amp; trust</SectionEyebrow>
          <h2 className="font-display mt-4 text-4xl leading-tight text-ink-950">
            The point is not to replace the ophthalmologist. It is to find the patients who
            need one.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
            A screening tool that is confidently wrong is worse than no screening tool at
            all — it manufactures false reassurance at scale. So the design assumption here
            is that the system will sometimes be wrong, and every mechanism exists to make
            that visible and survivable.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-xl border border-ink-200 bg-[#fbfcfd] p-6">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-white">
                <p.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <h3 className="mt-4 text-[14px] font-semibold text-ink-900">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ClosingSection() {
  return (
    <section className="bg-[#f6f8fa]">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl leading-tight text-ink-950 sm:text-5xl">
          Upload a fundus photograph and watch it reason.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          The workspace simulates a PHC capture: enter the patient encounter, upload the
          image, and follow all seven stages as they run — quality gate, anatomy, lesions,
          grade, evidence, confidence, and the report that comes out the other end.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/screening"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-800"
          >
            Start a screening
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 rounded-xl border border-ink-300 bg-white px-6 py-3.5 text-sm font-semibold text-ink-800 transition hover:border-ink-400"
          >
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="max-w-xl text-[11px] leading-relaxed text-ink-500">
          RetinaSetu is a clinical decision-support prototype built for Smart India
          Hackathon. It is not a medical device, has not been clinically validated, and must
          not be used to make treatment decisions. Fundus images are processed for the
          duration of a screening run and are not retained.
        </p>
      </div>
    </footer>
  );
}

function SectionEyebrow({
  children,
  tone = 'dark',
}: {
  children: React.ReactNode;
  tone?: 'dark' | 'light';
}) {
  return (
    <p
      className={
        tone === 'dark'
          ? 'text-[11px] font-semibold tracking-[0.16em] text-brand-700 uppercase'
          : 'text-[11px] font-semibold tracking-[0.16em] text-brand-300 uppercase'
      }
    >
      {children}
    </p>
  );
}
