import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireCompletedProfile } from "@/lib/auth";

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

      {/* ============ TOP NAV ============ */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5 sm:px-10">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Lunora
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink href="/plans" label="Plans" />
            <NavLink href="/subjects" label="Subjects" />
          </nav>

          {/* Account */}
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-0",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* ============ PAGE CONTENT ============ */}
      <Suspense
        fallback={
          <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-6 py-16">
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
  );
}

/* ============================================================
   NavLink — simple nav item, no logic dependencies
   ============================================================ */
function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3.5 py-1.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white"
    >
      {label}
    </Link>
  );
}