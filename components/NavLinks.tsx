"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY_TABS = [
  { href: "/", label: "Accueil", icon: "📊" },
  { href: "/seances", label: "Séances", icon: "🏋" },
  { href: "/journal", label: "Journal", icon: "📔" },
  { href: "/nutrition", label: "Nutrition", icon: "🍽️" },
];

const SECONDARY_LINKS = [
  { href: "/exercices", label: "Exercices", icon: "✏️" },
  { href: "/prs", label: "Records", icon: "🏆" },
  { href: "/trophees", label: "Trophées", icon: "🎖️" },
  { href: "/historique", label: "Historique", icon: "📅" },
  { href: "/courses", label: "Liste de courses", icon: "🛒" },
  { href: "/mesures", label: "Mesures", icon: "📏" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

function isActive(currentPath: string, linkHref: string): boolean {
  if (linkHref === "/") return currentPath === "/";
  return currentPath === linkHref || currentPath.startsWith(linkHref + "/");
}

export function NavLinks() {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const inSecondary =
    mounted && SECONDARY_LINKS.some((l) => isActive(path, l.href));

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto grid grid-cols-5">
          {PRIMARY_TABS.map((tab) => {
            const active = mounted && isActive(path, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors min-h-[56px] ${
                  active ? "text-accent" : "text-muted hover:text-text"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span className="text-[10px] leading-tight font-medium">
                  {tab.label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors min-h-[56px] ${
              inSecondary ? "text-accent" : "text-muted hover:text-text"
            }`}
            aria-label="Plus d'options"
            aria-expanded={moreOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[10px] leading-tight font-medium">Plus</span>
          </button>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        onClick={() => setMoreOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          moreOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Bottom sheet : liens secondaires */}
      <nav
        aria-label="Plus d'options"
        className={`fixed left-0 right-0 bottom-0 z-50 bg-surface border-t border-border rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto transform transition-transform duration-300 ease-out ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drag handle visuel */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs uppercase tracking-wider text-muted font-semibold">
            Plus d'options
          </span>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            aria-label="Fermer"
            className="text-muted hover:text-text p-1 -mr-1"
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

        <ul className="p-2 space-y-0.5">
          {SECONDARY_LINKS.map((l) => {
            const active = mounted && isActive(path, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    active ? "bg-accent text-white" : "text-text hover:bg-surface2"
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
