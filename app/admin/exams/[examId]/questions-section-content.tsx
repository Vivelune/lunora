import Link from "next/link";
import { QUESTION_TYPES, TYPE_LABELS } from "@/lib/question-input";
import { formatHundredths, toHundredths } from "@/lib/points";
import prisma from "@/lib/prisma";
import { deleteQuestion, moveQuestion } from "../question-actions";

export default async function QuestionsSectionContent({
  examId,
}: {
  examId: string;
}) {
  const versions = await prisma.examVersion.findMany({
    where: { examId },
    orderBy: { versionNumber: "desc" },
    take: 2,
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          prompt: true,
          points: true,
          imageId: true,
          acceptedAnswers: true,
          category: {
            select: {
              name: true,
            },
          },
          options: {
            orderBy: { position: "asc" },
            select: {
              text: true,
              isCorrect: true,
            },
          },
        },
      },
    },
  });

  const working =
    versions.find((version) => version.publishedAt === null) ?? null;

  const shown = working ?? versions[0] ?? null;
  const editable = working !== null;
  const questions = shown?.questions ?? [];

  const totalHundredths = questions.reduce(
    (sum, question) => sum + toHundredths(question.points.toString()),
    0
  );

  return (
    <section
      id="questions"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7"
    >
      {/* ============ HEADER ============ */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Questions
            </h2>
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            {shown
              ? `Version ${shown.versionNumber} — ${
                  editable ? "editable working copy" : "published, frozen"
                }`
              : "No version yet"}
          </p>
        </div>

        {questions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <span className="tabular-nums">{questions.length}</span>{" "}
              question{questions.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <span className="tabular-nums">
                {formatHundredths(totalHundredths)}
              </span>{" "}
              points
            </span>
          </div>
        )}
      </div>

      {/* ============ EMPTY STATE ============ */}
      {questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-neutral-400">No questions yet.</p>
          {editable && (
            <p className="mt-1 text-xs text-neutral-500">
              Add your first question below to build this exam.
            </p>
          )}
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {questions.map((question, index) => {
            const promptPreview =
              question.prompt.length > 140
                ? `${question.prompt.slice(0, 140)}…`
                : question.prompt;

            return (
              <li
                key={question.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                {/* ============ TOP ROW: number + prompt + actions ============ */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-xs font-semibold text-neutral-300">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="font-medium text-white">{promptPreview}</p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                        <span>{TYPE_LABELS[question.type]}</span>
                        <span className="text-neutral-700">·</span>
                        <span className="tabular-nums">
                          {formatHundredths(
                            toHundredths(question.points.toString())
                          )}{" "}
                          pt
                        </span>
                        {question.category && (
                          <>
                            <span className="text-neutral-700">·</span>
                            <span>{question.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {editable && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Move up */}
                      <form action={moveQuestion}>
                        <input type="hidden" name="examId" value={examId} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label="Move up"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                            <path d="M8 12.5V3.5M4 7.5 8 3.5l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>

                      {/* Move down */}
                      <form action={moveQuestion}>
                        <input type="hidden" name="examId" value={examId} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === questions.length - 1}
                          aria-label="Move down"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                            <path d="M8 3.5v9M4 8.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>

                      {/* Edit */}
                      <Link
                        href={`/admin/exams/${examId}/questions/${question.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-neutral-200 transition-colors hover:bg-white/[0.08] hover:text-white"
                      >
                        Edit
                      </Link>

                      {/* Delete */}
                      <form action={deleteQuestion}>
                        <input type="hidden" name="examId" value={examId} />
                        <input type="hidden" name="questionId" value={question.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-lg border border-transparent px-3 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {question.imageId && (
                  <div className="mt-3 inline-flex max-w-full rounded-xl border border-white/10 bg-white/[0.02] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/exam-images/${question.imageId}`}
                      alt=""
                      className="max-h-24 max-w-full rounded-lg object-contain"
                    />
                  </div>
                )}

                {/* ============ ANSWERS ============ */}
                {question.type === "SHORT_ANSWER" ? (
                  <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                      Accepted answers
                    </p>
                    <p className="mt-1 text-xs text-neutral-300">
                      {question.acceptedAnswers.join("  ·  ")}
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 flex flex-col gap-1">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={optionIndex}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                          option.isCorrect
                            ? "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-200"
                            : "border-white/5 bg-white/[0.02] text-neutral-400"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border ${
                            option.isCorrect
                              ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                              : "border-white/15 bg-white/[0.03] text-neutral-600"
                          }`}
                        >
                          {option.isCorrect && (
                            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                              <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span>{option.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* ============ ADD QUESTION ============ */}
      {editable && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Add a question
          </p>

          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((type) => (
              <Link
                key={type}
                href={`/admin/exams/${examId}/questions/new?type=${type}`}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-neutral-200 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
              >
                <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {TYPE_LABELS[type]}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}