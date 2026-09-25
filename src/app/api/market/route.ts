import { fail, ok } from "@/lib/api/respond";
import { getMarket } from "@/lib/api/service";

export async function GET() {
  try {
    return ok(await getMarket(), 15);
  } catch (err) {
    return fail(502, err instanceof Error ? err.message : "market unavailable");
  }
}
