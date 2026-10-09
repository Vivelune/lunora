
import HomeAuth from "./components/HomeAuth";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Exam Prep LMS</h1>

      <p className="text-lg text-gray-600">
        SAT and AP Chemistry preparation, built step by step.
      </p>

      <HomeAuth />
    </main>
  );
}