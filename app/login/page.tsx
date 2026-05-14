import { LoginForm } from "./LoginForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  return (
    <div className="max-w-sm mx-auto space-y-6 mt-8">
      <h1 className="text-2xl font-semibold text-center">💪 Sport Suivi</h1>
      <LoginForm redirectTo={searchParams.redirect ?? "/"} />
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-accent hover:underline">
          Mot de passe oublié ?
        </Link>
        <Link href="/signup" className="text-accent hover:underline">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
