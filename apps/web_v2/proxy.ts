import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Auth screens — meaningful only to a signed-out visitor. A signed-in user who
// lands here (bookmark, back button, stale tab) is bounced into the app.
const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
]);

// Routes reachable without a session. Includes the auth screens above plus the
// mid-flow SSO callback (must not be bounced) and public legal pages.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/forgot-password(.*)",
  "/legal(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
