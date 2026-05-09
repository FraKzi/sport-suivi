"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Tableau de bord" },
  { href: "/journal", label: "Journal" },
  { href: "/seances", label: "Séances" },
  { href: "/exercices", label: "Exercices" },
  { href: "/prs", label: "🏆 PRs" },
  { href: "/trophees", label: "🎖 Trophées" },
  { href: "/historique", label: "Historique" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/courses", label: "Courses" },
  { href: "/mesures", label: "Mesures" },
  { href: "/profil", label: "Profil" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {links.map((l) => {
        const active = path === l.href || (l.href !== "/" && path.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              active ? "bg-accent text-white" : "text-muted hover:text-text hover:bg-surface2"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
