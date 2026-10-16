import { Suspense, type ReactNode } from "react";
import { requireCompletedProfile } from "@/lib/auth";
import { StudentSidebar } from "./components/student-sidebar";

async function StudentLayoutContent({ children }: { children: ReactNode }) {
  await requireCompletedProfile();

  return <>{children}</>;
}

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/[0.07] blur-[140px]" />
      </div>

      {/* Sidebar — wrapped in Suspense so usePathname() streams in after prerender */}
      <Suspense fallback={<SidebarShell />}>
        <StudentSidebar />
      </Suspense>

      {/* Content column — offset by sidebar width on desktop, full width on mobile */}
      <div className="lg:pl-60">
        <Suspense
          fallback={
            <main className="flex min-h-screen items-center justify-center px-6 py-16">
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.5)]" />
                Loading your student area…
              </div>
            </main>
          }
        >
          <StudentLayoutContent>{children}</StudentLayoutContent>
        </Suspense>
      </div>
    </div>
  );
}

/* ============================================================
   SidebarShell — static placeholder that matches the sidebar's
   shape so nothing shifts while the client-side nav streams in.
   ============================================================ */
function SidebarShell() {
  return (
    <>
      {/* Desktop shell */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-neutral-950/70 backdrop-blur-xl lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
            L
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            Lunora
          </span>
        </div>

        {/* Nav placeholders */}
        <div className="flex-1 px-2 py-3">
          <div className="mb-1.5 h-3 w-12 animate-pulse rounded-full bg-white/[0.04] ml-3" />
          <div className="mb-3 space-y-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-white/[0.02]"
              />
            ))}
          </div>
          <div className="mb-1.5 h-3 w-16 animate-pulse rounded-full bg-white/[0.04] ml-3" />
          <div className="space-y-0.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-white/[0.02]"
              />
            ))}
          </div>
        </div>

        {/* Footer placeholder */}
        <div className="border-t border-white/5 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.04]" />
              <div className="h-2.5 w-24 animate-pulse rounded-full bg-white/[0.03]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile trigger — static placeholder, no interaction */}
      <button
        type="button"
        aria-label="Open navigation"
        disabled
        className="fixed left-4 top-3 z-40 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-neutral-950/80 text-neutral-500 backdrop-blur-xl lg:hidden"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path
            d="M3 5h10M3 8h10M3 11h10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </>
  );
}