import prisma  from "@/lib/prisma";
import { moveStudentsToLatest } from "../../assignments/manage-actions";

export async function OlderVersions({ planId }: { planId: string }) {
  const latest = await prisma.lessonPlanVersion.findFirst({
    where: { planId, publishedAt: { not: null } },
    orderBy: { versionNumber: "desc" },
    select: { id: true, versionNumber: true },
  });
  if (!latest) {
    return null;
  }

  const behind = await prisma.lessonPlanAssignment.findMany({
    where: { planId, status: "ACTIVE", completedAt: null, NOT: { versionId: latest.id } },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    select: {
      id: true,
      version: { select: { versionNumber: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="text-lg font-semibold">Students on older versions</h2>

      {behind.length === 0 ? (
        <p className="text-sm text-gray-600">
          Everyone with unfinished work is on version {latest.versionNumber}, the latest published version.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {behind.length} student{behind.length === 1 ? " is" : "s are"} still on an older version with unfinished
            work. Completed assignments are never moved.
          </p>
          <ul className="list-disc pl-6 text-sm">
            {behind.slice(0, 20).map((a) => (
              <li key={a.id}>
                {a.student.lastName}, {a.student.firstName} (on v{a.version.versionNumber})
              </li>
            ))}
            {behind.length > 20 && <li>and {behind.length - 20} more</li>}
          </ul>
          <form action={moveStudentsToLatest} className="flex flex-col gap-3">
            <input type="hidden" name="planId" value={planId} />
            <input type="hidden" name="expectedCount" value={behind.length} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirm" value="yes" required className="mt-1" />
              <span>
                Move <strong>{behind.length}</strong> student{behind.length === 1 ? "" : "s"} to version{" "}
                {latest.versionNumber}. Their completed lessons carry over where the lesson is in the new version.
              </span>
            </label>
            <button type="submit" className="self-start rounded bg-black px-4 py-2 text-white">
              Move to version {latest.versionNumber}
            </button>
          </form>
        </>
      )}
    </section>
  );
}