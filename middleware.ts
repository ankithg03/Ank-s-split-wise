import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/public/manifest.json',
  '/manifest.json',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/', 
  // Exclude the manifest.json route
  // Add any other public routes as needed
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const authentication = await auth()
    if (!authentication.userId) {
      authentication.redirectToSignIn()
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|json|png|gif|svg|ttf|woff2?|ico|csv|docx|json?|xlsx?|zip|webmanifest|manifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
