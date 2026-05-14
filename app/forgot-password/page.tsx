import { ForgotForm } from "./ForgotForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-sm mx-auto space-y-6 mt-8">
      <h1 className="text-2xl font-semibold text-center">💪 Sport Suivi</h1>
      <ForgotForm />
      <div className="text-center text-sm">
        <Link href="/login" className="text-accent hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
