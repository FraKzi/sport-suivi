"use client";

import { useState } from "react";
import Link from "next/link";

export function HeaderUser({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-text px-2 py-1 rounded border border-border bg-surface2"
      >
        <span aria-hidden="true">👤</span>
        <span className="font-medium">{username}</span>
        {isAdmin && <span className="text-accent text-[10px]">admin</span>}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-lg shadow-lg z-30 py-1"
          onMouseLeave={() => setOpen(false)}
        >
          {isAdmin && (
            <Link
              href="/admin/invites"
              className="block px-3 py-2 text-sm hover:bg-surface2"
              onClick={() => setOpen(false)}
            >
              🎟 Codes d'invitation
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="block w-full text-left px-3 py-2 text-sm hover:bg-surface2 disabled:opacity-50"
          >
            {busy ? "Déconnexion…" : "🚪 Se déconnecter"}
          </button>
        </div>
      )}
    </div>
  );
}
