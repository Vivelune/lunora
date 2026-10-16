import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getStudentResultsList } from "@/lib/student-results";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "-");
const stamp = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default async function ResultsListContent() {
  const { profile } = await requireCompletedProfile();
  const items = await getStudentResultsList(profile.id);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My results</h1>
        <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
      </header>

      {items.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-gray-500">
          You have no completed exams yet. Your results will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.attemptId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div>
                <p className="font-medium">{item.examTitle}</p>
                <p className="text-sm text-gray-600">
                  {item.subject} - attempt {item.attemptNumber} - {day(item.endedAt)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {item.released && item.percentage !== null ? (
                  <>
                    <span>
                      <strong>{item.percentage}%</strong>{" "}
                      <span className="text-gray-600">
                        ({item.pointsEarned} of {item.pointsPossible})
                        {item.passed === true && " - passed"}
                        {item.passed === false && " - not passed"}
                      </span>
                    </span>
                    <Link href={`/attempts/${item.attemptId}/results`} className="rounded border px-3 py-1">
                      View results
                    </Link>
                  </>
                ) : (
                  <span className="text-gray-500">
                    {item.availableAfter
                      ? `Results available after ${stamp(item.availableAfter)}`
                      : "Waiting for your tutor to release the results"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}