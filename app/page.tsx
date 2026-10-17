// import type { Metadata } from "next";
// import Link from "next/link";
// import { cacheLife } from "next/cache";

// export const metadata: Metadata = {
//   title: "Vivelune — Learning and teaching, done differently",
//   description:
//     "Vivelune builds tools for learning and teaching. Lunora is available now. Vivelune Classroom is coming soon.",
// };

// async function getCurrentYear() {
//   "use cache";
//   cacheLife("max");
//   return new Date().getFullYear();
// }

// export default async function ViveluneHomePage() {
//   const year = await getCurrentYear();

//   return (
//     <main className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100 antialiased">
//       {/* Ambient background */}
//       <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
//         <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
//         <div className="absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
//         <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
//       </div>

//       {/* Grid overlay */}
//       <div
//         aria-hidden
//         className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
//       />

//       {/* ============ TOP NAV ============ */}
//       <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
//         <Link
//           href="/"
//           className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
//         >
//           <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
//             V
//           </span>
//           <span className="text-sm font-semibold tracking-tight">
//             Vivelune
//           </span>
//         </Link>

//         <Link
//           href="/lunora"
//           className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-200 backdrop-blur transition-colors hover:bg-white/[0.08] hover:text-white"
//         >
//           Visit Lunora
//           <svg
//             aria-hidden
//             viewBox="0 0 16 16"
//             fill="none"
//             className="h-3.5 w-3.5"
//           >
//             <path
//               d="M3 8h10m0 0-4-4m4 4-4 4"
//               stroke="currentColor"
//               strokeWidth="1.6"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             />
//           </svg>
//         </Link>
//       </header>

//       {/* ============ HERO ============ */}
//       <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
//         {/* Badge */}
//         <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
//           <span className="relative flex h-1.5 w-1.5">
//             <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
//             <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
//           </span>
//           Two products · One platform
//         </span>

//         {/* Headline */}
//         <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl">
//           Learning and teaching,
//           <br />
//           done differently
//         </h1>

//         {/* Subtitle */}
//         <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-neutral-400 sm:text-lg">
//           Vivelune builds tools for the future of education. Learn at your
//           own pace with Lunora, or teach one-to-one with Vivelune Classroom —
//           coming soon.
//         </p>

//         {/* Primary CTAs */}
//         <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
//           <Link
//             href="/lunora"
//             className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
//           >
//             Explore Lunora
//             <svg
//               aria-hidden
//               viewBox="0 0 16 16"
//               fill="none"
//               className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
//             >
//               <path
//                 d="M3 8h10m0 0-4-4m4 4-4 4"
//                 stroke="currentColor"
//                 strokeWidth="1.6"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//             </svg>
//           </Link>

//           <Link
//             href="#products"
//             className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-neutral-200 backdrop-blur transition-colors hover:bg-white/[0.08] hover:text-white"
//           >
//             See both products
//           </Link>
//         </div>
//       </section>

//       {/* ============ PRODUCTS ============ */}
//       <section
//         id="products"
//         className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-20 sm:px-10"
//       >
//         <div className="mb-8 text-center">
//           <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
//             Our products
//           </p>
//           <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
//             Pick where you want to start.
//           </h2>
//         </div>

//         <div className="grid gap-4 sm:grid-cols-2">
//           {/* Lunora */}
//           <Link
//             href="/lunora"
//             className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur transition-colors hover:border-white/25 hover:bg-white/[0.06]"
//           >
//             <span
//               aria-hidden
//               className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 opacity-15 blur-3xl transition-opacity group-hover:opacity-25"
//             />

//             <div className="flex items-start justify-between gap-3">
//               <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[13px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
//                 L
//               </span>

//               <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
//                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
//                 Available now
//               </span>
//             </div>

//             <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">
//               Lunora
//             </h3>
//             <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
//               Adaptive exam prep and structured lesson plans for students.
//               Built step by step for real understanding.
//             </p>

//             <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-violet-300 transition-colors group-hover:text-violet-200">
//               Explore Lunora
//               <svg
//                 aria-hidden
//                 viewBox="0 0 16 16"
//                 fill="none"
//                 className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
//               >
//                 <path
//                   d="M3 8h10m0 0-4-4m4 4-4 4"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//               </svg>
//             </div>
//           </Link>

