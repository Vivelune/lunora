import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-neutral-950 px-6 py-16 text-neutral-100 antialiased">
      {/* Ambient background glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      {/* Brand mark — links home */}
      <Link
        href="/"
        className="relative z-10 mb-10 flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[13px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
          L
        </span>
        <span className="text-base font-semibold tracking-tight">Lunora</span>
      </Link>

      {/* Heading */}
      <div className="relative z-10 mb-8 text-center">
        <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Welcome back
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          Sign in to continue your prep.
        </p>
      </div>

      {/* Clerk card wrapper */}
      <div className="relative z-10 w-full max-w-md">
        <div
          aria-hidden
          className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.02] blur-sm"
        />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
          <div className="rounded-[calc(1rem-2px)] bg-neutral-950/60 p-4">
            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-neutral-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
                  Loading sign-in…
                </div>
              }
            >
              <SignIn
              
                appearance={{
                  
                  variables: {
                    colorPrimary: "#8b5cf6",
                    colorBackground: "transparent",
                    colorNeutral: "#f5f5f5",
                    // Replace colorText with:
                    colorForeground: "#e5e5e5",
                    // Replace colorTextSecondary with:
                    colorMutedForeground: "#a3a3a3",
                    // Replace colorInputBackground + colorInputText with:
                    colorInput: "rgba(255,255,255,0.04)",
                    colorInputForeground: "#f5f5f5",
                    borderRadius: "0.75rem",
                    fontFamily: "inherit",
                  },
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none border-0 p-2",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton:
                      "border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08] transition-colors",
                    socialButtonsBlockButtonText: "text-neutral-200 font-medium",
                    dividerLine: "bg-white/10",
                    dividerText: "text-neutral-500 text-xs",
                    formFieldLabel: "text-neutral-300 text-sm font-medium",
                    formFieldInput:
                      "bg-white/[0.04] border border-white/10 text-neutral-100 placeholder:text-neutral-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20",
                    formButtonPrimary:
                      "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:opacity-90 transition-opacity",
                    footerActionText: "text-neutral-400",
                    footerActionLink:
                      "text-violet-300 hover:text-violet-200 font-medium",
                    identityPreviewText: "text-neutral-200",
                    identityPreviewEditButton: "text-violet-300 hover:text-violet-200",
                    formFieldInputShowPasswordButton: "text-neutral-400 hover:text-neutral-200",
                    otpCodeFieldInput:
                      "bg-white/[0.04] border border-white/10 text-neutral-100",
                    formResendCodeLink: "text-violet-300 hover:text-violet-200",
                    alertText: "text-neutral-300",
                    alert: "border border-white/10 bg-white/[0.04]",
                  },
                }}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-neutral-500">
        By continuing, you agree to Lunora&apos;s{" "}
        <Link href="#" className="text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="#" className="text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}