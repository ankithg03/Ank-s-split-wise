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

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx|json?|xlsx?|zip|webmanifest|manifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
