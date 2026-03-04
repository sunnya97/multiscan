import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyResults, detectTokens, getCoinGeckoUrl, type VerifiedResult } from "./verify";
import { detect, type DetectionResult } from "./detect";
import { CHAINS, type Env } from "./chains";

// --- Fetch mock helpers ---

type FetchFn = typeof globalThis.fetch;

let mockFetch: ReturnType<typeof vi.fn<FetchFn>>;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch = vi.fn<FetchFn>();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Route fetch by URL substring and optionally by request body content */
function routeFetch(routes: Array<{ match: string | ((url: string, body?: string) => boolean); response: Response | (() => Response) }>) {
  mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === "string" ? init.body : undefined;
    for (const route of routes) {
      if (typeof route.match === "string") {
        if (url.includes(route.match)) {
          return typeof route.response === "function" ? route.response() : route.response;
        }
      } else if (route.match(url, body)) {
        return typeof route.response === "function" ? route.response() : route.response;
      }
    }
    return new Response("Not found", { status: 404 });
  });
}

// --- EVM verification ---

describe("EVM verification", () => {
  const env: Env = { ALCHEMY_API_KEY: "test-key", ETHERSCAN_API_KEY: "eth-key" };
  const addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  it("uses Portfolio API for batch EVM address verification (found)", async () => {
    routeFetch([
      {
        match: "api.g.alchemy.com/data/v1",
        response: jsonResponse({
          data: {
            tokens: [
              { address: addr, network: "eth-mainnet", tokenAddress: null, tokenBalance: "100" },
            ],
          },
        }),
      },
      // Fallback for chains not covered by batch (e.g., Fantom has no alchemyNetwork)
      {
        match: "rpcapi.fantom.network",
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x0" }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);

    const ethResult = results.find((r) => r.chainId === "ethereum")!;
    expect(ethResult.status).toBe("found");
  });

  it("uses Portfolio API - not_found when no tokens", async () => {
    routeFetch([
      {
        match: "api.g.alchemy.com/data/v1",
        response: jsonResponse({ data: { tokens: [] } }),
      },
      {
        match: (url) => url.includes("fantom") || url.includes("publicnode"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x0" }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);

    const ethResult = results.find((r) => r.chainId === "ethereum")!;
    expect(ethResult.status).toBe("not_found");
  });

  it("falls back to RPC for EVM chains without Alchemy (Fantom)", async () => {
    // Portfolio API returns nothing for Fantom (no alchemyNetwork)
    routeFetch([
      { match: "api.g.alchemy.com/data/v1", response: () => jsonResponse({ data: { tokens: [] } }) },
      {
        // Fantom falls back to RPC since it has no etherscanChainId
        match: "rpcapi.fantom.network",
        response: () => jsonResponse({
          jsonrpc: "2.0",
          id: 1,
          result: "0x1", // has balance
        }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);

    const fantomResult = results.find((r) => r.chainId === "fantom")!;
    expect(fantomResult.status).toBe("found");
  });

  it("verifies EVM tx via Etherscan V2", async () => {
    const txHash = "0x" + "b".repeat(64);
    routeFetch([
      {
        match: "api.etherscan.io/v2/api",
        response: jsonResponse({ status: "1", result: { blockHash: "0x..." } }),
      },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "ethereum");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("EVM tx Etherscan null result → not_found", async () => {
    const txHash = "0x" + "b".repeat(64);
    routeFetch([
      {
        match: "api.etherscan.io/v2/api",
        response: jsonResponse({ status: "1", result: null }),
      },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "ethereum");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("not_found");
  });

  it("falls back to RPC when Etherscan fails", async () => {
    const txHash = "0x" + "b".repeat(64);
    routeFetch([
      {
        match: "api.etherscan.io",
        response: jsonResponse({ status: "0", message: "NOTOK" }),
      },
      {
        match: (url) => url.includes("alchemy.com/v2") || url.includes("publicnode"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { blockHash: "0x..." } }),
      },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "ethereum");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Bitcoin verification ---

describe("Bitcoin verification", () => {
  const env: Env = {};

  it("tx found → ok response", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      { match: "mempool.space/api/tx/", response: new Response("tx data", { status: 200 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "bitcoin");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("tx not found → 404", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      { match: "mempool.space/api/tx/", response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "bitcoin");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("not_found");
  });

  it("address with tx_count > 0 → found", async () => {
    const addr = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    routeFetch([
      {
        match: "mempool.space/api/address/",
        response: jsonResponse({ chain_stats: { tx_count: 5 }, mempool_stats: { tx_count: 0 } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Cosmos verification ---

describe("Cosmos verification", () => {
  const env: Env = {};

  it("tx found via REST", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      // Only cosmos hub
      {
        match: "cosmos-rest.publicnode.com/cosmos/tx",
        response: new Response("{}", { status: 200 }),
      },
      // All others 404
      { match: (url) => url.includes("/cosmos/tx"), response: new Response("", { status: 404 }) },
      // Address/balance checks for non-tx matches
      { match: (url) => url.includes("/cosmos/auth") || url.includes("/cosmos/bank"), response: new Response("{}", { status: 404 }) },
      // Other RPCs
      { match: (url) => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "cosmos");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with sequence > 0 → found", async () => {
    const addr = "cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu";
    routeFetch([
      {
        match: "/cosmos/auth/v1beta1/accounts/",
        response: jsonResponse({ account: { sequence: "5" } }),
      },
      {
        match: "/cosmos/bank/v1beta1/balances/",
        response: jsonResponse({ balances: [] }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with balances → found", async () => {
    const addr = "cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu";
    routeFetch([
      {
        match: "/cosmos/auth/v1beta1/accounts/",
        response: jsonResponse({ account: { sequence: "0" } }),
      },
      {
        match: "/cosmos/bank/v1beta1/balances/",
        response: jsonResponse({ balances: [{ amount: "1000" }] }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("denom with supply → found", async () => {
    const denom = "ibc/" + "A".repeat(64);
    routeFetch([
      {
        match: "supply/by_denom",
        response: jsonResponse({ amount: { amount: "1000000" } }),
      },
    ]);

    const detections = detect(denom, CHAINS).filter((d) => d.chain.id === "cosmos");
    const results = await verifyResults(denom, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Tron verification ---

describe("Tron verification", () => {
  const env: Env = {};

  it("tx found via POST gettransactionbyid", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      {
        match: "gettransactionbyid",
        response: jsonResponse({ txID: txHash }),
      },
      // Other chains
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "tron");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address found via POST getaccount", async () => {
    const addr = "TN7cSJWwhx2zQDCVFPgMPTxMiGRx5SQFjR";
    routeFetch([
      {
        match: "getaccount",
        response: jsonResponse({ address: addr, balance: 1000000 }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Solana verification ---

describe("Solana verification", () => {
  const env: Env = {};

  it("tx found via JSON-RPC getTransaction", async () => {
    const sig = "5" + "A".repeat(84);
    routeFetch([
      {
        match: (url, body) => url.includes("mainnet-beta") && !!body?.includes("getTransaction"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { slot: 123 } }),
      },
    ]);

    const detections = detect(sig, CHAINS);
    const results = await verifyResults(sig, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address found via getAccountInfo", async () => {
    const addr = "So11111111111111111111111111111111111111112";
    routeFetch([
      {
        match: (url, body) => !!body?.includes("getAccountInfo"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { value: { lamports: 1000 } } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address not found (null value)", async () => {
    const addr = "So11111111111111111111111111111111111111112";
    routeFetch([
      {
        match: (url, body) => !!body?.includes("getAccountInfo"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { value: null } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("not_found");
  });
});

// --- Sui verification ---

describe("Sui verification", () => {
  const env: Env = {};
  const hash = "0x" + "c".repeat(64);

  it("tx found via sui_getTransactionBlock", async () => {
    routeFetch([
      {
        match: (url, body) => url.includes("sui") && !!body?.includes("sui_getTransactionBlock"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { digest: hash } }),
      },
      // Other chains
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(hash, CHAINS).filter((d) => d.chain.id === "sui" && d.inputType === "transaction");
    const results = await verifyResults(hash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with balance via suix_getBalance", async () => {
    routeFetch([
      {
        match: (url, body) => url.includes("sui") && !!body?.includes("suix_getBalance"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { totalBalance: "1000" } }),
      },
    ]);

    const detections = detect(hash, CHAINS).filter((d) => d.chain.id === "sui" && d.inputType === "address");
    const results = await verifyResults(hash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with zero balance → not_found", async () => {
    routeFetch([
      {
        match: (url, body) => url.includes("sui") && !!body?.includes("suix_getBalance"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { totalBalance: "0" } }),
      },
    ]);

    const detections = detect(hash, CHAINS).filter((d) => d.chain.id === "sui" && d.inputType === "address");
    const results = await verifyResults(hash, detections, env);
    expect(results[0].status).toBe("not_found");
  });
});

// --- Aptos verification ---

describe("Aptos verification", () => {
  const env: Env = {};
  const hash = "0x" + "d".repeat(64);

  it("tx found via REST", async () => {
    routeFetch([
      {
        match: "transactions/by_hash",
        response: new Response("{}", { status: 200 }),
      },
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(hash, CHAINS).filter((d) => d.chain.id === "aptos" && d.inputType === "transaction");
    const results = await verifyResults(hash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with sequence_number > 0 → found", async () => {
    routeFetch([
      {
        match: (url) => url.includes("/accounts/") && !url.includes("transactions"),
        response: jsonResponse({ sequence_number: "5" }),
      },
    ]);

    const detections = detect(hash, CHAINS).filter((d) => d.chain.id === "aptos" && d.inputType === "address");
    const results = await verifyResults(hash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with sequence_number 0 → not_found", async () => {
    routeFetch([
      {
        match: (url) => url.includes("/accounts/") && !url.includes("transactions"),
        response: jsonResponse({ sequence_number: "0" }),
      },
    ]);

    const detections = detect(hash, CHAINS).filter((d) => d.chain.id === "aptos" && d.inputType === "address");
    const results = await verifyResults(hash, detections, env);
    expect(results[0].status).toBe("not_found");
  });
});

// --- TON verification ---

describe("TON verification", () => {
  const env: Env = {};

  it("tx always returns not_found (by design)", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "ton");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("not_found");
  });

  it("address active state → found", async () => {
    const addr = "EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG";
    routeFetch([
      {
        match: "getAddressInformation",
        response: jsonResponse({ ok: true, result: { balance: "1000", state: "active" } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address uninitialized state → not_found", async () => {
    const addr = "EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG";
    routeFetch([
      {
        match: "getAddressInformation",
        response: jsonResponse({ ok: true, result: { balance: "0", state: "uninitialized" } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("not_found");
  });
});

// --- Polkadot verification ---

describe("Polkadot verification", () => {
  const env: Env = {};

  it("tx always returns not_found (by design)", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "polkadot");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("not_found");
  });

  it("address with nonce > 0 → found", async () => {
    const addr = "1" + "A".repeat(47);
    routeFetch([
      {
        match: (url, body) => !!body?.includes("system_account"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { nonce: 5, data: { free: "0" } } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- NEAR verification ---

describe("NEAR verification", () => {
  const env: Env = {};

  it("tx found via EXPERIMENTAL_tx_status", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      {
        match: (url, body) => url.includes("near.org") && !!body?.includes("EXPERIMENTAL_tx_status"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { status: {} } }),
      },
    ]);

    // 64-hex is detected as NEAR address, so manually construct a tx detection
    const nearChain = CHAINS.find((c) => c.id === "near")!;
    const detections: DetectionResult[] = [{
      chain: nearChain,
      inputType: "transaction",
      explorerUrls: [],
    }];
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address found via query view_account", async () => {
    const addr = "alice.near";
    routeFetch([
      {
        match: (url, body) => url.includes("near.org") && !!body?.includes("view_account"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { amount: "1000" } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Dogecoin verification (BlockCypher) ---

describe("Dogecoin verification", () => {
  const env: Env = {};

  it("tx found via BlockCypher", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      { match: "blockcypher.com/v1/doge/main/txs/", response: new Response("{}", { status: 200 }) },
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "dogecoin");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with n_tx > 0 → found", async () => {
    const addr = "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L";
    routeFetch([
      { match: "blockcypher.com/v1/doge/main/addrs/", response: jsonResponse({ n_tx: 5 }) },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Litecoin verification (BlockCypher) ---

describe("Litecoin verification", () => {
  const env: Env = {};

  it("tx found via BlockCypher", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      { match: "blockcypher.com/v1/ltc/main/txs/", response: new Response("{}", { status: 200 }) },
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "litecoin");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with n_tx > 0 → found", async () => {
    const addr = "LaMT348PWRnrqeeWArpwQPbuanpXDZGEUz";
    routeFetch([
      { match: "blockcypher.com/v1/ltc/main/addrs/", response: jsonResponse({ n_tx: 3 }) },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Bitcoin Cash verification (Blockchair) ---

describe("Bitcoin Cash verification", () => {
  const env: Env = {};

  it("tx found via Blockchair", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      {
        match: "blockchair.com/bitcoin-cash/dashboards/transaction/",
        response: jsonResponse({ data: { [txHash]: { transaction: {} } } }),
      },
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "bitcoin-cash");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with transaction_count > 0 → found", async () => {
    const addr = "q" + "a".repeat(41);
    routeFetch([
      {
        match: "blockchair.com/bitcoin-cash/dashboards/address/",
        response: jsonResponse({ data: { [addr]: { address: { transaction_count: 10 } } } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- ZCash verification (Blockchair) ---

describe("ZCash verification", () => {
  const env: Env = {};

  it("tx found via Blockchair", async () => {
    const txHash = "a".repeat(64);
    routeFetch([
      {
        match: "blockchair.com/zcash/dashboards/transaction/",
        response: jsonResponse({ data: { [txHash]: { transaction: {} } } }),
      },
      { match: () => true, response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(txHash, CHAINS).filter((d) => d.chain.id === "zcash");
    const results = await verifyResults(txHash, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with transaction_count > 0 → found", async () => {
    const addr = "t1" + "R".repeat(32);
    routeFetch([
      {
        match: "blockchair.com/zcash/dashboards/address/",
        response: jsonResponse({ data: { [addr]: { address: { transaction_count: 2 } } } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });
});

// --- Hyperliquid Core verification ---

describe("Hyperliquid Core verification", () => {
  const env: Env = {};
  const addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  it("address found via clearinghouseState", async () => {
    routeFetch([
      {
        match: (url, body) => url.includes("hyperliquid.xyz/info") && !!body?.includes("clearinghouseState"),
        response: jsonResponse({ marginSummary: { accountValue: "1000.0" } }),
      },
    ]);

    const coreChain = CHAINS.find((c) => c.id === "hyperliquid-core")!;
    const detections: DetectionResult[] = [{
      chain: coreChain,
      inputType: "address",
      explorerUrls: [],
    }];
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
  });

  it("address with zero account value → not_found", async () => {
    routeFetch([
      {
        match: (url, body) => url.includes("hyperliquid.xyz/info") && !!body?.includes("clearinghouseState"),
        response: jsonResponse({ marginSummary: { accountValue: "0.0" } }),
      },
    ]);

    const coreChain = CHAINS.find((c) => c.id === "hyperliquid-core")!;
    const detections: DetectionResult[] = [{
      chain: coreChain,
      inputType: "address",
      explorerUrls: [],
    }];
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("not_found");
  });
});

// --- Cross-cutting: tryEndpoints failover ---

describe("tryEndpoints failover", () => {
  it("first endpoint fails, second succeeds → found", async () => {
    const addr = "So11111111111111111111111111111111111111112";
    const env: Env = { ALCHEMY_API_KEY: "key" };
    let callCount = 0;

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      callCount++;
      if (url.includes("helius")) throw new Error("Connection refused");
      if (url.includes("alchemy")) throw new Error("Connection refused");
      // Public endpoint succeeds
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: { value: { lamports: 1000 } } });
    });

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, env);
    expect(results[0].status).toBe("found");
    // Should have tried multiple endpoints
    expect(callCount).toBeGreaterThan(1);
  });

  it("all endpoints fail → unverified", async () => {
    const addr = "So11111111111111111111111111111111111111112";

    mockFetch.mockRejectedValue(new Error("Network error"));

    const detections = detect(addr, CHAINS);
    const results = await verifyResults(addr, detections, {});
    expect(results[0].status).toBe("unverified");
  });
});

// --- detectTokens ---

describe("detectTokens", () => {
  it("detects EVM token via Alchemy", async () => {
    const addr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
    routeFetch([
      {
        match: (url, body) => !!body?.includes("alchemy_getTokenMetadata"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { decimals: 6, name: "USDC", symbol: "USDC" } }),
      },
      {
        match: (url, body) => !!body?.includes("eth_call"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x0000000000000000000000000000000000000000000000000000000000000006" }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const tokenChains = await detectTokens(addr, detections, { ALCHEMY_API_KEY: "key" });
    expect(tokenChains.has("ethereum")).toBe(true);
  });

  it("detects EVM token via fallback (eth_call decimals) when no Alchemy", async () => {
    const addr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    routeFetch([
      {
        // Fantom has no Alchemy, uses eth_call fallback
        match: (url, body) => url.includes("fantom") && !!body?.includes("eth_call"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x0000000000000000000000000000000000000000000000000000000000000012" }),
      },
      {
        // Other Alchemy chains - no token metadata
        match: (url, body) => !!body?.includes("alchemy_getTokenMetadata"),
        response: jsonResponse({ jsonrpc: "2.0", id: 1, result: { decimals: null } }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const tokenChains = await detectTokens(addr, detections, {});
    expect(tokenChains.has("fantom")).toBe(true);
  });

  it("detects Solana SPL token", async () => {
    const addr = "So11111111111111111111111111111111111111112";
    routeFetch([
      {
        match: (url, body) => !!body?.includes("getAccountInfo"),
        response: jsonResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { value: { owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" } },
        }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const tokenChains = await detectTokens(addr, detections, {});
    expect(tokenChains.has("solana")).toBe(true);
  });

  it("returns empty for non-EVM/Solana families", async () => {
    const addr = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Bitcoin
    const detections = detect(addr, CHAINS);
    const tokenChains = await detectTokens(addr, detections, {});
    expect(tokenChains.size).toBe(0);
  });

  it("returns empty for transactions", async () => {
    const txHash = "0x" + "a".repeat(64);
    const detections = detect(txHash, CHAINS);
    const tokenChains = await detectTokens(txHash, detections, {});
    expect(tokenChains.size).toBe(0);
  });
});

// --- getCoinGeckoUrl ---

describe("getCoinGeckoUrl", () => {
  it("returns URL with web_slug", async () => {
    const addr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    routeFetch([
      {
        match: "api.coingecko.com",
        response: jsonResponse({ id: "usd-coin", web_slug: "usd-coin" }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const url = await getCoinGeckoUrl(addr, detections);
    expect(url).toBe("https://www.coingecko.com/en/coins/usd-coin");
  });

  it("falls back to id when web_slug missing", async () => {
    const addr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    routeFetch([
      {
        match: "api.coingecko.com",
        response: jsonResponse({ id: "usd-coin" }),
      },
    ]);

    const detections = detect(addr, CHAINS);
    const url = await getCoinGeckoUrl(addr, detections);
    expect(url).toBe("https://www.coingecko.com/en/coins/usd-coin");
  });

  it("returns null on 404", async () => {
    const addr = "0x" + "f".repeat(40);
    routeFetch([
      { match: "api.coingecko.com", response: new Response("", { status: 404 }) },
    ]);

    const detections = detect(addr, CHAINS);
    const url = await getCoinGeckoUrl(addr, detections);
    expect(url).toBeNull();
  });

  it("prioritizes Ethereum platform", async () => {
    const addr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const calls: string[] = [];
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push(url);
      return jsonResponse({ id: "usd-coin", web_slug: "usd-coin" });
    });

    const detections = detect(addr, CHAINS);
    await getCoinGeckoUrl(addr, detections);
    // First call should be ethereum platform
    expect(calls[0]).toContain("/ethereum/contract/");
  });

  it("returns null for transactions", async () => {
    const txHash = "0x" + "a".repeat(64);
    const detections = detect(txHash, CHAINS);
    const url = await getCoinGeckoUrl(txHash, detections);
    expect(url).toBeNull();
  });
});
