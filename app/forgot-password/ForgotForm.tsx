"use client";
import { useState } from "react";
import { Card, CardTitle, Field, Button } from "@/components/ui";

export function ForgotForm() {
  const [username, setUsername] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, recoveryPhrase, newPassword }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Erreur");
      return;
    }
    window.location.href = "/";
  }

  return (
    <Card>
      <CardTitle>Mot de passe oublié</CardTitle>
      <p className="text-xs text-muted mb-3">
        Entre ton identifiant + la phrase de récupération à 6 mots reçue à
        l'inscription. Un nouveau mot de passe te sera demandé.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Identifiant">
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>
        <Field label="Phrase de récupération" hint="6 mots séparés par des espaces">
          <input
            type="text"
            value={recoveryPhrase}
            onChange={(e) => setRecoveryPhrase(e.target.value)}
            required
            placeholder="ex: chat soleil arbre…"
          />
        </Field>
        <Field label="Nouveau mot de passe" hint="8 caractères minimum">
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        {err && <p className="text-danger text-sm">{err}</p>}
        <Button disabled={busy} className="w-full">
          {busy ? "Réinitialisation…" : "Réinitialiser et se connecter"}
        </Button>
      </form>
    </Card>
  );
}
