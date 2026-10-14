import Link from "next/link";
import HomeAuth from "./components/HomeAuth";
import { NavAuthLink } from "./components/nav-auth-link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 px-6 py-16 text-neutral-100 antialiased">
      {/* Ambient background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      {/* ============ TOP NAV ============ */}
      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
            L
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Lunora
          </span>
        </Link>

        <NavAuthLink />
      </header>

      {/* ============ HERO ============ */}
      <section className="flex w-full max-w-xl flex-col items-center text-center">
        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Now enrolling — Spring 2026
        </span>

        {/* Title */}
        <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          Master the SAT &amp; AP Chem
        </h1>

        {/* Subtitle */}
        <p className="mt-5 max-w-md text-balance text-base leading-relaxed text-neutral-400 sm:text-lg">
          Adaptive practice, worked solutions, and progress you can see — built
          step by step for real understanding.
        </p>

        {/* Auth */}
        <div className="mt-10 w-full">
          <HomeAuth />
        </div>

        {/* Footer note */}
        <p className="mt-8 text-xs text-neutral-500">
          Free to start · No credit card required
        </p>
      </section>
    </main>
  );
}