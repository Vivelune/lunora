
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense
        fallback={
          <p className="text-sm text-gray-500">
            Loading sign-in...
          </p>
        }
      >
        <SignIn />
      </Suspense>
    </main>
  );
}