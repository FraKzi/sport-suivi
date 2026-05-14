import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];
const COOKIE_NAME = "sport_suivi_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass : public assets et Next internals (laissés passer sans aucun check)
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/apple-") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get(COOKIE_NAME)?.value;
  const isPublicPage = PUBLIC_ROUTES.includes(pathname);
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  // Session présente + cible une page d'auth → on dégage l'utilisateur vers la
  // destination demandée (?redirect=) ou la home. Évite le cas "déjà connecté
  // mais bloqué sur /login".
  if (hasSession && isPublicPage) {
    const url = req.nextUrl.clone();
    const target = req.nextUrl.searchParams.get("redirect");
    url.pathname = target && target.startsWith("/") ? target : "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  if (hasSession) return NextResponse.next();

  // Pas de cookie → redirige vers /login pour les pages, 401 pour les API
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Tous les paths sauf les assets statiques explicites
  matcher: ["/((?!_next/static|_next/image).*)"],
};
