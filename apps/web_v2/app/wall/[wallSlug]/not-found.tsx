/**
 * Public wall 404 — a wall that doesn't exist or has been paused. Minimal and
 * unbranded-visitor-safe: no app chrome, no auth assumptions.
 */
export default function WallNotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        This wall isn&rsquo;t here
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        The wall you&rsquo;re looking for doesn&rsquo;t exist or is no longer
        published.
      </p>
      <a
        href="https://semblia.com"
        className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        semblia.com
      </a>
    </main>
  );
}
