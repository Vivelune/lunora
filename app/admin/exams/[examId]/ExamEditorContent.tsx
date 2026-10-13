
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

const day = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : "";

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

  const field = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{exam.title}</h1>

          <p className="text-sm text-gray-600">
            {exam.subject.parent
              ? `${exam.subject.parent.name} ${exam.subject.name}`
              : exam.subject.name}{" "}
            - status <strong>{exam.status}</strong>
          </p>
        </div>

        <Link href="/admin/exams" className="text-sm underline">
          Back to exams
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700"
        >
          {saved}
        </p>
      )}

      <section className="rounded-lg border p-5">
        <h2 className="mb-3 text-lg font-semibold">Exam details</h2>

        <form action={updateExamDetails} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={exam.id} />

          <div>
            <label htmlFor="title" className={label}>
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={150}
              defaultValue={exam.title}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="description" className={label}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={exam.description ?? ""}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="categoryId" className={label}>
              Category (optional)
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={exam.categoryId ?? ""}
              className={field}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="availableFrom" className={label}>
                Available from (optional)
              </label>
              <input
                id="availableFrom"
                name="availableFrom"
                type="date"
                defaultValue={day(exam.availableFrom)}
                className={field}
              />
            </div>

            <div>
              <label htmlFor="availableUntil" className={label}>
                Available until (optional)
              </label>
              <input
                id="availableUntil"
                name="availableUntil"
                type="date"
                defaultValue={day(exam.availableUntil)}
                className={field}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Dates use UTC. The end date runs to the end of that day.
          </p>

          <button
            type="submit"
            className="self-start rounded border px-4 py-1.5 text-sm"
          >
            Save details
          </button>
        </form>
      </section>

      <section className="rounded-lg border p-5">
        <h2 className="mb-3 text-lg font-semibold">
          {shown
            ? `Settings - version ${shown.versionNumber} (${
                working ? "editable working copy" : "published, frozen"
              })`
            : "Settings"}
        </h2>

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
          <ul className="flex flex-col gap-1 text-sm">
            <li>Duration: {shown.durationMinutes} minutes</li>
            <li>Maximum attempts: {shown.maxAttempts}</li>
            <li>
              Results:{" "}
              {RELEASE_LABELS[shown.resultRelease as ReleaseValue]}
            </li>
            <li>
              Explanations:{" "}
              {RELEASE_LABELS[
                shown.explanationRelease as ReleaseValue
              ]}
            </li>
            <li>
              Focus monitoring:{" "}
              {FOCUS_LABELS[shown.focusPolicy as FocusValue]}
            </li>
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No version exists.</p>
        )}
      </section>

      <QuestionsSection examId={exam.id} />

      <form action={setExamArchived}>
        <input type="hidden" name="examId" value={exam.id} />
        <input
          type="hidden"
          name="archive"
          value={exam.status === "ARCHIVED" ? "false" : "true"}
        />

        <button
          type="submit"
          className="rounded border px-4 py-2 text-sm"
        >
          {exam.status === "ARCHIVED" ? "Restore exam" : "Archive exam"}
        </button>
      </form>
    </main>
  );
}
