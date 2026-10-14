import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import {
  FOCUS_LABELS,
  RELEASE_LABELS,
  type FocusValue,
  type ReleaseValue,
} from "@/lib/exam-settings";
import prisma from "@/lib/prisma";

import { setExamArchived, updateExamDetails } from "../actions";
import { ExamSettingsForm } from "./exam-settings-form";
import { QuestionsSection } from "./questions-section";
import { PublishPanel } from "./publish-panel";

const day = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : "";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function ExamEditorContent({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { examId } = await params;
  const { error, saved } = await searchParams;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      subjectId: true,
      categoryId: true,
      availableFrom: true,
      availableUntil: true,
      visibility: true,
      subject: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  const categories = await prisma.category.findMany({
    where: {
      subjectId: exam.subjectId,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  const working =
    exam.versions.find((version) => version.publishedAt === null) ?? null;

  const shown = working ?? exam.versions[0] ?? null;

  const subjectLabel = exam.subject.parent
    ? `${exam.subject.parent.name} ${exam.subject.name}`
    : exam.subject.name;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Exam
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {exam.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {subjectLabel}
          </span>

          <StatusPill status={exam.status} />

          {working ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span className="h-1 w-1 rounded-full bg-amber-400" />
              Editing v{working.versionNumber}
            </span>
          ) : shown ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              Latest v{shown.versionNumber}
            </span>
          ) : null}
        </div>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-4 w-4 flex-shrink-0">
            <path d="M3.5 8.5 6.5 11.5 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {/* ============ EXAM DETAILS ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Exam details" />
          <p className="mt-2 text-sm text-neutral-500">
            Title, description, category, and availability window.
          </p>
        </div>

        <form action={updateExamDetails} className="flex flex-col gap-6">
          <input type="hidden" name="id" value={exam.id} />

          <div>
            <label htmlFor="title" className={labelBase}>Title</label>
            <input
              id="title"
              name="title"
              required
              maxLength={150}
              defaultValue={exam.title}
              className={inputBase}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelBase}>Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={exam.description ?? ""}
              className={inputBase}
            />
          </div>

          <div>
            <label htmlFor="categoryId" className={labelBase}>
              Category
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">optional</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={exam.categoryId ?? ""}
              className={inputBase}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="availableFrom" className={labelBase}>
                Available from
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">optional</span>
              </label>
              <input
                id="availableFrom"
                name="availableFrom"
                type="date"
                defaultValue={day(exam.availableFrom)}
                className={`${inputBase} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label htmlFor="availableUntil" className={labelBase}>
                Available until
                <span className="ml-2 text-[10px] tracking-normal text-neutral-500">optional</span>
              </label>
              <input
                id="availableUntil"
                name="availableUntil"
                type="date"
                defaultValue={day(exam.availableUntil)}
                className={`${inputBase} [color-scheme:dark]`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="visibility" className={labelBase}>
              Who can start this exam
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={exam.visibility}
              className={inputBase}
            >
              <option value="ASSIGNED_ONLY">
                Only students it is assigned to
              </option>
              <option value="OPEN_PRACTICE">
                Open practice — any student who finished onboarding
              </option>
            </select>
            <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
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
              <span>
                <strong className="font-medium text-neutral-400">
                  Assigned only:
                </strong>{" "}
                students see this exam when you assign it.{" "}
                <strong className="font-medium text-neutral-400">
                  Open practice:
                </strong>{" "}
                any onboarded student can start it from their dashboard.
              </span>
            </p>
          </div>
          <p className="flex items-start gap-2 text-xs text-neutral-500">
            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
              <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3M8 10.5h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Dates use UTC. The end date runs to the end of that day.
          </p>

          <div className="border-t border-white/10 pt-5">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
            >
              Save details
            </button>
          </div>
        </form>
      </section>

      {/* ============ SETTINGS ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-indigo-400 to-sky-400" label="Settings" />
          <p className="mt-2 text-sm text-neutral-500">
            {shown
              ? `Version ${shown.versionNumber} — ${
                  working ? "editable working copy" : "published, frozen"
                }`
              : "No version exists."}
          </p>
        </div>

        {working ? (
          <ExamSettingsForm
            initial={{
              examId: exam.id,
              instructions: working.instructions ?? "",
              durationMinutes: String(working.durationMinutes),
              maxAttempts: String(working.maxAttempts),
              passingPercent:
                working.passingPercent?.toString() ?? "",
              shuffleQuestions: working.shuffleQuestions,
              shuffleOptions: working.shuffleOptions,
              resultRelease: working.resultRelease,
              explanationRelease: working.explanationRelease,
              focusPolicy: working.focusPolicy,
              maxFocusViolations: String(working.maxFocusViolations),
              requireFullscreen: working.requireFullscreen,
            }}
          />
        ) : shown ? (
          <ul className="flex flex-col gap-2">
            <ReadonlyRow label="Duration" value={`${shown.durationMinutes} minutes`} />
            <ReadonlyRow label="Maximum attempts" value={String(shown.maxAttempts)} />
            <ReadonlyRow
              label="Results"
              value={RELEASE_LABELS[shown.resultRelease as ReleaseValue]}
            />
            <ReadonlyRow
              label="Explanations"
              value={RELEASE_LABELS[shown.explanationRelease as ReleaseValue]}
            />
            <ReadonlyRow
              label="Focus monitoring"
              value={FOCUS_LABELS[shown.focusPolicy as FocusValue]}
            />
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No version exists.</p>
        )}
      </section>

      {/* ============ PUBLISHING ============ */}
      <PublishPanel examId={exam.id} />

      {/* ============ QUESTIONS ============ */}
      <QuestionsSection examId={exam.id} />

      {/* ============ ARCHIVE ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader
            dot={exam.status === "ARCHIVED" ? "from-neutral-400 to-neutral-600" : "from-rose-400 to-orange-400"}
            label={exam.status === "ARCHIVED" ? "Archived" : "Danger zone"}
          />
          <p className="mt-2 text-sm text-neutral-500">
            {exam.status === "ARCHIVED"
              ? "This exam is archived. Restoring makes it available for editing again."
              : "Archiving hides this exam from active management. It can be restored."}
          </p>
        </div>

        <form action={setExamArchived}>
          <input type="hidden" name="examId" value={exam.id} />
          <input
            type="hidden"
            name="archive"
            value={exam.status === "ARCHIVED" ? "false" : "true"}
          />

          <button
            type="submit"
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${
              exam.status === "ARCHIVED"
                ? "border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08]"
                : "border border-rose-400/20 bg-rose-500/[0.06] text-rose-200 hover:bg-rose-500/[0.12]"
            }`}
          >
            {exam.status === "ARCHIVED" ? "Restore exam" : "Archive exam"}
          </button>
        </form>
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/exams"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M13 8H3m0 0 4-4M3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to exams
      </Link>
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function SectionHeader({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${dot}`} />
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
        {label}
      </h2>
    </div>
  );
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200">{value}</span>
    </li>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Live
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Draft
      </span>
    );
  }
  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-neutral-400">
      {status}
    </span>
  );
}