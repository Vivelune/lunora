import { Suspense } from "react";
import OnboardingContent from "@/app/components/OnboardingContent";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingSkeleton() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 px-6 py-16">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="flex items-center gap-3 text-sm text-neutral-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.5)]" />
        Loading your profile…
      </div>
    </main>
  );
}