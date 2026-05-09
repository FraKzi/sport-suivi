"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Tableau de bord", icon: "📊" },
  { href: "/journal", label: "Journal", icon: "📔" },
  { href: "/seances", label: "Séances", icon: "🏋" },
  { href: "/exercices", label: "Exercices", icon: "✏️" },
  { href: "/prs", label: "Records", icon: "🏆" },
  { href: "/trophees", label: "Trophées", icon: "🎖️" },
  { href: "/historique", label: "Historique", icon: "📅" },
  { href: "/nutrition", label: "Nutrition", icon: "🍽️" },
  { href: "/courses", label: "Liste de courses", icon: "🛒" },
  { href: "/mesures", label: "Mesures", icon: "📏" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

export function NavLinks() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Évite hydration mismatch (drawer dépend du `path` côté client)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ferme automatiquement quand on change de page
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Escape pour fermer + scroll lock du body
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 -mr-2 text-text hover:bg-surface2 rounded-md transition-colors"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer slide-in droite */}
      <nav
        aria-label="Navigation principale"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-surface border-l border-border flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <span className="text-xs uppercase tracking-wider text-muted font-semibold">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="text-muted hover:text-text p-1 -mr-1 rounded"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {links.map((l) => {
            const active =
              mounted &&
              (path === l.href || (l.href !== "/" && path.startsWith(l.href)));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    active
                      ? "bg-accent text-white"
                      : "text-text hover:bg-surface2"
                  }`}
                >
                  <span aria-hidden className="text-xl shrink-0 w-6 text-center">
                    {l.icon}
                  </span>
                  <span className="text-sm font-medium">{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
