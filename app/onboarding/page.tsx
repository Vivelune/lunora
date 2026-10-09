import { Suspense } from "react";
import OnboardingContent from "@/app/components/OnboardingContent";

export default function OnboardingPage() {
return (
<Suspense
fallback={ <main className="flex min-h-screen items-center justify-center p-8"> <p className="text-sm text-gray-600">
Loading your profile... </p> </main>
}
> <OnboardingContent /> </Suspense>
);
}
