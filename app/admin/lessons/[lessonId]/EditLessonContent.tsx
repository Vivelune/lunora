import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LessonForm } from "../lesson-form";
import { setLessonStatus } from "../actions";
import { deleteResource } from "../resource-actions";
import { ResourceUploader } from "./resource-uploader";

const STATUS_ACTIONS: Record<
  string,
  { to: string; label: string }[]
> = {
  DRAFT: [
    { to: "PUBLISHED", label: "Publish" },
    { to: "ARCHIVED", label: "Archive" },
  ],
  PUBLISHED: [
    { to: "DRAFT", label: "Unpublish (back to draft)" },
    { to: "ARCHIVED", label: "Archive" },
  ],
  ARCHIVED: [
    { to: "DRAFT", label: "Restore as draft" },
  ],
};

type Props = {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function EditLessonContent({
  params,
  searchParams,
}: Props) {
  // Always enforce admin authorization on the server.
  await requireAdmin();

  const [{ lessonId }, { error, saved }] = await Promise.all([
    params,
    searchParams,
  ]);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    notFound();
  }

  const [subjects, resources] = await Promise.all([
    prisma.subject.findMany({
      where: {
        isActive: true,
        children: {
          none: { isActive: true },
        },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        parent: {
          select: { name: true },
        },
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.learningResource.findMany({
      where: { lessonId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        originalFilename: true,
        contentType: true,
        sizeBytes: true,
      },
    }),
  ]);

  const options = subjects.map((subject) => ({
    id: subject.id,
    label: subject.parent
      ? `${subject.parent.name} ${subject.name}`
      : subject.name,
    categories: subject.categories,
  }));

  const statusActions = STATUS_ACTIONS[lesson.status] ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Lessons
        </p>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Edit lesson
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill status={lesson.status} />

              {lesson.publishedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
                  First published{" "}
                  <span className="tabular-nums text-neutral-300">
                    {lesson.publishedAt.toISOString().slice(0, 10)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ============ STATUS MESSAGES ============ */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <circle
              cx="8"
              cy="8"
              r="6.25"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {saved && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          >
            <path
              d="M3.5 8.5 6.5 11.5 12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{saved}</span>
        </p>
      )}

      {/* ============ STATUS ACTIONS ============ */}
      {statusActions.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-400" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Publishing
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusActions.map((action) => {
              const isPublish = action.to === "PUBLISHED";
              const isArchive = action.to === "ARCHIVED";

              return (
                <form key={action.to} action={setLessonStatus}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="to" value={action.to} />

                  <button
                    type="submit"
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                      isPublish
                        ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:opacity-90"
                        : isArchive
                          ? "border border-rose-400/20 bg-rose-500/[0.06] text-rose-200 hover:bg-rose-500/[0.12]"
                          : "border border-white/10 bg-white/[0.04] text-neutral-200 hover:bg-white/[0.08]"
                    }`}
                  >
                    {action.label}
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ LESSON FORM ============ */}
      <section>
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Lesson content
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Update fields and save when you&apos;re ready.
          </p>
        </div>

        <LessonForm
          subjects={options}
          lesson={{
            id: lesson.id,
            title: lesson.title,
            description: lesson.description ?? "",
            subjectId: lesson.subjectId,
            categoryId: lesson.categoryId ?? "",
            objectives: lesson.objectives.join("\n"),
            content: lesson.content,
            estimatedMinutes:
              lesson.estimatedMinutes?.toString() ?? "",
          }}
        />
      </section>

      {/* ============ RESOURCES ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-400" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
                Resources
              </h2>
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              Paste an image&apos;s Markdown snippet into the lesson content to
              show it.
            </p>
          </div>

          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-500">
            {resources.length} file{resources.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Empty state */}
        {resources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-neutral-400">
              No resources attached yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Upload files below to attach them to this lesson.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {resources.map((resource) => {
              const isImage = resource.contentType.startsWith("image/");
              const sizeKb = Math.ceil(resource.sizeBytes / 1024);

              return (
                <li
                  key={resource.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  {/* Top row: icon + title + meta */}
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400">
                      {isImage ? <ImageIcon /> : <FileIcon />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {resource.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                        <span className="truncate">
                          {resource.originalFilename}
                        </span>
                        <span className="text-neutral-700">·</span>
                        <span className="font-mono text-[11px]">
                          {resource.contentType}
                        </span>
                        <span className="text-neutral-700">·</span>
                        <span className="tabular-nums">{sizeKb} KB</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <a
                        href={`/api/resources/${resource.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                      >
                        Open
                      </a>

                      <form action={deleteResource}>
                        <input
                          type="hidden"
                          name="id"
                          value={resource.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-transparent px-3 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Markdown snippet for images */}
                  {isImage && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <code className="flex-1 truncate font-mono text-[11px] text-violet-200">
                        {`![${resource.title}](/api/resources/${resource.id})`}
                      </code>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Uploader */}
        <div className="mt-5 border-t border-white/5 pt-5">
          <ResourceUploader lessonId={lesson.id} />
        </div>
      </section>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/lessons"
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
        Back to lessons
      </Link>
    </div>
  );
}

/* ============================================================
   Status pill — shared with the lessons list page
   ============================================================ */
function StatusPill({ status }: { status: string }) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Published
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

/* ============================================================
   Icons
   ============================================================ */
function ImageIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className="h-4 w-4"
    >
      <rect
        x="2.5"
        y="3.5"
        width="11"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="6" cy="7" r="1" fill="currentColor" />
      <path
        d="M3.5 11.5 6.5 9l2 2 2-2.5 2 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M4 2.5h5L12 5.5v8H4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9 2.5V5.5h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}