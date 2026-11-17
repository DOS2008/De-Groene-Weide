import { timingSafeEqual } from "node:crypto";
import { retryOutbox } from "@/lib/jobs/outbox";

/**
 * Background jobs, called every 15 minutes by the `cron` service in
 * compose (a curl loop) with the shared JOBS_SECRET. Each job is
 * idempotent: running it twice sends nothing twice.
 */
export async function POST(request: Request) {
  const secret = process.env.JOBS_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Forbidden", { status: 403 });
  }

  const results: Record<string, unknown> = {};
  for (const [name, job] of Object.entries(jobs)) {
    try {
      results[name] = await job();
    } catch (e) {
      console.error(`job ${name}:`, e instanceof Error ? e.message : e);
      results[name] = { error: true };
    }
  }
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}

const jobs: Record<string, () => Promise<unknown>> = {
  mailRetries: () => retryOutbox(),
};
