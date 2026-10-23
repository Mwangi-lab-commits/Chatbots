import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next.js 16 proxy file (the new name for middleware).
 *
 * This file runs the Clerk session handling before each request. The staff
 * pages call `auth.protect()` in `src/app/admin/layout.tsx`. That check is
 * a resource-based check. It is safer than a path match. See the Clerk
 * migration guide: "migrate from createRouteMatcher".
 */
export default clerkMiddleware({ signInUrl: "/sign-in" });

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
