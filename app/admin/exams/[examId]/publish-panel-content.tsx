import { getPublishProblems } from "@/lib/exam-validation";
import prisma  from "@/lib/prisma";
import {
  duplicateExam,
  publishExam,
  setExamLive,
  startNewExamVersion,
} from "../publish-actions";

export default async function PublishPanelContent({
  examId,
}: {
  examId: string;
}) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      status: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          publishedAt: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      },
    },
  });

  if (!exam) {
    return null;
  }

  const working =
    exam.versions.find((version) => version.publishedAt === null) ?? null;

  const hasPublished = exam.versions.some(
    (version) => version.publishedAt !== null,
  );

  const archived = exam.status === "ARCHIVED";

  const problems = working
    ? await getPublishProblems(working.id)
    : [];

  const hidden = (name: string, value: string) => (
    <input type="hidden" name={name} value={value} />
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-5">
      <h2 className="text-lg font-semibold">Publishing</h2>

      <p className="text-sm text-gray-600">
        Status: <strong>{exam.status}</strong>
        {exam.status === "PUBLISHED" &&
          " (live: can be assigned and taken once those features exist)"}
        {exam.status === "DRAFT" &&
          hasPublished &&
          " (not live: unpublished)"}
      </p>

      {working && !archived && (
        <div className="rounded border p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Publish checklist for version {working.versionNumber}
          </h3>

          {problems.length === 0 ? (
            <p className="text-sm text-green-700">
              Ready to publish: {working._count.questions} question
              {working._count.questions === 1 ? "" : "s"} checked.
            </p>
          ) : (
            <ul className="list-disc pl-6 text-sm text-red-700">
              {problems.map((problem, index) => (
                <li key={index}>{problem}</li>
              ))}
            </ul>
          )}

          <form action={publishExam} className="mt-3">
            {hidden("examId", examId)}

            <button
              type="submit"
              disabled={problems.length > 0}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-40"
            >
              Publish version {working.versionNumber}
            </button>
          </form>

          <p className="mt-2 text-xs text-gray-500">
            Publishing freezes this version. To change it later, create a
            new version. Published versions remain unchanged.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!working && !archived && hasPublished && (
          <form action={startNewExamVersion}>
            {hidden("examId", examId)}

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm"
            >
              Create new version to edit
            </button>
          </form>
        )}

        {exam.status === "PUBLISHED" && (
          <form action={setExamLive}>
            {hidden("examId", examId)}
            {hidden("live", "false")}

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm"
            >
              Unpublish (stop new attempts)
            </button>
          </form>
        )}

        {exam.status === "DRAFT" && hasPublished && (
          <form action={setExamLive}>
            {hidden("examId", examId)}
            {hidden("live", "true")}

            <button
              type="submit"
              className="rounded border px-4 py-2 text-sm"
            >
              Make live again
            </button>
          </form>
        )}

        <form action={duplicateExam}>
          {hidden("examId", examId)}

          <button
            type="submit"
            className="rounded border px-4 py-2 text-sm"
          >
            Duplicate exam
          </button>
        </form>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Version history</h3>

        <ul className="flex flex-col gap-1 text-sm">
          {exam.versions.map((version) => (
            <li key={version.id}>
              v{version.versionNumber} - {version._count.questions} question
              {version._count.questions === 1 ? "" : "s"} -{" "}
              {version.publishedAt
                ? `published ${version.publishedAt
                    .toISOString()
                    .slice(0, 10)}`
                : "editable working copy"}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}