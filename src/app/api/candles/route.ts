import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { getCandles, isCandleRange } from "@/lib/api/service";

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range") ?? "24H";
  if (!isCandleRange(range)) return fail(400, "range must be one of 1H, 6H, 24H, 7D, ALL");
  try {
    return ok(await getCandles(range), range === "1H" ? 30 : 60);
  } catch (err) {
    return fail(502, err instanceof Error ? err.message : "candles unavailable");
  }
}
