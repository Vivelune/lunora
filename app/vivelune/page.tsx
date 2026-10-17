import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";

export const metadata: Metadata = {
  title: "Vivelune Classroom — One-to-one teaching, done right",
  description:
    "Vivelune Classroom is a live one-to-one teaching platform for tutors and students. Shared whiteboards, session recordings, and real-time collaboration. Coming soon.",
};

async function getCurrentYear() {
  "use cache";
  cacheLife("max");
  return new Date().getFullYear();
}

export default async function ViveluneClassroomPage() {
  const year = await getCurrentYear();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100 antialiased">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      {/* ============ TOP NAV ============ */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
              V
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Vivelune
            </span>
          </Link>

          <span className="hidden h-4 w-px bg-white/10 sm:block" />

          <span className="hidden text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 sm:block">
            Classroom
          </span>
        </div>

        <Link
          href="/lunora"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-200 backdrop-blur transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          Visit Lunora
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="h-3.5 w-3.5"
          >
            <path
              d="M3 8h10m0 0-4-4m4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          Coming soon
        </span>

        {/* Headline */}
        <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl">
          Teach one-to-one,
          <br />
          without the friction
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-neutral-400 sm:text-lg">
          Vivelune Classroom is a live teaching platform built for tutors and
          students. Shared whiteboards, real-time collaboration, and every
          session recorded — so no idea gets lost.
        </p>

        {/* Primary CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/lunora"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
          >
            Explore Lunora meanwhile
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path
                d="M3 8h10m0 0-4-4m4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <a
            href="#preview"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-neutral-200 backdrop-blur transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            See what&apos;s coming
          </a>
        </div>
      </section>

      {/* ============ WHAT'S COMING ============ */}
      <section
        id="preview"
        className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-20 sm:px-10"
      >
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            What&apos;s coming
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Built for the way tutoring actually works.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
            Every feature is designed around a real tutor-student session,
            not a hypothetical one.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Live sessions",
              body: "Low-latency video and audio in the browser. No downloads, no plugins, no setup for students.",
              icon: LiveIcon,
            },
            {
              title: "Shared whiteboard",
              body: "Both sides can write, draw, and annotate at the same time. Infinite canvas, exportable to PDF.",
              icon: BoardIcon,
            },
            {
              title: "Session recordings",
              body: "Every session automatically recorded and available to the student afterwards — with timestamps.",
              icon: RecordIcon,
            },
            {
              title: "Shared files",
              body: "Drop in worksheets, past papers, and notes. Both sides see the same document, edits sync instantly.",
              icon: FileIcon,
            },
            {
              title: "Progress tracking",
              body: "Log what was covered in each session. See what clicked and what needs another look.",
              icon: ChartIcon,
            },
            {
              title: "Scheduling",
              body: "Tutors set availability, students book sessions. Reminders sent to both sides automatically.",
              icon: CalendarIcon,
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300 transition-colors group-hover:border-violet-400/30 group-hover:bg-violet-500/10 group-hover:text-violet-200">
                  <Icon />
                </span>

                <h3 className="mt-4 text-sm font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                  {feature.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============ FOR TUTORS / STUDENTS ============ */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-20 sm:px-10">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Two sides, one platform
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Whatever role you play.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* For tutors */}
          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <span
              aria-hidden
              className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 opacity-15 blur-3xl"
            />

            <p className="text-xs font-medium uppercase tracking-[0.16em] text-indigo-300">
              For tutors
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Teach without the overhead
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              No more juggling Zoom links, Google Docs, and WhatsApp threads.
              One platform, one session, everything saved.
            </p>

            <ul className="mt-5 flex flex-col gap-2 text-sm text-neutral-300">
              {[
                "Set your availability and rate",
                "Host sessions from the browser",
                "Recordings auto-generated",
                "Notes and progress logs",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* For students */}
          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <span
              aria-hidden
              className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 opacity-15 blur-3xl"
            />

            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              For students
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Learn from anyone, anywhere
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Book a session with a tutor who knows your subject. Show up,
              ask questions, and walk away with a recording and notes.
            </p>

            <ul className="mt-5 flex flex-col gap-2 text-sm text-neutral-300">
              {[
                "Browse tutors by subject",
                "Book and reschedule easily",
                "Rewatch every session",
                "Track what you've covered",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-emerald-400/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24 text-center sm:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Vivelune Classroom is on the way.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
            In the meantime, Lunora is fully available — adaptive exam prep
            for every subject.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/lunora"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
            >
              Try Lunora now
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M3 8h10m0 0-4-4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-6 sm:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-neutral-500 sm:flex-row">
          <span>© {year} Vivelune. Lunora is a Vivelune product.</span>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="transition-colors hover:text-neutral-300"
            >
              Vivelune
            </Link>
            <Link
              href="/lunora"
              className="transition-colors hover:text-neutral-300"
            >
              Lunora
            </Link>
            <Link
              href="/sign-in"
              className="transition-colors hover:text-neutral-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ============================================================
   Feature icons — inline, no library
   ============================================================ */
function LiveIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect
        x="2.5"
        y="4.5"
        width="8"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.5 7 13.5 5.5v5L10.5 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 13.5h6M5 8l2-2 2 2 2-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M4 2.5h5L12 5.5v8H4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9 2.5V5.5h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <path
        d="M2.5 13.5h11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.5 13.5V9M7.5 13.5V5M10.5 13.5V7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}