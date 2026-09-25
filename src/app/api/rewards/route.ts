import { fail, ok } from "@/lib/api/respond";
import { getRewards } from "@/lib/api/service";

export async function GET() {
  try {
    return ok(await getRewards(), 20);
  } catch (err) {
    return fail(502, err instanceof Error ? err.message : "rewards unavailable");
  }
}
