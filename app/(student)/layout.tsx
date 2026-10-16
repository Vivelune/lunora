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

      {/* Sidebar */}
      <StudentSidebar />

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