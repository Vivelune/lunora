import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

import {
  addItem,
  moveItem,
  publishPlan,
  removeItem,
  setPlanArchived,
  startNewVersion,
  toggleRequired,
  updatePlan,
} from "../actions";
import { OlderVersions } from "./older-versions";

const inputBase =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const labelBase =
  "mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-neutral-400";

export default async function EditLessonPlanContent({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { planId } = await params;
  const { error, saved } = await searchParams;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    select: {
      id: true,
      title: true,
      description: true,
      objectives: true,
      status: true,
      subjectId: true,
      categoryId: true,
      subject: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          publishedAt: true,
          items: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              isRequired: true,
              lesson: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  estimatedMinutes: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) {
    notFound();
  }

  const working =
    plan.versions.find((version) => version.publishedAt === null) ?? null;

  const shown = working ?? plan.versions[0] ?? null;

  const editable = working !== null && plan.status !== "ARCHIVED";

  const usedLessonIds = (shown?.items ?? []).flatMap((item) =>
    item.lesson ? [item.lesson.id] : []
  );

  const [categories, availableLessons] = await Promise.all([
    prisma.category.findMany({
      where: {
        subjectId: plan.subjectId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),

    editable
      ? prisma.lesson.findMany({
          where: {
            subjectId: plan.subjectId,
            status: "PUBLISHED",
            id: { notIn: usedLessonIds },
          },
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
          },
        })
      : Promise.resolve([] as { id: string; title: string }[]),
  ]);

  const totalMinutes = (shown?.items ?? []).reduce(
    (sum, item) => sum + (item.lesson?.estimatedMinutes ?? 0),
    0
  );

  const subjectLabel = plan.subject.parent
    ? `${plan.subject.parent.name} ${plan.subject.name}`
    : plan.subject.name;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Lesson plan
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {plan.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
            {subjectLabel}
          </span>

          <StatusPill status={plan.status} />

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

      {/* ============ PLAN DETAILS ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-violet-400 to-fuchsia-400" label="Plan details" />
          <p className="mt-2 text-sm text-neutral-500">
            Title, description, category, and objectives.
          </p>
        </div>

        <form action={updatePlan} className="flex flex-col gap-6">
          <input type="hidden" name="id" value={plan.id} />

          <div>
            <label htmlFor="title" className={labelBase}>Title</label>
            <input
              id="title"
              name="title"
              required
              maxLength={150}
              defaultValue={plan.title}
              className={inputBase}
            />
          </div>

          <div>
            <label htmlFor="description" className={labelBase}>Description</label>
            <textarea
              id="description"
              name="description"
              rows={2}
              maxLength={500}
              defaultValue={plan.description ?? ""}
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
              defaultValue={plan.categoryId ?? ""}
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

          <div>
            <label htmlFor="objectives" className={labelBase}>
              Learning objectives
              <span className="ml-2 text-[10px] tracking-normal text-neutral-500">
                one per line · up to 10
              </span>
            </label>
            <textarea
              id="objectives"
              name="objectives"
              rows={3}
              defaultValue={plan.objectives.join("\n")}
              className={inputBase}
            />
          </div>

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

      {/* ============ VERSION / ITEMS ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionHeader dot="from-indigo-400 to-sky-400" label="Version & items" />
            <p className="mt-2 text-sm text-neutral-500">
              {shown
                ? `Version ${shown.versionNumber} — ${
                    working ? "editable working copy" : "published (frozen)"
                  }`
                : "No version yet"}
            </p>
          </div>

          {shown && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-neutral-400">
              <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 4.5V8l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {totalMinutes} min total
            </span>
          )}
        </div>

        {/* Items list */}
        {!shown || shown.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-neutral-400">No lessons in this version yet.</p>
            {editable && (
              <p className="mt-1 text-xs text-neutral-500">
                Add published lessons below to build this version.
              </p>
            )}
          </div>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {shown.items.map((item, index) => {
              const lesson = item.lesson;
              const lessonNotPublished = lesson !== null && lesson.status !== "PUBLISHED";

              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-xs font-semibold text-neutral-300">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="font-medium text-white">
                        {item.lesson?.title ?? "(missing lesson)"}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                        <span>
                          {item.isRequired ? "Required" : "Optional"}
                        </span>
                        {lessonNotPublished && lesson && (
  <>
    <span className="text-neutral-700">·</span>
    <span className="text-amber-300/70">
      lesson is {lesson.status.toLowerCase()}
    </span>
  </>
)}
                      </div>
                    </div>
                  </div>

                  {editable && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Move up */}
                      <form action={moveItem}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="itemId" value={item.id} />
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
                      <form action={moveItem}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === shown.items.length - 1}
                          aria-label="Move down"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                            <path d="M8 3.5v9M4 8.5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </form>

                      {/* Toggle required */}
                      <form action={toggleRequired}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                        >
                          Make {item.isRequired ? "optional" : "required"}
                        </button>
                      </form>

                      {/* Remove */}
                      <form action={removeItem}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center rounded-lg border border-transparent px-3 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/20 hover:bg-rose-500/[0.08]"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* Add item */}
        {editable && (
          <form
            action={addItem}
            className="mt-5 flex flex-wrap items-end gap-3 border-t border-white/10 pt-5"
          >
            <input type="hidden" name="planId" value={plan.id} />

            <div className="min-w-0 flex-1">
              <label htmlFor="lessonId" className={labelBase}>
                Add a published lesson
              </label>
              <select
                id="lessonId"
                name="lessonId"
                required
                defaultValue=""
                className={inputBase}
              >
                <option value="" disabled>
                  {availableLessons.length === 0
                    ? "No more lessons available"
                    : "Select…"}
                </option>
                {availableLessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={availableLessons.length === 0}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          {working && plan.status !== "ARCHIVED" && (
            <form action={publishPlan}>
              <input type="hidden" name="planId" value={plan.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90"
              >
                Publish version {working.versionNumber}
              </button>
            </form>
          )}

          {!working && plan.status !== "ARCHIVED" && (
            <form action={startNewVersion}>
              <input type="hidden" name="planId" value={plan.id} />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08]"
              >
                Create new version to edit
              </button>
            </form>
          )}

          <form action={setPlanArchived}>
            <input type="hidden" name="planId" value={plan.id} />
            <input
              type="hidden"
              name="archive"
              value={plan.status === "ARCHIVED" ? "false" : "true"}
            />
            <button
              type="submit"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${
                plan.status === "ARCHIVED"
                  ? "border border-white/10 bg-white/[0.04] text-neutral-100 hover:bg-white/[0.08]"
                  : "border border-rose-400/20 bg-rose-500/[0.06] text-rose-200 hover:bg-rose-500/[0.12]"
              }`}
            >
              {plan.status === "ARCHIVED" ? "Restore plan" : "Archive plan"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-neutral-500">
          Required items unlock in order. Optional items can be skipped.
          Published versions never change, so students already using one keep
          exactly what they were given.
        </p>
      </section>

      {/* ============ VERSION HISTORY ============ */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur sm:p-7">
        <div className="mb-5">
          <SectionHeader dot="from-neutral-400 to-neutral-600" label="Version history" />
          <p className="mt-2 text-sm text-neutral-500">
            {plan.versions.length} version{plan.versions.length === 1 ? "" : "s"}
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {plan.versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                  v{version.versionNumber}
                </span>

                <span className="text-sm text-neutral-400">
                  {version.items.length} item{version.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {version.publishedAt ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                  Published{" "}
                  <span className="tabular-nums text-neutral-400">
                    {version.publishedAt.toISOString().slice(0, 10)}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  <span className="h-1 w-1 rounded-full bg-amber-400" />
                  Editable
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ============ OLDER VERSIONS ============ */}
      <Suspense
        fallback={
          <div className="h-32 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
        }
      >
        <OlderVersions planId={plan.id} />
      </Suspense>

      {/* ============ BACK LINK ============ */}
      <Link
        href="/admin/lesson-plans"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path d="M13 8H3m0 0 4-4M3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to plans
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