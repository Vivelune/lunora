import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Exam Prep LMS</h1>
      <p className="text-lg text-gray-600">
        SAT and AP Chemistry preparation, built step by step.
      </p>

      {userId ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">Signed in as {userId}</p>
          <UserButton />
        </div>
      ) : (
        <div className="flex gap-4">
          <Link href="/sign-in" className="rounded border px-4 py-2">
            Sign in
          </Link>
          <Link href="/sign-up" className="rounded bg-black px-4 py-2 text-white">
            Sign up
          </Link>
        </div>
      )}
    </main>
  );
}