import { LoginForm } from "./LoginForm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // Déjà connecté → on sort de /login. getCurrentUser fait un lookup DB,
  // donc un cookie périmé (session supprimée côté DB) ne redirige pas et
  // laisse l'écran de login s'afficher normalement.
  const user = await getCurrentUser();
  if (user) {
    const target = searchParams.redirect?.startsWith("/") ? searchParams.redirect : "/";
    redirect(target);
  }
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