//           {/* Vivelune Classroom — now a link */}
//           <Link
//             href="/vivelune"
//             className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-left backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.04]"
//           >
//             <span
//               aria-hidden
//               className="absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 opacity-10 blur-3xl transition-opacity group-hover:opacity-20"
//             />

//             <div className="flex items-start justify-between gap-3">
//               <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-[13px] font-bold text-neutral-400 transition-colors group-hover:border-amber-400/30 group-hover:bg-amber-500/10 group-hover:text-amber-300">
//                 V
//               </span>

//               <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
//                 <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
//                 Coming soon
//               </span>
//             </div>

//             <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">
//               Vivelune Classroom
//             </h3>
//             <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
//               A one-to-one classroom platform for tutors and students. Live
//               sessions, shared whiteboards, and session recordings.
//             </p>

//             <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-amber-300 transition-colors group-hover:text-amber-200">
//               Learn more
//               <svg
//                 aria-hidden
//                 viewBox="0 0 16 16"
//                 fill="none"
//                 className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
//               >
//                 <path
//                   d="M3 8h10m0 0-4-4m4 4-4 4"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//               </svg>
//             </div>
//           </Link>
//         </div>
//       </section>

//       {/* ============ FOOTER ============ */}
//       <footer className="relative z-10 border-t border-white/5 px-6 py-6 sm:px-10">
//         <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-neutral-500 sm:flex-row">
//           <span>
//             © {year} Vivelune. Lunora is a Vivelune product.
//           </span>
//           <div className="flex items-center gap-5">
//             <Link
//               href="/vivelune"
//               className="transition-colors hover:text-neutral-300"
//             >
//               Classroom
//             </Link>
//             <Link
//               href="/lunora"
//               className="transition-colors hover:text-neutral-300"
//             >
//               Lunora
//             </Link>
//             <Link
//               href="/sign-in"
//               className="transition-colors hover:text-neutral-300"
//             >
//               Sign in
//             </Link>
//           </div>
//         </div>
//       </footer>
//     </main>
//   );
// }

// app/lunora/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import HomeAuth from "@/app/components/HomeAuth";
import { NavAuthLink } from "@/app/components/nav-auth-link";

export const metadata: Metadata = {
  title: "Lunora — Master any subject, one step at a time",
  description:
    "Lunora is an adaptive learning platform for every student and every subject — guided lessons, real-time progress, and feedback that actually helps.",
};

export default function LunoraHomePage() {
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

      {/* ============ TOP NAV ============ */}
      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/lunora"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 via-violet-400 to-fuchsia-400 text-[12px] font-bold text-neutral-950 shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)]">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Lunora
            </span>
          </Link>

          <span className="hidden h-4 w-px bg-white/10 sm:block" />

          <Link
            href="/"
            className="hidden text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 transition-colors hover:text-neutral-300 sm:block"
          >
            Vivelune
          </Link>
        </div>

        <NavAuthLink />
      </header>

      {/* ============ HERO ============ */}
      <section className="flex w-full max-w-2xl flex-col items-center text-center">
        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-neutral-300 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Now enrolling — Spring 2026
        </span>

        {/* Title */}
        <h1 className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          Master any subject,
          <br />
          one step at a time
        </h1>

        {/* Subtitle */}
        <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-neutral-400 sm:text-lg">
          Lunora is an adaptive learning platform for every student and every
          subject — guided lessons, real-time progress, and feedback that
          actually helps.
        </p>

        {/* Auth */}
        <div className="mt-10 w-full">
          <HomeAuth />
        </div>

        {/* Footer note */}
        <p className="mt-8 text-xs text-neutral-500">
          Free to start · No credit card required · Cancel anytime
        </p>

        {/* ============ SUBJECT STRIP ============ */}
        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Built for every subject
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              "SAT",
              "AP Chemistry",
              "AP Biology",
              "Algebra",
              "Physics",
              "English",
              "History",
              "More coming",
            ].map((tag) => {
              const isComing = tag === "More coming";
              return (
                <span
                  key={tag}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
                    isComing
                      ? "border-dashed border-white/15 bg-white/[0.02] text-neutral-500"
                      : "border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {tag}
                </span>
              );
            })}
          </div>

          <p className="mt-2 max-w-md text-xs text-neutral-500">
            Currently enrolling for SAT and AP Chemistry. More subjects added
            every term.
          </p>
        </div>
      </section>
    </main>
  );
}