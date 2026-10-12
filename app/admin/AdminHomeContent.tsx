
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminHomeContent() {
  const { profile } = await requireAdmin();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Admin area</h1>
        <p className="text-gray-600">
          Role: {profile.role}
        </p>
        <p className="text-sm text-gray-500">
          Manage your LMS content and student groups from here.
        </p>
      </div>

      <nav className="flex flex-col gap-3">
        <Link
          href="/admin/subjects"
          className="rounded-lg border p-4 font-medium transition hover:bg-gray-50"
        >
          Manage subjects →
        </Link>

        <Link
          href="/admin/categories"
          className="rounded-lg border p-4 font-medium transition hover:bg-gray-50"
        >
          Manage categories →
        </Link>

        <Link
          href="/admin/lessons"
          className="rounded-lg border p-4 font-medium transition hover:bg-gray-50"
        >
          Manage lessons →
        </Link>

        <Link
          href="/admin/groups"
          className="rounded-lg border p-4 font-medium transition hover:bg-gray-50"
        >
          Manage student groups →
        </Link>
        <Link href="/admin/lesson-plans"className="rounded-lg border p-4 font-medium transition hover:bg-gray-50">Lesson plans</Link>
        <Link href="/admin/assignments" className="rounded-lg border p-4 font-medium transition hover:bg-gray-50">Assignments</Link>
        <Link href="/admin/exams" className="rounded-lg border p-4 font-medium transition hover:bg-gray-50">Exams</Link>
      </nav>
    </main>
  );
}
