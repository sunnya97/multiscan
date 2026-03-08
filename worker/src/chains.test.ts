import { describe, it, expect } from "vitest";
import { CHAINS, resolveRpcUrl, getAlchemyRpcUrl, getResolvedRpcUrls, type RpcEndpoint, type Chain, type Env } from "./chains";

// --- resolveRpcUrl ---

describe("resolveRpcUrl", () => {
  it("returns raw URL when no key is needed", () => {
    const ep: RpcEndpoint = { url: "https://rpc.example.com", provider: "public" };
    expect(resolveRpcUrl(ep, {})).toBe("https://rpc.example.com");
  });

  it("substitutes {key} when env has the key", () => {
    const ep: RpcEndpoint = {
      url: "https://eth.alchemy.com/v2/{key}",
      provider: "alchemy",
      keyEnvVar: "ALCHEMY_API_KEY",
    };
    expect(resolveRpcUrl(ep, { ALCHEMY_API_KEY: "test-key" })).toBe(
      "https://eth.alchemy.com/v2/test-key",
    );
  });

  it("returns null when key is required but missing", () => {
    const ep: RpcEndpoint = {
      url: "https://eth.alchemy.com/v2/{key}",
      provider: "alchemy",
      keyEnvVar: "ALCHEMY_API_KEY",
    };
    expect(resolveRpcUrl(ep, {})).toBeNull();
  });
});

// --- getAlchemyRpcUrl ---

describe("getAlchemyRpcUrl", () => {
  const fantom = CHAINS.find((c) => c.id === "fantom")!;
  const ethereum = CHAINS.find((c) => c.id === "ethereum")!;

  it("returns null for chains without Alchemy endpoint (Fantom)", () => {
    expect(getAlchemyRpcUrl(fantom, { ALCHEMY_API_KEY: "key" })).toBeNull();
  });

  it("returns resolved URL when key is present", () => {
    const url = getAlchemyRpcUrl(ethereum, { ALCHEMY_API_KEY: "mykey" });
    expect(url).toBe("https://eth-mainnet.g.alchemy.com/v2/mykey");
  });

  it("returns null when key is missing", () => {
    expect(getAlchemyRpcUrl(ethereum, {})).toBeNull();
  });
});

// --- getResolvedRpcUrls ---

describe("getResolvedRpcUrls", () => {
  const ethereum = CHAINS.find((c) => c.id === "ethereum")!;

  it("returns all resolvable URLs", () => {
    const urls = getResolvedRpcUrls(ethereum, { ALCHEMY_API_KEY: "k" });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe("https://eth-mainnet.g.alchemy.com/v2/k");
    expect(urls[1]).toBe("https://ethereum-rpc.publicnode.com");
  });

  it("skips endpoints with missing keys", () => {
    const urls = getResolvedRpcUrls(ethereum, {});
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe("https://ethereum-rpc.publicnode.com");
  });

  it("returns only public URLs when no keys provided", () => {
    const solana = CHAINS.find((c) => c.id === "solana")!;
    const urls = getResolvedRpcUrls(solana, {});
    // Solana has helius + alchemy + public; without keys only public
    expect(urls).toEqual(["https://api.mainnet-beta.solana.com"]);
  });
});

// --- CHAINS data integrity ---

describe("CHAINS data integrity", () => {
  it("every chain has id, name, symbol, and family", () => {
    for (const chain of CHAINS) {
      expect(chain.id, `${chain.id} missing id`).toBeTruthy();
      expect(chain.name, `${chain.id} missing name`).toBeTruthy();
      expect(chain.symbol, `${chain.id} missing symbol`).toBeTruthy();
      expect(chain.family, `${chain.id} missing family`).toBeTruthy();
    }
  });

  it("every chain has at least one explorer", () => {
    for (const chain of CHAINS) {
      expect(chain.explorers.length, `${chain.id} has no explorers`).toBeGreaterThanOrEqual(1);
    }
  });

  it("every chain has at least one rpcUrl (except unverifiable chains)", () => {
    const unverifiable = new Set(["monero", "bittensor", "litecoin-testnet", "kaspa-testnet", "dogecoin-testnet", "bitcoin-cash-testnet", "zcash-testnet", "dash", "dash-testnet", "lightning-testnet", "ethereum-classic-mordor", "hyperliquid-core-testnet", "osmosis-testnet", "celestia-testnet", "dydx-testnet", "injective-testnet", "axelar-testnet", "kava-testnet", "persistence-testnet", "archway-testnet", "noble-testnet", "neutron-testnet", "coreum-testnet", "mantra-testnet", "babylon-testnet", "urbit", "berachain-testnet", "ronin-testnet", "oasis-testnet", "core-testnet", "monad-testnet", "tezos", "aleo", "nano", "chia", "iota"]);
    for (const chain of CHAINS) {
      if (unverifiable.has(chain.id)) continue;
      expect(chain.rpcUrls.length, `${chain.id} has no rpcUrls`).toBeGreaterThanOrEqual(1);
    }
  });

  it("cosmos chains have bech32Prefix", () => {
    const cosmosChains = CHAINS.filter((c) => c.family === "cosmos" && !c.isTestnet);
    expect(cosmosChains.length).toBeGreaterThan(0);
    for (const chain of cosmosChains) {
      expect(chain.bech32Prefix, `${chain.id} missing bech32Prefix`).toBeTruthy();
    }
  });

  it("no duplicate chain IDs", () => {
    const ids = CHAINS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("no duplicate bech32 prefixes", () => {
    const prefixes = CHAINS.filter((c) => c.bech32Prefix).map((c) => c.bech32Prefix!);
    const unique = new Set(prefixes);
    expect(unique.size).toBe(prefixes.length);
  });
});
