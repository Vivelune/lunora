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
      setServerError("Could not reach the server. Check your connection and try again.");
    }
  }

  const inputClass = "w-full rounded border px-3 py-2";
  const errorClass = "mt-1 text-sm text-red-600";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
          First name
        </label>
        <input
          id="firstName"
          className={inputClass}
          autoComplete="given-name"
          aria-invalid={!!errors.firstName}
          {...register("firstName")}
        />
        {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
      </div>

      <div>
        <label htmlFor="lastName" className="mb-1 block text-sm font-medium">
          Last name
        </label>
        <input
          id="lastName"
          className={inputClass}
          autoComplete="family-name"
          aria-invalid={!!errors.lastName}
          {...register("lastName")}
        />
        {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Phone number (with country code)
        </label>
        <input
          id="phone"
          type="tel"
          className={inputClass}
          placeholder="+14155552671"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
        {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="gradeLevel" className="mb-1 block text-sm font-medium">
          Grade level
        </label>
        <select
          id="gradeLevel"
          className={inputClass}
          aria-invalid={!!errors.gradeLevel}
          {...register("gradeLevel")}
        >
          <option value="">Select...</option>
          {GRADE_VALUES.map((value) => (
            <option key={value} value={value}>
              {GRADE_LABELS[value]}
            </option>
          ))}
        </select>
        {errors.gradeLevel && <p className={errorClass}>{errors.gradeLevel.message}</p>}
      </div>

      {serverError && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save and continue"}
      </button>
    </form>
  );
}