/** Shared JSON responses for the API routes. */

export function ok(body: unknown, sMaxAge: number) {
  return Response.json(body, {
    headers: {
      "cache-control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}`,
    },
  });
}

export function fail(status: number, message: string) {
  return Response.json(
    { error: message },
    { status, headers: { "cache-control": "no-store" } },
  );
}
