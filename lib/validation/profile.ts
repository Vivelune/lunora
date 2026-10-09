import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export const GRADE_VALUES = ["9", "10", "11", "12", "other"] as const;

export const GRADE_LABELS: Record<(typeof GRADE_VALUES)[number], string> = {
  "9": "Grade 9",
  "10": "Grade 10",
  "11": "Grade 11",
  "12": "Grade 12",
  other: "Other / not currently in school",
};

export const onboardingSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name is too long"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(
      (value) => value.startsWith("+"),
      "Include the country code, starting with + (example: +14155552671)"
    )
    .refine(
      (value) => parsePhoneNumberFromString(value)?.isValid() ?? false,
      "Enter a valid phone number"
    ),
  gradeLevel: z
    .string()
    .refine(
      (value) => (GRADE_VALUES as readonly string[]).includes(value),
      "Select your grade level"
    ),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Converts a validated phone number to E.164 format (+14155552671). */
export function normalizePhone(value: string): string | null {
  const parsed = parsePhoneNumberFromString(value);
  return parsed?.isValid() ? parsed.number : null;
}