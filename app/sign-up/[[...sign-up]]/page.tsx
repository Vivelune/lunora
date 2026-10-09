import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense
        fallback={
          <p className="text-sm text-gray-500">
            Loading sign-up...
          </p>
        }
      >
         <SignUp />
      </Suspense>
     
    </main>
  );
}