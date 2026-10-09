
"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";

export default function HomeAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="text-sm text-gray-500">
        Loading account...
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-gray-500">
          You are signed in.
        </p>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <Link
        href="/sign-in"
        className="rounded border px-4 py-2"
      >
        Sign in
      </Link>

      <Link
        href="/sign-up"
        className="rounded bg-black px-4 py-2 text-white"
      >
        Sign up
      </Link>
    </div>
  );
}