"use client";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "sport-suivi:pwa-install-dismissed";

/**
 * Enregistre le service worker (offline cache) + affiche un prompt
 * d'installation discret au premier signal `beforeinstallprompt`.
 */
export function PWAClient() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // true par défaut → on ne montre rien tant qu'on n'a pas vérifié

  useEffect(() => {
    // Service worker : prod uniquement (évite d'interférer avec le hot reload)
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW failed to register — pas grave, app fonctionne quand même */
      });
    }

    // Vérifie si l'utilisateur a déjà dismissé le prompt
    try {
      const isDismissed = localStorage.getItem(DISMISS_KEY) === "true";
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Une fois installée, l'événement appinstalled vide le prompt
    const onAppInstalled = () => {
      setInstallEvent(null);
      try {
        localStorage.setItem(DISMISS_KEY, "true");
      } catch {}
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!installEvent || dismissed) return null;

  async function install() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallEvent(null);
      }
    } catch {}
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {}
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-40 animate-fadeIn">
      <div className="bg-surface border border-accent/40 rounded-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            📲
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Installer MyFitnessBuddy</div>
            <p className="text-xs text-muted mt-0.5">
              Ajoute l'app à ton écran d'accueil pour un accès direct, sans barre de
              navigation.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={install}
                className="text-xs px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-md font-medium"
              >
                Installer
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="text-xs px-3 py-1.5 text-muted hover:text-text"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
