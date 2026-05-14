"use client";
import { useState } from "react";
import { Card, CardTitle, Field, Button } from "@/components/ui";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Erreur de connexion");
      return;
    }
    // Hard navigation pour que le middleware / layout re-fetche avec la session
    window.location.href = redirectTo;
  }

  return (
    <Card>
      <CardTitle>Connexion</CardTitle>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Identifiant">
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>
        <Field label="Mot de passe">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {err && <p className="text-danger text-sm">{err}</p>}
        <Button disabled={busy} className="w-full">
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}
