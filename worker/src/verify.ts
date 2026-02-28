import { Chain, Env, getResolvedRpcUrls } from "./chains";
import { DetectionResult, ExplorerUrl } from "./detect";

export type VerificationStatus = "found" | "not_found" | "unverified";

export interface VerifiedResult {
  chainId: string;
  chainName: string;
  symbol: string;
  family: string;
  inputType: string;
  explorerUrls: ExplorerUrl[];
  status: VerificationStatus;
  isToken?: boolean;
}

const REQUEST_TIMEOUT_MS = 6000;

// --- Endpoint failover ---

async function tryEndpoints(rpcUrls: string[], verifyFn: (url: string) => Promise<boolean>): Promise<boolean> {
  for (const url of rpcUrls) {
    try {
      return await verifyFn(url);
    } catch {
      // Try next endpoint
    }
  }
  throw new Error("All endpoints failed");
}

// --- Etherscan V2 helpers ---

async function etherscanV2Call(
  chainId: number,
  module: string,
  action: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<unknown> {
  const qs = new URLSearchParams({ chainid: String(chainId), module, action, apikey: apiKey, ...params });
  const response = await fetch(`https://api.etherscan.io/v2/api?${qs}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json()) as { status?: string; message?: string; result?: unknown };
  // Etherscan returns status "0" for errors (e.g. unsupported chain on free plan)
  if (json.status === "0") throw new Error(`Etherscan error: ${json.message}`);
  return json.result;
}

async function verifyEvmTxEtherscan(chainId: number, txHash: string, apiKey: string): Promise<boolean> {
  const result = await etherscanV2Call(chainId, "proxy", "eth_getTransactionReceipt", { txhash: txHash }, apiKey);
  return result != null;
}

async function verifyEvmAddrEtherscan(chainId: number, address: string, apiKey: string): Promise<boolean> {
  const [balance, nonce] = await Promise.all([
    etherscanV2Call(chainId, "proxy", "eth_getBalance", { address, tag: "latest" }, apiKey) as Promise<string | null>,
    etherscanV2Call(chainId, "proxy", "eth_getTransactionCount", { address, tag: "latest" }, apiKey) as Promise<
      string | null
    >,
  ]);
  const hasBalance = balance != null && balance !== "0x0" && balance !== "0x";
  const hasNonce = nonce != null && nonce !== "0x0" && nonce !== "0x";
  return hasBalance || hasNonce;
}

// --- Direct JSON-RPC helpers ---

async function evmRpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json()) as { result?: unknown };
  return json.result;
}

async function verifyEvmTxRpc(rpcUrl: string, txHash: string): Promise<boolean> {
  const result = await evmRpcCall(rpcUrl, "eth_getTransactionReceipt", [txHash]);
  return result != null;
}

async function verifyEvmAddrRpc(rpcUrl: string, address: string): Promise<boolean> {
  const [balance, nonce] = await Promise.all([
    evmRpcCall(rpcUrl, "eth_getBalance", [address, "latest"]) as Promise<string | null>,
    evmRpcCall(rpcUrl, "eth_getTransactionCount", [address, "latest"]) as Promise<string | null>,
  ]);
  const hasBalance = balance != null && balance !== "0x0" && balance !== "0x";
  const hasNonce = nonce != null && nonce !== "0x0" && nonce !== "0x";
  return hasBalance || hasNonce;
}

// --- Bitcoin ---

async function verifyBitcoinTx(apiUrl: string, txHash: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/tx/${txHash}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response.ok;
}

async function verifyBitcoinAddr(apiUrl: string, address: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/address/${address}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as {
    chain_stats?: { tx_count?: number; funded_txo_sum?: number };
    mempool_stats?: { tx_count?: number };
  };
  const chainTxCount = json.chain_stats?.tx_count ?? 0;
  const mempoolTxCount = json.mempool_stats?.tx_count ?? 0;
  return chainTxCount > 0 || mempoolTxCount > 0;
}

// --- Cosmos ---

async function verifyCosmosTx(restUrl: string, txHash: string): Promise<boolean> {
  const response = await fetch(`${restUrl}/cosmos/tx/v1beta1/txs/${txHash}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response.ok;
}

async function verifyCosmosAddr(restUrl: string, address: string): Promise<boolean> {
  // Check if account exists (has sequence > 0 or has balances)
  const [acctRes, balRes] = await Promise.all([
    fetch(`${restUrl}/cosmos/auth/v1beta1/accounts/${address}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    fetch(`${restUrl}/cosmos/bank/v1beta1/balances/${address}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  ]);
  if (acctRes.ok) {
    const acct = (await acctRes.json()) as { account?: { sequence?: string } };
    if (acct.account && acct.account.sequence !== "0") return true;
  }
  if (balRes.ok) {
    const bal = (await balRes.json()) as { balances?: { amount?: string }[] };
    if (bal.balances && bal.balances.length > 0 && bal.balances.some((b) => b.amount !== "0")) return true;
  }
  return false;
}

// --- Tron ---

async function verifyTronTx(apiUrl: string, txHash: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/wallet/gettransactionbyid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: txHash }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json()) as { txID?: string };
  return !!json.txID;
}

async function verifyTronAddr(apiUrl: string, address: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/wallet/getaccount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, visible: true }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { address?: string; balance?: number };
  return !!json.address;
}

