import prisma from "@/lib/prisma";
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
    where: {
      planId,
      status: "ACTIVE",
      completedAt: null,
      NOT: { versionId: latest.id },
    },
    orderBy: [
      { student: { lastName: "asc" } },
      { student: { firstName: "asc" } },
    ],
    select: {
      id: true,
      version: { select: { versionNumber: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-orange-400 to-rose-400" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Students on older versions
          </h2>
        </div>
      </div>

      {behind.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-emerald-200">All caught up</p>
            <p className="mt-0.5 text-xs text-emerald-300/70">
              Everyone with unfinished work is on version {latest.versionNumber}, the latest published version.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm leading-relaxed text-neutral-400">
            <span className="font-medium text-white">
              {behind.length} student{behind.length === 1 ? "" : "s"}
            </span>{" "}
            still on an older version with unfinished work. Completed
            assignments are never moved.
          </p>

          <ul className="mb-5 flex flex-col gap-1.5">
            {behind.slice(0, 20).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2 text-sm"
              >
                <span className="text-neutral-200">
                  {a.student.lastName}, {a.student.firstName}
                </span>
                <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                  v{a.version.versionNumber}
                </span>
              </li>
            ))}

            {behind.length > 20 && (
              <li className="px-3.5 py-2 text-xs text-neutral-500">
                and {behind.length - 20} more
              </li>
            )}
          </ul>

          <form
            action={moveStudentsToLatest}
            className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <input type="hidden" name="planId" value={planId} />
            <input type="hidden" name="expectedCount" value={behind.length} />

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="confirm"
                value="yes"
                required
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-violet-500"
              />
              <span className="text-neutral-300">
                Move{" "}
                <strong className="font-semibold text-white">
                  {behind.length}
                </strong>{" "}
                student{behind.length === 1 ? "" : "s"} to version{" "}
                {latest.versionNumber}. Their completed lessons carry over where
                the lesson is in the new version.
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
            >
              Move to version {latest.versionNumber}
            </button>
          </form>
        </>
      )}
    </section>
  );
}