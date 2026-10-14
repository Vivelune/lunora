"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const baseClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-200 backdrop-blur transition-colors hover:bg-white/[0.08] hover:text-white";

export function NavAuthLink() {
  const { isLoaded, isSignedIn } = useAuth();

  // Avoid layout shift while Clerk resolves — render an invisible placeholder
  // that matches the button's dimensions.
  if (!isLoaded) {
    return (
      <span
        aria-hidden
        className="inline-flex h-9 w-[88px] items-center justify-center rounded-full border border-white/5 bg-white/[0.02]"
      />
    );
  }

  if (isSignedIn) {
    return (
      <Link href="/dashboard" className={baseClass}>
        Dashboard
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
    );
  }

  return (
    <Link href="/sign-in" className={baseClass}>
      Sign in
    </Link>
  );
}