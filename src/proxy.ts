import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout", "/api/auth/me"];

// Keep workspace pages easy to inspect locally when Supabase credentials are
// not present. Production uses the normal authenticated workspace flow.
const LOCAL_WORKSPACE_PATHS = ["/docs", "/dashboard", "/challenges"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow public API
  if (PUBLIC_API.includes(pathname)) return NextResponse.next();
  // Allow the public shell and, during local development, workspace pages.
  if (
    PUBLIC_PATHS.includes(pathname) ||
    (process.env.NODE_ENV !== "production" &&
      LOCAL_WORKSPACE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)))
  ) {
    return NextResponse.next();
  }
  // Static + Next internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();
  // Public static assets (files with extensions in the public/ folder)
  if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|otf|eot|map)$/i.test(pathname)) return NextResponse.next();

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