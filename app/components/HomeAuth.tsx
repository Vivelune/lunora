"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";

export default function HomeAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400 shadow-[0_0_12px_2px_rgba(56,189,248,0.6)]" />
        <span className="text-sm font-medium tracking-wide text-neutral-400">
          Loading account…
        </span>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm font-medium tracking-wide text-neutral-300">
          Welcome back — you&apos;re signed in.
        </p>
        <div className="relative">
          <div className="absolute -inset-1 -z-10 rounded-full bg-sky-500/30 blur-md" />
          <div className="rounded-full border border-white/15 bg-white/5 p-0.5 backdrop-blur">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10 ring-0",
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      {/* Sign in — ghost pill */}
      <Link
        href="/sign-in"
        className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/85 backdrop-blur-xl transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.08] hover:text-white sm:w-auto"
      >
        Sign in
      </Link>

      {/* Sign up — solid CTA */}
      <Link
        href="/sign-up"
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors duration-200 hover:bg-neutral-200 sm:w-auto"
      >
        Sign up
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <path
            d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}