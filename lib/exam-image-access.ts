import "server-only";

/**
 * Phase 9: deny by default. Phase 11 replaces this with a check that the student
 * has an in-progress attempt on an exam version containing a question that uses
 * this image. Keep every "may this student see this image?" decision here.
 */
export async function studentCanViewExamImage(
  studentProfileId: string,
  assetId: string
): Promise<boolean> {
  void studentProfileId;
  void assetId;
  return false;
}