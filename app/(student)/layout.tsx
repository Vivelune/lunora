import { Suspense, type ReactNode } from "react";
import { requireCompletedProfile } from "@/lib/auth";

async function StudentLayoutContent({
children,
}: {
children: ReactNode;
}) {
await requireCompletedProfile();

return <>{children}</>;
}

export default function StudentLayout({
children,
}: {
children: ReactNode;
}) {
return (
<Suspense
fallback={ <main className="flex min-h-screen items-center justify-center p-8"> <p className="text-sm text-gray-500">
Loading your student area... </p> </main>
}
> <StudentLayoutContent>{children}</StudentLayoutContent> </Suspense>
);
}
