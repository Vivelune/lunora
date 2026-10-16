
import type { ReviewQuestion } from "@/lib/review-builder";
import { Markdown } from "./markdown";

const STATUS_LABEL = { CORRECT: "Correct", INCORRECT: "Incorrect", UNANSWERED: "Not answered" } as const;
const STATUS_STYLE = {
  CORRECT: "bg-green-100 text-green-800",
  INCORRECT: "bg-red-100 text-red-800",
  UNANSWERED: "bg-gray-100 text-gray-700",
} as const;

export function ReviewList({ review, adminView = false }: { review: ReviewQuestion[]; adminView?: boolean }) {
  const hasShortAnswer = review.some((q) => q.type === "SHORT_ANSWER");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Review</h2>

      {hasShortAnswer && (
        <p className="rounded border bg-gray-50 p-3 text-xs text-gray-600">
          Short answers are graded automatically by comparing them with the accepted answers (capital letters and extra
          spaces are ignored).{" "}
          {adminView
            ? "If a valid variant was marked wrong, add it to the accepted answers in a new exam version."
            : "If you think a correct answer was marked wrong, tell your tutor."}
        </p>
      )}

      {review.map((q) => (
        <article key={q.id} className="flex flex-col gap-3 rounded-lg border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500">Question {q.number}</p>
            <p className="flex items-center gap-2 text-sm">
              <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[q.status]}`}>{STATUS_LABEL[q.status]}</span>
              <span className="text-gray-600">
                {q.pointsAwarded} of {q.pointsPossible} points
              </span>
            </p>
          </div>

          <Markdown>{q.prompt}</Markdown>

          {q.imageId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/exam-images/${q.imageId}`} alt={q.imageAlt ?? ""} className="max-w-full self-start rounded border" />
          )}

          {q.type !== "SHORT_ANSWER" ? (
            <ul className="flex flex-col gap-2 text-sm">
              {q.options.map((o) => (
                <li
                  key={o.id}
                  className={`flex flex-wrap items-center gap-2 rounded border p-2 ${o.right ? "border-green-400 bg-green-50" : ""}`}
                >
                  <span>{o.text}</span>
                  {o.chosen && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">{adminView ? "Student's answer" : "Your answer"}</span>}
                  {o.right && <span className="rounded bg-green-200 px-1.5 py-0.5 text-xs text-green-900">Correct answer</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              <p>
                {adminView ? "Student's answer" : "Your answer"}: {q.givenText && q.givenText.trim() !== "" ? q.givenText : "(none)"}
              </p>
              <p>Accepted answers: {q.acceptedList.join(", ")}</p>
            </div>
          )}

          {q.explanation && (
            <div className="rounded border bg-gray-50 p-3 text-sm">
              <p className="mb-1 font-semibold">Explanation</p>
              <Markdown>{q.explanation}</Markdown>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}