import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { sessionClaims, redirectToSignIn } = await auth();

  // Allow public routes (sign-in, sign-up) for everyone
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to sign-in
  if (!sessionClaims) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // If authenticated but on onboarding route, allow it
  if (isOnboardingRoute(req)) {
    return NextResponse.next();
  }

  // If authenticated but onboarding not complete, redirect to /onboarding
  const metadata = sessionClaims.metadata as
    | { onboardingComplete?: boolean }
    | undefined;
  if (!metadata?.onboardingComplete) {
    const onboardingUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
