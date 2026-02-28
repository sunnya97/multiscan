import { CHAINS, Env } from "./chains";
import { detect } from "./detect";
import { VerifiedResult, verifyResults } from "./verify";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Only accept POST /lookup
    const url = new URL(request.url);
    if (url.pathname !== "/lookup" || request.method !== "POST") {
      return jsonResponse({ error: "POST /lookup expected" }, 404);
    }

    let input: string;
    let verify = true;
    try {
      const body = (await request.json()) as { input?: string; verify?: boolean };
      input = (body.input ?? "").trim();
      if (body.verify === false) verify = false;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!input) {
      return jsonResponse({ error: "Missing input" }, 400);
    }

    // Detect matches
    const detections = detect(input, CHAINS);
    if (detections.length === 0) {
      return jsonResponse({ results: [] });
    }

    // Detection-only mode or single match — return immediately without verification
    if (!verify || detections.length === 1) {
      const results: VerifiedResult[] = detections.map((d) => ({
        chainId: d.chain.id,
        chainName: d.chain.name,
        symbol: d.chain.symbol,
        family: d.chain.family,
        inputType: d.inputType,
        explorerUrls: d.explorerUrls,
        status: "unverified" as const,
      }));
      return jsonResponse({ results });
    }

    // Multiple matches — verify in parallel
    const verified = await verifyResults(input, detections, env);

    // Filter results
    const inputType = detections[0].inputType;
    const isTransaction = inputType === "transaction";
    const isAddress = inputType === "address";

    let results: VerifiedResult[];

    if (isTransaction) {
      // For transactions: omit not_found
      results = verified.filter((r) => r.status !== "not_found");
    } else if (isAddress) {
      // For addresses: if no chain has activity, return all as unverified
      const hasFound = verified.some((r) => r.status === "found");
      if (hasFound) {
        // Return found + unverified, omit not_found
        results = verified.filter((r) => r.status !== "not_found");
      } else {
        // No activity anywhere — return all as unverified fallback
        results = verified.map((r) => ({ ...r, status: "unverified" as const }));
      }
    } else {
      results = verified;
    }

    return jsonResponse({ results });
  },
};
