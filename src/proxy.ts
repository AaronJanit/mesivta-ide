import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The only public pages are the sign-in form: the landing page itself and its
// /login alias. Everything else requires a session.
const PUBLIC_PATHS = ["/", "/login"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout", "/api/auth/me"];

// Static + Next internals
const INTERNAL_PREFIXES = ["/_next", "/favicon"];

// Public static assets (files with extensions in the public/ folder). Must
// never apply to API routes — /api/serve/x.js serves private project files.
const ASSET_RE = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|otf|eot|map)$/i;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow public API
  if (PUBLIC_API.includes(pathname)) return NextResponse.next();
  // Allow the sign-in form itself
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  // Static + Next internals
  if (INTERNAL_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  // Public static assets — but never API paths
  if (!pathname.startsWith("/api/") && ASSET_RE.test(pathname)) return NextResponse.next();

  const token = req.cookies.get("webide_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};