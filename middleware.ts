// Only use Clerk middleware if the publishable key is set
// This prevents build errors when keys are not configured
let middleware: any;

try {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { clerkMiddleware } = require("@clerk/nextjs/server");
    middleware = clerkMiddleware();
  } else {
    // No-op middleware when Clerk is not configured
    middleware = (req: any) => {
      return new Response(null, { status: 200 });
    };
  }
} catch (error) {
  // Fallback if Clerk fails to initialize
  middleware = (req: any) => {
    return new Response(null, { status: 200 });
  };
}

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

