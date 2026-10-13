/** The one rule for comparing short answers. Phase 12 grading will reuse it. */
export function normalizeAnswer(value: string): string {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  }