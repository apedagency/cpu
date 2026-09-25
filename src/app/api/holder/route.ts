import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { getHolder, isAddress } from "@/lib/api/service";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (!isAddress(address)) return fail(400, "address must be a 0x-prefixed 20-byte hex address");
  try {
    return ok(await getHolder(address), 15);
  } catch (err) {
    return fail(502, err instanceof Error ? err.message : "holder read unavailable");
  }
}
