"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  onboardingSchema,
  GRADE_VALUES,
  GRADE_LABELS,
  type OnboardingInput,
} from "@/lib/validation/profile";
import { completeOnboarding } from "./actions";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 aria-[invalid=true]:border-rose-400/40 aria-[invalid=true]:focus:border-rose-400/60 aria-[invalid=true]:focus:ring-rose-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";
const errorBase =
  "mt-1.5 flex items-start gap-1.5 text-xs text-rose-300";

export function OnboardingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", gradeLevel: "" },
  });

  async function onSubmit(values: OnboardingInput) {
    setServerError(null);

    try {
      const result = await completeOnboarding(values);

      if (!result.ok) {
        setServerError(result.message);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            setError(field as keyof OnboardingInput, { message });
          }
        }
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setServerError(
        "Could not reach the server. Check your connection and try again."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      {/* ============ NAME ============ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelBase}>
            First name
          </label>
          <input
            id="firstName"
            className={inputBase}
            autoComplete="given-name"
            aria-invalid={!!errors.firstName}
            placeholder="Jane"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className={errorBase}>
              <ErrorIcon />
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className={labelBase}>
            Last name
          </label>
          <input
            id="lastName"
            className={inputBase}
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
            placeholder="Doe"
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className={errorBase}>
              <ErrorIcon />
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* ============ PHONE ============ */}
      <div>
        <label htmlFor="phone" className={labelBase}>
          Phone number
          <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
            with country code
          </span>
        </label>
        <input
          id="phone"
          type="tel"
          className={inputBase}
          placeholder="+14155552671"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
        {errors.phone && (
          <p className={errorBase}>
            <ErrorIcon />
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* ============ GRADE ============ */}
      <div>
        <label htmlFor="gradeLevel" className={labelBase}>
          Grade level
        </label>
        <select
  id="gradeLevel"
  className={inputBase}
  aria-invalid={!!errors.gradeLevel}
  {...register("gradeLevel")}
>
  <option value="" className="bg-neutral-900 text-neutral-400">
    Select…
  </option>
  {GRADE_VALUES.map((value) => (
    <option
      key={value}
      value={value}
      className="bg-neutral-900 text-neutral-100"
    >
      {GRADE_LABELS[value]}
    </option>
  ))}
</select>
        {errors.gradeLevel && (
          <p className={errorBase}>
            <ErrorIcon />
            {errors.gradeLevel.message}
          </p>
        )}
      </div>

      {/* ============ SERVER ERROR ============ */}
      {serverError && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <circle
              cx="8"
              cy="8"
              r="6.25"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>{serverError}</span>
        </p>
      )}

      {/* ============ SUBMIT ============ */}
      <div className="border-t border-white/10 pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </>
          ) : (
            <>
              Save and continue
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
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   ErrorIcon — small inline icon for field errors
   ============================================================ */
function ErrorIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className="mt-0.5 h-3 w-3 flex-shrink-0"
    >
      <circle
        cx="8"
        cy="8"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 5v3.5M8 11h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}