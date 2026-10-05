export async function register() {
  // Guard against the edge runtime — this only needs to run once, in the
  // long-lived Node server process (this app is never deployed to edge).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPurgeScheduler } = await import("@/lib/jobs/purge-deleted-polls");
    startPurgeScheduler();
  }
}
