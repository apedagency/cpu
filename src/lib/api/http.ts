/** Server-side fetch helpers shared by the upstream adapters. */

const DEFAULT_TIMEOUT = 8_000;

export class UpstreamError extends Error {
  constructor(
    readonly source: string,
    message: string,
  ) {
    super(`${source}: ${message}`);
  }
}

/** GET JSON with a timeout, cached in Next's data cache for `revalidate` seconds. */
export async function getJson<T>(
  source: string,
  url: string,
  revalidate: number,
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err) {
    throw new UpstreamError(source, err instanceof Error ? err.message : "request failed");
  }
  if (!res.ok) throw new UpstreamError(source, `HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Tiny per-instance TTL memo for calls Next can't cache (JSON-RPC is POST).
 * Concurrent callers share the in-flight promise, so a burst of requests
 * produces one upstream call.
 */
const memo = new Map<string, { at: number; value: Promise<unknown> }>();

export function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load().catch((err) => {
    memo.delete(key);
    throw err;
  });
  memo.set(key, { at: Date.now(), value });
  return value;
}

export const finite = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
