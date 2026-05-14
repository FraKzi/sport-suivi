import Link from "next/link";

// Bouton pseudo dans le header. Click → /profil. Le logout et le lien admin
// vivent dans /profil (sections Compte/Admin) pour éviter une dropdown.
export function HeaderUser({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  return (
    <Link
      href="/profil"
      className="flex items-center gap-1.5 text-xs text-muted hover:text-text px-2 py-1 rounded border border-border bg-surface2"
      aria-label={`Profil de ${username}`}
    >
      <span aria-hidden="true">👤</span>
      <span className="font-medium">{username}</span>
      {isAdmin && <span className="text-accent text-[10px]">admin</span>}
    </Link>
  );
}
