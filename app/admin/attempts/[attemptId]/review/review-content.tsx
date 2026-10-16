import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminReview } from "@/lib/admin-review";
import { tryGradeAttempt } from "@/lib/attempt-grading";
import { finalizeIfExpired } from "@/lib/attempts";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ReviewList } from "@/app/components/review-list";

export default async function AdminReviewContent({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  await requireAdmin();
  const { attemptId } = await params;

  await finalizeIfExpired(attemptId);
  await tryGradeAttempt(attemptId);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      status: true,
      attemptNumber: true,
      pointsEarned: true,
      pointsPossible: true,
      percentage: true,
      student: { select: { firstName: true, lastName: true } },
      exam: { select: { title: true } },
    },
  });

  if (!attempt) {
    notFound();
  }

  const review =
    attempt.status === "IN_PROGRESS"
      ? null
      : await getAdminReview(attemptId);

  const hasScore =
    attempt.pointsEarned !== null && attempt.pointsPossible !== null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Answer review
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {attempt.student.lastName}, {attempt.student.firstName}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {attempt.exam.title}
          </span>

          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
            #{attempt.attemptNumber}
          </span>

          {hasScore ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="tabular-nums">
                {attempt.pointsEarned!.toString()} of{" "}
                {attempt.pointsPossible!.toString()} (
                {attempt.percentage?.toString()}%)
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
              Not graded
            </span>
          )}
        </div>
      </header>

      {/* ============ ADMIN NOTICE ============ */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300"
        >
          <circle
            cx="8"
            cy="8"
            r="6.25"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M8 5v3M8 10.5h.01"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-200">
            Admin view
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-200/80">
            This shows the answer key and explanations regardless of whether
            the student can see them yet.
          </p>
        </div>
      </div>

      {/* ============ REVIEW ============ */}
      {review ? (
        <ReviewList review={review} adminView />
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white/[0.04] text-neutral-400">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M8 4.5V8l2 1.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-neutral-300">
              Attempt still in progress
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Nothing to review yet — come back once the student submits.
            </p>
          </div>
        </div>
      )}

      {/* ============ BACK LINK ============ */}
      <Link
        href={`/admin/attempts/${attemptId}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          className="h-3.5 w-3.5"
        >
          <path
            d="M13 8H3m0 0 4-4M3 8l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to attempt
      </Link>
    </div>
  );
}