import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingForm } from "../onboarding/onboarding-form";

export default async function OnboardingContent() {
  const { profile } = await getCurrentProfile();

  if (profile?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 px-6 py-16 text-neutral-100 antialiased">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/[0.07] blur-[140px]" />
      </div>

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      {/* ============ STEP INDICATOR ============ */}
      <div className="relative z-10 mb-8 flex items-center gap-2">
        <span className="h-1.5 w-6 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
      </div>

      {/* ============ HEADER ============ */}
      <div className="relative z-10 mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Getting started
        </p>

        <h1 className="mt-3 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Complete your profile
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
          We need a few details before you can start. This takes about a minute.
        </p>
      </div>

      {/* ============ FORM CARD ============ */}
      <div className="relative z-10 w-full max-w-md">
        <div
          aria-hidden
          className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.02] blur-sm"
        />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
          <OnboardingForm />
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <p className="relative z-10 mt-8 text-xs text-neutral-500">
        Your information is only used to personalize your learning.
      </p>
    </main>
  );
}