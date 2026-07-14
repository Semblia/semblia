import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { projectWallHostname } from "@/lib/walls/host-routing";
import { PublicWallUnavailableError, preflightProjectWall } from "@/lib/walls/public-wall";

// Auth screens — meaningful only to a signed-out visitor. A signed-in user who
// lands here (bookmark, back button, stale tab) is bounced into the app.
const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
]);

// Routes reachable without a session. Includes the auth screens above plus the
// mid-flow SSO callback (must not be bounced), public legal pages, and the
// hosted testimonial walls (public + indexable by design).
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/forgot-password(.*)",
  "/legal(.*)",
  "/wall(.*)",
]);

export const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  const { isAuthenticated } = await auth();

  // Forward gate: a signed-in user never sees the auth screens.
  if (isAuthenticated && isAuthRoute(request)) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  // Reverse gate: a signed-out user only reaches public routes; everything else
  // redirects to sign-in.
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

function privateResponse(status: number) {
  return new NextResponse(null, { status, headers: { "Cache-Control": "private, no-store" } });
}

export default async function proxy(request: NextRequest, event?: NextFetchEvent) {
  const hostname = projectWallHostname(request.headers.get("host"));
  if (!hostname) return authenticatedProxy(request, event as NextFetchEvent);
  const { pathname } = request.nextUrl;
  const rewritePath = pathname === "/" ? "/_wall-host" : pathname === "/robots.txt" ? "/_wall-host/robots.txt" : pathname === "/sitemap.xml" ? "/_wall-host/sitemap.xml" : /^\/w\/[^/]+$/.test(pathname) ? `/_wall-host${pathname}` : null;
  if (!rewritePath) return privateResponse(404);
  if (pathname === "/" || pathname.startsWith("/w/")) {
    try {
      let slug: string | undefined;
      try { slug = pathname.startsWith("/w/") ? decodeURIComponent(pathname.slice(3)) : undefined; } catch { return privateResponse(404); }
      const result = await preflightProjectWall(hostname, slug);
      if (result !== "ok") return privateResponse(404);
    } catch (error) {
      if (error instanceof PublicWallUnavailableError) return privateResponse(503);
      return privateResponse(503);
    }
  }
  const url = request.nextUrl.clone();
  url.pathname = rewritePath;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