// --- Solana ---

async function solanaRpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json()) as { result?: unknown; error?: unknown };
  if (json.error) return null;
  return json.result;
}

async function verifySolanaTx(rpcUrl: string, signature: string): Promise<boolean> {
  const result = await solanaRpcCall(rpcUrl, "getTransaction", [signature, { encoding: "json", maxSupportedTransactionVersion: 0 }]);
  return result != null;
}

async function verifySolanaAddr(rpcUrl: string, address: string): Promise<boolean> {
  const result = (await solanaRpcCall(rpcUrl, "getAccountInfo", [address, { encoding: "base64" }])) as {
    value?: { lamports?: number } | null;
  } | null;
  return result?.value != null;
}

// --- Sui ---

async function suiRpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json()) as { result?: unknown; error?: unknown };
  if (json.error) return null;
  return json.result;
}

async function verifySuiTx(rpcUrl: string, digest: string): Promise<boolean> {
  const result = await suiRpcCall(rpcUrl, "sui_getTransactionBlock", [digest, { showInput: false }]);
  return result != null;
}

async function verifySuiAddr(rpcUrl: string, address: string): Promise<boolean> {
  const result = (await suiRpcCall(rpcUrl, "suix_getBalance", [address])) as {
    totalBalance?: string;
  } | null;
  return result != null && result.totalBalance !== "0";
}

// --- Aptos ---

async function verifyAptosTx(apiUrl: string, txHash: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/transactions/by_hash/${txHash}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response.ok;
}

async function verifyAptosAddr(apiUrl: string, address: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/accounts/${address}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { sequence_number?: string };
  // Aptos returns 200 for any valid-format address; check for actual activity
  return json.sequence_number != null && json.sequence_number !== "0";
}

// --- TON ---

async function verifyTonTx(apiUrl: string, txHash: string): Promise<boolean> {
  // TON Center v2 doesn't have a direct tx-by-hash lookup easily,
  // so we just return unverified for TON txs for now
  return false;
}

