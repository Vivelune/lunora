import { Suspense } from "react";
import DashboardContent from "./DashboardContent";

export default function DashboardPage() {
return (
<Suspense
fallback={ <main className="flex min-h-screen items-center justify-center p-8"> <p className="text-sm text-gray-500">
Loading your dashboard... </p> </main>
}
> <DashboardContent /> </Suspense>
);
}
