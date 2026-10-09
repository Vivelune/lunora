import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingForm } from "../onboarding/onboarding-form";

export default async function OnboardingContent() {
const { profile } = await getCurrentProfile();

if (profile?.onboardingCompletedAt) {
redirect("/dashboard");
}

return ( 
<main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8"> 
    <div> <h1 className="text-2xl font-bold">
Complete your profile </h1> <p className="text-sm text-gray-600">
We need a few details before you can start. </p> </div>
  <OnboardingForm />
</main>


);
}