async function verifyTonAddr(apiUrl: string, address: string): Promise<boolean> {
  const response = await fetch(`${apiUrl}/getAddressInformation?address=${encodeURIComponent(address)}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { ok?: boolean; result?: { balance?: string; state?: string } };
  if (!json.ok) return false;
  const state = json.result?.state;
  return state === "active" || state === "frozen";
}

// --- Polkadot ---

async function verifyPolkadotTx(rpcUrl: string, _txHash: string): Promise<boolean> {
  // Substrate RPCs don't support tx lookup by hash without an indexer
  return false;
}

async function verifyPolkadotAddr(rpcUrl: string, address: string): Promise<boolean> {
  // Use Substrate RPC system.account to check if an account has balance/nonce
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "system_account", params: [address] }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  // This won't work with the simple publicnode HTTP endpoint, so fall back to unverified
  if (!response.ok) return false;
  const json = (await response.json()) as { result?: { nonce?: number; data?: { free?: string } }; error?: unknown };
  if (json.error || !json.result) return false;
  const nonce = json.result.nonce ?? 0;
  const free = json.result.data?.free ?? "0";
  return nonce > 0 || (free !== "0" && free !== "0x0000000000000000000000000000000000");
}

// --- NEAR ---

async function nearRpcCall(rpcUrl: string, method: string, params: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await response.json()) as { result?: unknown; error?: unknown };
  if (json.error) return null;
  return json.result;
}

async function verifyNearTx(rpcUrl: string, txHash: string): Promise<boolean> {
  // NEAR tx query requires sender_id which we don't have — use EXPERIMENTAL_tx_status
  const result = await nearRpcCall(rpcUrl, "EXPERIMENTAL_tx_status", { tx_hash: txHash, wait_until: "NONE" });
  return result != null;
}

async function verifyNearAddr(rpcUrl: string, accountId: string): Promise<boolean> {
  const result = (await nearRpcCall(rpcUrl, "query", {
    request_type: "view_account",
    finality: "final",
    account_id: accountId,
  })) as { amount?: string } | null;
  return result != null;
}

// --- Alchemy Portfolio API (batched EVM address verification) ---

interface PortfolioToken {
  address: string;
  network: string;
  tokenAddress: string | null;
  tokenBalance: string;
}

interface PortfolioResponse {
  data?: { tokens?: PortfolioToken[] };
}

const PORTFOLIO_BATCH_SIZE = 5; // max networks per address per Alchemy docs

async function verifyEvmAddrsBatch(
  address: string,
  detections: DetectionResult[],
  env: Env,
): Promise<Map<string, VerificationStatus>> {
  const apiKey = env.ALCHEMY_API_KEY;
  if (!apiKey) return new Map();

  // Build mapping: alchemyNetwork → chainId for chains that support Portfolio API
  const networkToChainId = new Map<string, string>();
  for (const d of detections) {
    if (d.chain.alchemyNetwork) {
      networkToChainId.set(d.chain.alchemyNetwork, d.chain.id);
    }
  }

  const allNetworks = [...networkToChainId.keys()];
  if (allNetworks.length === 0) return new Map();

  // Split into batches of 5
  const batches: string[][] = [];
  for (let i = 0; i < allNetworks.length; i += PORTFOLIO_BATCH_SIZE) {
    batches.push(allNetworks.slice(i, i + PORTFOLIO_BATCH_SIZE));
  }

  const results = new Map<string, VerificationStatus>();

  // Fire all batches in parallel
  const batchResults = await Promise.allSettled(
    batches.map(async (networks) => {
      const response = await fetch(
        `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addresses: [{ address, networks }],
            withMetadata: false,
            withPrices: false,
            includeNativeTokens: true,
            includeErc20Tokens: true,
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (!response.ok) throw new Error(`Portfolio API ${response.status}`);
      const json = (await response.json()) as PortfolioResponse;
      return { networks, tokens: json.data?.tokens ?? [] };
    }),
  );

  for (const settled of batchResults) {
    if (settled.status !== "fulfilled") continue;
    const { networks, tokens } = settled.value;

    // Collect networks that had any token returned
    const activeNetworks = new Set(tokens.map((t) => t.network));

    for (const network of networks) {
      const chainId = networkToChainId.get(network)!;
      results.set(chainId, activeNetworks.has(network) ? "found" : "not_found");
    }
  }

  return results;
}

// --- Token detection via CoinGecko ---

export interface TokenInfo {
  isToken: boolean;
  coinGeckoUrl?: string;
  tokenChainIds: Set<string>; // which chains this address is a token on
}

export async function checkTokenStatus(
  address: string,
  detections: DetectionResult[],
): Promise<TokenInfo> {
  // Only check for address inputs, not transactions
  if (detections.length === 0 || detections[0].inputType !== "address") {
    return { isToken: false, tokenChainIds: new Set() };
  }

  // Prefer Ethereum, then try other chains with CoinGecko platform IDs
  const withPlatform = detections
    .filter((d) => d.chain.coingeckoPlatformId)
    .sort((a, b) => (a.chain.id === "ethereum" ? -1 : b.chain.id === "ethereum" ? 1 : 0));

  for (const detection of withPlatform) {
    try {
      const platformId = detection.chain.coingeckoPlatformId!;
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${address.toLowerCase()}`,
        {
          headers: { "Accept": "application/json", "User-Agent": "crypto-lookup-worker/1.0" },
          signal: AbortSignal.timeout(4000),
        },
      );
      if (!resp.ok) continue;
      const data = (await resp.json()) as { id?: string; web_slug?: string; platforms?: Record<string, string> };
      const slug = data.web_slug ?? data.id;
      if (slug) {
        // Build set of chain IDs where this address is actually the token contract
        const tokenChainIds = new Set<string>();
        const platformToChainId = new Map(
          withPlatform.map((d) => [d.chain.coingeckoPlatformId!, d.chain.id]),
        );
        if (data.platforms) {
          for (const [platform, addr] of Object.entries(data.platforms)) {
            if (addr.toLowerCase() === address.toLowerCase()) {
              const chainId = platformToChainId.get(platform);
              if (chainId) tokenChainIds.add(chainId);
            }
          }
        }
        // Always include the chain we queried (we know the address matches)
        tokenChainIds.add(detection.chain.id);
        return { isToken: true, coinGeckoUrl: `https://www.coingecko.com/en/coins/${slug}`, tokenChainIds };
      }
    } catch {
      continue;
    }
  }
  return { isToken: false, tokenChainIds: new Set() };
}

