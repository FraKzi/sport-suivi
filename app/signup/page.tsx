import { SignupForm } from "./SignupForm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <div className="max-w-sm mx-auto space-y-6 mt-8">
      <h1 className="text-2xl font-semibold text-center">💪 Sport Suivi</h1>
      <SignupForm />
      <div className="text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          Déjà un compte ? Se connecter
        </Link>
      </div>
    </div>
  );
}
