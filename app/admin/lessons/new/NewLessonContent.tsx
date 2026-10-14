import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LessonForm } from "../lesson-form";

export default async function NewLessonContent() {
  // Verify admin access on the server.
  await requireAdmin();

  const subjects = await prisma.subject.findMany({
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
  });

  const options = subjects.map((subject) => ({
    id: subject.id,
    label: subject.parent
      ? `${subject.parent.name} ${subject.name}`
      : subject.name,
    categories: subject.categories,
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      {/* ============ HEADER ============ */}
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Admin · Lessons
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          New lesson
        </h1>

        <p className="mt-3 text-sm text-neutral-400">
          Fill in the content below. The lesson will be created as a draft —
          publish it when you&apos;re ready.
        </p>
      </header>

      {/* ============ FORM ============ */}
      <LessonForm subjects={options} />

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