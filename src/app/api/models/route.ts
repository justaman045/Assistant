export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OpenRouter API key not configured", { status: 500 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // Cache on the server for 1 hour so we don't hammer the API on every page load
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return new Response("Failed to fetch models from OpenRouter", { status: res.status });
  }

  const json = await res.json();

  // Sort alphabetically by model name before sending to client
  const models = (json.data ?? []).sort((a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name)
  );

  return Response.json(models, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
