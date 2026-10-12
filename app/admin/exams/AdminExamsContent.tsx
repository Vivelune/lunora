
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

const FILTERS = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;

type ExamStatus = (typeof FILTERS)[number];

function isExamStatus(value: string | undefined): value is ExamStatus {
  return FILTERS.some((filter) => filter === value);
}

export default async function AdminExamsContent({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  await requireAdmin();

  const { status, error, saved } = await searchParams;
  const active = isExamStatus(status) ? status : "ALL";

  const exams = await prisma.exam.findMany({
    where: active === "ALL" ? {} : { status: active },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      subject: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          versionNumber: true,
          publishedAt: true,
          durationMinutes: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Exams</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="underline">
            Admin home
          </Link>
          <Link
            href="/admin/exams/new"
            className="rounded bg-black px-3 py-1.5 text-white"
          >
            New exam
          </Link>
        </div>
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

      <nav aria-label="Filter exams" className="flex flex-wrap gap-3 text-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={
              filter === "ALL"
                ? "/admin/exams"
                : `/admin/exams?status=${filter}`
            }
            aria-current={filter === active ? "page" : undefined}
            className={
              filter === active ? "font-bold underline" : "underline"
            }
          >
            {filter === "ALL"
              ? "All"
              : filter.charAt(0) + filter.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>

      {exams.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-gray-500">
          No exams here yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2 pr-4">Exam</th>
                <th scope="col" className="pr-4">Subject</th>
                <th scope="col" className="pr-4">Status</th>
                <th scope="col" className="pr-4">Latest version</th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => {
                const version = exam.versions[0];

                return (
                  <tr key={exam.id} className="border-b">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/exams/${exam.id}`}
                        className="underline"
                      >
                        {exam.title}
                      </Link>
                    </td>
                    <td className="pr-4">
                      {exam.subject.parent
                        ? `${exam.subject.parent.name} ${exam.subject.name}`
                        : exam.subject.name}
                    </td>
                    <td className="pr-4">{exam.status}</td>
                    <td className="pr-4">
                      {version
                        ? `v${version.versionNumber} ${
                            version.publishedAt
                              ? "(published)"
                              : "(editing)"
                          }`
                        : "-"}
                    </td>
                    <td>
                      {version ? `${version.durationMinutes} min` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
