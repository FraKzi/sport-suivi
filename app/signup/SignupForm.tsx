"use client";
import { useState } from "react";
import { Card, CardTitle, Field, Button } from "@/components/ui";

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [phrase, setPhrase] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, inviteCode }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error ?? "Erreur d'inscription");
      return;
    }
    setPhrase(j.recoveryPhrase);
  }

  if (phrase) {
    return (
      <Card>
        <CardTitle>🔐 Phrase de récupération</CardTitle>
        <p className="text-sm text-muted mb-3">
          Note ces 6 mots quelque part de sûr (note dans le téléphone,
          gestionnaire de mots de passe, papier). C'est la <strong>seule</strong>{" "}
          façon de récupérer ton compte si tu oublies ton mot de passe.
        </p>
        <div className="bg-surface2 border border-accent/40 rounded-lg p-4 my-3">
          <code className="text-base font-mono break-words select-all">
            {phrase}
          </code>
        </div>
        <p className="text-xs text-muted mb-4">
          ⚠ Cette phrase ne sera plus jamais affichée. Tu peux la copier-coller
          en cliquant dessus.
        </p>
        <Button
          onClick={() => {
            window.location.href = "/";
          }}
          className="w-full"
        >
          J'ai noté la phrase, continuer
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Créer un compte</CardTitle>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Identifiant"
          hint="Lettres, chiffres, - et _ uniquement (3-30 caractères)"
        >
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
          />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        <Field label="Code d'invitation" hint="Obtenu auprès de l'admin">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
        </Field>
        {err && <p className="text-danger text-sm">{err}</p>}
        <Button disabled={busy} className="w-full">
          {busy ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
    </Card>
  );
}
