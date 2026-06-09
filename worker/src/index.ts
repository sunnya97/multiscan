import { CHAINS, Env, RateLimiter } from "./chains";
import { detect } from "./detect";
import { resolveNameService } from "./resolve";
import { checkExistingSuggestion, createSuggestion } from "./suggest";
import {
  VerifiedResult,
  detectTokens,
  getCoinGeckoUrl,
  verifyResults,
} from "./verify";

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

// Anti-DoS guard: longest legitimate input (a Cardano Byron address) is ~110
// chars. 512 leaves generous headroom for future long formats while rejecting
// oversized payloads. Per-format length is already enforced by detection regexes.
const MAX_INPUT_LENGTH = 512;
const MAX_NETWORK_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

/** Per-client key for rate limiting, derived from Cloudflare's connecting IP. */
function clientKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

/**
 * Returns true if the request should be blocked. Fails open when the binding is
 * absent (local dev / tests) or the limiter errors, so availability is never
 * worse than today.
 */
async function isRateLimited(
  limiter: RateLimiter | undefined,
  key: string,
): Promise<boolean> {
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch {
    return false;
  }
}

/** Collapse to a single line and cap length — used for the GitHub issue title. */
function sanitizeNetworkName(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, MAX_NETWORK_NAME_LENGTH);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // POST /api/suggest/check — check for existing network suggestions
    if (url.pathname === "/api/suggest/check" && request.method === "POST") {
      if (await isRateLimited(env.SUGGEST_RATE_LIMITER, clientKey(request))) {
        return jsonResponse({ error: "Too many requests" }, 429);
      }
      try {
        const body = (await request.json()) as { networkName?: string };
        const networkName = sanitizeNetworkName(body.networkName ?? "");
        if (!networkName) {
          return jsonResponse({ error: "Missing networkName" }, 400);
        }
        const result = await checkExistingSuggestion(networkName, env);
        return jsonResponse(result);
      } catch {
        return jsonResponse({ error: "Failed to check suggestions" }, 500);
      }
    }

    // POST /api/suggest/create — create a new suggestion or upvote existing
    if (url.pathname === "/api/suggest/create" && request.method === "POST") {
      if (await isRateLimited(env.SUGGEST_RATE_LIMITER, clientKey(request))) {
        return jsonResponse({ error: "Too many requests" }, 429);
      }
      try {
        const body = (await request.json()) as {
          networkName?: string;
          description?: string;
        };
        const networkName = sanitizeNetworkName(body.networkName ?? "");
        if (!networkName) {
          return jsonResponse({ error: "Missing networkName" }, 400);
        }
        const description = (body.description ?? "")
          .trim()
          .slice(0, MAX_DESCRIPTION_LENGTH);
        const result = await createSuggestion(
          networkName,
          description || undefined,
          env,
        );
        return jsonResponse(result);
      } catch {
        return jsonResponse({ error: "Failed to create suggestion" }, 500);
      }
    }

    // Only accept POST /api/lookup
    if (url.pathname !== "/api/lookup" || request.method !== "POST") {
      return jsonResponse({ error: "POST /api/lookup expected" }, 404);
    }

    if (await isRateLimited(env.LOOKUP_RATE_LIMITER, clientKey(request))) {
      return jsonResponse({ error: "Too many requests" }, 429);
    }

    let input: string;
    let verify = true;
    try {
      const body = (await request.json()) as {
        input?: string;
        verify?: boolean;
      };
      input = (body.input ?? "").trim();
      if (body.verify === false) verify = false;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!input) {
      return jsonResponse({ error: "Missing input" }, 400);
    }

    if (input.length > MAX_INPUT_LENGTH) {
      return jsonResponse({ error: "Input too long" }, 400);
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
        ...(d.chain.isTestnet && { isTestnet: true }),
      }));
      return jsonResponse({
        results,
        ...(resolution && {
          resolvedName: resolution.resolvedName,
          resolvedAddress: resolution.resolvedAddress,
        }),
      });
    }

    // Single match: skip verification but still detect tokens + CoinGecko URL
    // Multiple matches: verify + detect tokens + CoinGecko URL all in parallel
    const [verified, tokenChainIds, coinGeckoUrl] =
      detections.length === 1
        ? await Promise.all([
            Promise.resolve(
              detections.map(
                (d): VerifiedResult => ({
                  chainId: d.chain.id,
                  chainName: d.chain.name,
                  symbol: d.chain.symbol,
                  family: d.chain.family,
                  inputType: d.inputType,
                  explorerUrls: d.explorerUrls,
                  status: "unverified" as const,
                  ...(d.chain.isTestnet && { isTestnet: true }),
                }),
              ),
            ),
            detectTokens(lookupInput, detections, env),
            getCoinGeckoUrl(lookupInput, detections),
          ])
        : await Promise.all([
            verifyResults(lookupInput, detections, env),
            detectTokens(lookupInput, detections, env),
            getCoinGeckoUrl(lookupInput, detections),
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
        results = verified.map((r) => ({
          ...r,
          status: "unverified" as const,
        }));
      }
    } else {
      results = verified;
    }

    // Attach token flag and rewrite explorer URLs to token pages (only for chains where address is actually a token)
    if (tokenChainIds.size > 0) {
      const chainMap = new Map(CHAINS.map((c) => [c.id, c]));
      results = results.map((r) => {
        if (!tokenChainIds.has(r.chainId)) return r;
        const chain = chainMap.get(r.chainId);
        if (!chain) return { ...r, isToken: true };
        return {
          ...r,
          isToken: true,
          explorerUrls: chain.explorers.map((explorer) => {
            const path = explorer.tokenPath ?? explorer.addressPath;
            return {
              name: explorer.name,
              url: `${explorer.baseUrl}${path.replace("{query}", lookupInput)}`,
            };
          }),
        };
      });
    }

    // Denom results are always tokens — set isToken and rewrite explorer URLs to denomPath
    const isDenom =
      detections.length > 0 && detections[0].inputType === "denom";
    if (isDenom) {
      const chainMap = new Map(CHAINS.map((c) => [c.id, c]));
      results = results.map((r) => {
        const chain = chainMap.get(r.chainId);
        if (!chain) return { ...r, isToken: true };
        const denomUrls = chain.explorers
          .filter((explorer) => explorer.denomPath)
          .map((explorer) => ({
            name: explorer.name,
            url: `${explorer.baseUrl}${explorer.denomPath!.replace("{query}", encodeURIComponent(lookupInput))}`,
          }));
        return {
          ...r,
          isToken: true,
          explorerUrls: denomUrls.length > 0 ? denomUrls : r.explorerUrls,
        };
      });
    }

    return jsonResponse({
      results,
      ...(resolution && {
        resolvedName: resolution.resolvedName,
        resolvedAddress: resolution.resolvedAddress,
      }),
      ...(coinGeckoUrl && { coinGeckoUrl }),
    });
  },
};