// --- Main verification ---

async function verifyEvm(chain: Chain, inputType: string, input: string, env: Env): Promise<boolean> {
  // Try Etherscan V2 first
  if (chain.etherscanChainId && env.ETHERSCAN_API_KEY) {
    try {
      if (inputType === "transaction") {
        return await verifyEvmTxEtherscan(chain.etherscanChainId, input, env.ETHERSCAN_API_KEY);
      } else {
        return await verifyEvmAddrEtherscan(chain.etherscanChainId, input, env.ETHERSCAN_API_KEY);
      }
    } catch {
      // Etherscan failed (unsupported chain, rate limit, etc.) — fall through to RPC
    }
  }

  // Fallback to RPC endpoints with failover
  const rpcUrls = getResolvedRpcUrls(chain, env);
  if (rpcUrls.length === 0) throw new Error("No verification method available");

  return tryEndpoints(rpcUrls, (url) => {
    if (inputType === "transaction") {
      return verifyEvmTxRpc(url, input);
    } else {
      return verifyEvmAddrRpc(url, input);
    }
  });
}

async function verifySingle(result: DetectionResult, input: string, env: Env): Promise<VerificationStatus> {
  const { chain, inputType } = result;
  const isTx = inputType === "transaction";
  const rpcUrls = getResolvedRpcUrls(chain, env);

  if (rpcUrls.length === 0 && chain.family !== "evm") return "unverified";

  try {
    let found: boolean;

    switch (chain.family) {
      case "evm":
        found = await verifyEvm(chain, inputType, input, env);
        break;
      case "bitcoin":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyBitcoinTx(url, input) : verifyBitcoinAddr(url, input),
        );
        break;
      case "cosmos":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyCosmosTx(url, input) : verifyCosmosAddr(url, input),
        );
        break;
      case "tron":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyTronTx(url, input) : verifyTronAddr(url, input),
        );
        break;
      case "solana":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifySolanaTx(url, input) : verifySolanaAddr(url, input),
        );
        break;
      case "sui":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifySuiTx(url, input) : verifySuiAddr(url, input),
        );
        break;
      case "aptos":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyAptosTx(url, input) : verifyAptosAddr(url, input),
        );
        break;
      case "ton":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyTonTx(url, input) : verifyTonAddr(url, input),
        );
        break;
      case "polkadot":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyPolkadotTx(url, input) : verifyPolkadotAddr(url, input),
        );
        break;
      case "near":
        found = await tryEndpoints(rpcUrls, (url) =>
          isTx ? verifyNearTx(url, input) : verifyNearAddr(url, input),
        );
        break;
      default:
        return "unverified";
    }

    return found ? "found" : "not_found";
  } catch {
    return "unverified";
  }
}

export async function verifyResults(
  input: string,
  results: DetectionResult[],
  env: Env,
): Promise<VerifiedResult[]> {
  const trimmed = input.trim();

  // Separate EVM address detections (candidates for batch) from everything else
  const evmAddrDetections = results.filter(
    (r) => r.chain.family === "evm" && r.inputType === "address",
  );
  const otherDetections = results.filter(
    (r) => r.chain.family !== "evm" || r.inputType !== "address",
  );

  // Batch-verify EVM addresses via Portfolio API
  const batchStatuses = evmAddrDetections.length > 0
    ? await verifyEvmAddrsBatch(trimmed, evmAddrDetections, env)
    : new Map<string, VerificationStatus>();

  // For EVM addresses not covered by batch (Fantom, API failure), fall back to verifySingle
  const evmFallbacks = evmAddrDetections.filter(
    (r) => !batchStatuses.has(r.chain.id),
  );

  // Verify fallbacks + non-EVM in parallel
  const fallbackAndOther = [...evmFallbacks, ...otherDetections];
  const singleStatuses = new Map<string, VerificationStatus>();
  await Promise.all(
    fallbackAndOther.map(async (r) => {
      const status = await verifySingle(r, trimmed, env);
      singleStatuses.set(r.chain.id, status);
    }),
  );

  // Assemble final results in original order
  return results.map((r) => ({
    chainId: r.chain.id,
    chainName: r.chain.name,
    symbol: r.chain.symbol,
    family: r.chain.family,
    inputType: r.inputType,
    explorerUrls: r.explorerUrls,
    status: batchStatuses.get(r.chain.id) ?? singleStatuses.get(r.chain.id) ?? "unverified",
  }));
}
