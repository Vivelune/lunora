
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AdminLessonPlansContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();

  const { error, saved } = await searchParams;

  const plans = await prisma.lessonPlan.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
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
          _count: {
            select: { items: true },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Lesson plans</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="underline">
            Admin home
          </Link>

          <Link
            href="/admin/lesson-plans/new"
            className="rounded bg-black px-3 py-1.5 text-white"
          >
            New plan
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

      {plans.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-gray-500">
          No lesson plans yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Plan</th>
                <th className="pr-4">Subject</th>
                <th className="pr-4">Status</th>
                <th className="pr-4">Latest version</th>
                <th>Items</th>
              </tr>
            </thead>

            <tbody>
              {plans.map((plan) => {
                const version = plan.versions[0];

                return (
                  <tr key={plan.id} className="border-b">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/lesson-plans/${plan.id}`}
                        className="underline"
                      >
                        {plan.title}
                      </Link>
                    </td>

                    <td className="pr-4">
                      {plan.subject.parent
                        ? `${plan.subject.parent.name} ${plan.subject.name}`
                        : plan.subject.name}
                    </td>

                    <td className="pr-4">{plan.status}</td>

                    <td className="pr-4">
                      {version
                        ? `v${version.versionNumber} ${
                            version.publishedAt
                              ? "(published)"
                              : "(editing)"
                          }`
                        : "-"}
                    </td>

                    <td>{version?._count.items ?? 0}</td>
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
