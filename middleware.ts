import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password"];
const PUBLIC_API_PREFIXES = ["/api/auth/"];
const COOKIE_NAME = "sport_suivi_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass : public assets, Next internals, et routes d'auth publiques
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/apple-") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get(COOKIE_NAME)?.value;
  if (hasSession) return NextResponse.next();

  // Pas de cookie → redirige vers /login pour les pages, 401 pour les API.
  // NB : le middleware ne peut pas valider la session côté DB (Edge runtime,
  // pas de Prisma). La redirection "déjà connecté → /" est faite dans les
  // pages d'auth elles-mêmes (Server Components) pour distinguer un cookie
  // valide d'un cookie périmé et éviter une boucle de redirections.
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
