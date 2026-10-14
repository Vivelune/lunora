import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/auth";

async function AdminLayoutContent({ children }: { children: ReactNode }) {
  await requireAdmin();

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/[0.07] blur-[140px]" />
      </div>

      {/* ============ TOP NAV ============ */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5 sm:px-10">
          {/* Brand */}
          <Link
            href="/admin"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Lunora
            </span>
            <span className="ml-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
              Admin
            </span>
          </Link>

          {/* Account */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-0",
              },
            }}
          />
        </div>
      </header>

      {/* ============ PAGE CONTENT ============ */}
      <Suspense
        fallback={
          <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-6 py-16">
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400 shadow-[0_0_12px_2px_rgba(129,140,248,0.5)]" />
              Loading admin area…
            </div>
          </main>
        }
      >
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </Suspense>
    </div>
  );
}