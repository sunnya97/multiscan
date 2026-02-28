import { CHAINS, Env } from "./chains";
import { detect } from "./detect";
import { resolveNameService } from "./resolve";
import { TokenInfo, VerifiedResult, checkTokenStatus, verifyResults } from "./verify";

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

    // Try name resolution first (e.g. vitalik.eth → 0x...)
    const resolution = await resolveNameService(input, env, CHAINS);
    const lookupInput = resolution?.resolvedAddress ?? input;

    // Detect matches
    const detections = detect(lookupInput, CHAINS);
    if (detections.length === 0) {
      // If input looked like a name but didn't resolve, signal that
      if (resolution === null && /\.(eth|sol|bnb|osmo|cosmos)$/i.test(input)) {
        return jsonResponse({ results: [], nameNotFound: true });
      }
      return jsonResponse({ results: [] });
    }

    // Detection-only mode (Phase 1 with multiple matches) — return immediately without verification or token check
    if (!verify && detections.length > 1) {
      const results: VerifiedResult[] = detections.map((d) => ({
        chainId: d.chain.id,
        chainName: d.chain.name,
        symbol: d.chain.symbol,
        family: d.chain.family,
        inputType: d.inputType,
        explorerUrls: d.explorerUrls,
        status: "unverified" as const,
      }));
      return jsonResponse({ results, ...resolution && { resolvedName: resolution.resolvedName, resolvedAddress: resolution.resolvedAddress } });
    }

    // Single match: skip verification but still check for tokens
    // Multiple matches: verify + token check in parallel
    const [verified, tokenInfo] = detections.length === 1
      ? [
          detections.map((d): VerifiedResult => ({
            chainId: d.chain.id,
            chainName: d.chain.name,
            symbol: d.chain.symbol,
            family: d.chain.family,
            inputType: d.inputType,
            explorerUrls: d.explorerUrls,
            status: "unverified" as const,
          })),
          await checkTokenStatus(lookupInput, detections),
        ]
      : await Promise.all([
          verifyResults(lookupInput, detections, env),
          checkTokenStatus(lookupInput, detections),
        ]);

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

    // Attach token flag and rewrite explorer URLs to token pages (only for chains where address is actually a token)
    if (tokenInfo.isToken) {
      const chainMap = new Map(CHAINS.map((c) => [c.id, c]));
      results = results.map((r) => {
        if (!tokenInfo.tokenChainIds.has(r.chainId)) return r;
        const chain = chainMap.get(r.chainId);
        if (!chain) return { ...r, isToken: true };
        return {
          ...r,
          isToken: true,
          explorerUrls: chain.explorers.map((explorer) => {
            const path = explorer.tokenPath ?? explorer.addressPath;
            return { name: explorer.name, url: `${explorer.baseUrl}${path.replace("{query}", lookupInput)}` };
          }),
        };
      });
    }

    return jsonResponse({
      results,
      ...resolution && { resolvedName: resolution.resolvedName, resolvedAddress: resolution.resolvedAddress },
      ...tokenInfo.isToken && { coinGeckoUrl: tokenInfo.coinGeckoUrl },
    });
  },
};
