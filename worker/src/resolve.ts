import { keccak_256 } from "@noble/hashes/sha3";
import { Chain, Env, getResolvedRpcUrls } from "./chains";

// --- Name service detection ---

export type NameService = "ens" | "sns" | "spaceid" | "icns";

export interface NameDetection {
  service: NameService;
  name: string; // full name including TLD, e.g. "vitalik.eth"
  tld: string; // e.g. "eth"
}

export interface NameResolution {
  resolvedName: string;
  resolvedAddress: string;
}

const NAME_PATTERNS: { regex: RegExp; service: NameService; tld: string }[] = [
  { regex: /^[a-zA-Z0-9-]+\.eth$/i, service: "ens", tld: "eth" },
  { regex: /^[a-zA-Z0-9-]+\.sol$/i, service: "sns", tld: "sol" },
  { regex: /^[a-zA-Z0-9-]+\.bnb$/i, service: "spaceid", tld: "bnb" },
  { regex: /^[a-zA-Z0-9-]+\.osmo$/i, service: "icns", tld: "osmo" },
  { regex: /^[a-zA-Z0-9-]+\.cosmos$/i, service: "icns", tld: "cosmos" },
];

export function detectNameService(input: string): NameDetection | null {
  const trimmed = input.trim().toLowerCase();
  for (const pattern of NAME_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return { service: pattern.service, name: trimmed, tld: pattern.tld };
    }
  }
  return null;
}

// --- ENS namehash (EIP-137) ---

function namehash(name: string): string {
  let node: Uint8Array = new Uint8Array(32); // 0x00...00
  if (!name) return bytesToHex(node);

  const labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak_256(new TextEncoder().encode(labels[i]));
    const combined = new Uint8Array(64);
    combined.set(node, 0);
    combined.set(new Uint8Array(labelHash), 32);
    node = new Uint8Array(keccak_256(combined));
  }
  return bytesToHex(node);
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- ENS resolver ---

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const RESOLVER_SELECTOR = "0x0178b8bf"; // resolver(bytes32)
const ADDR_SELECTOR = "0x3b3b57de"; // addr(bytes32)

async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const resp = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await resp.json()) as { result?: string; error?: { message: string } };
  if (json.error || !json.result) throw new Error(json.error?.message ?? "No result");
  return json.result;
}

async function resolveENS(name: string, rpcUrls: string[]): Promise<string | null> {
  const node = namehash(name);
  const nodeParam = node.slice(2).padStart(64, "0"); // strip 0x, pad to 32 bytes

  for (const rpcUrl of rpcUrls) {
    try {
      // Step 1: get resolver address from registry
      const resolverResult = await ethCall(rpcUrl, ENS_REGISTRY, RESOLVER_SELECTOR + nodeParam);
      const resolverAddr = "0x" + resolverResult.slice(-40);

      // Check resolver is not zero address
      if (resolverAddr === "0x" + "0".repeat(40)) return null;

      // Step 2: get address from resolver
      const addrResult = await ethCall(rpcUrl, resolverAddr, ADDR_SELECTOR + nodeParam);
      const resolved = "0x" + addrResult.slice(-40);

      // Check resolved is not zero address
      if (resolved === "0x" + "0".repeat(40)) return null;

      return resolved;
    } catch {
      continue; // try next RPC
    }
  }
  return null;
}

// --- SNS (Bonfida) resolver ---

async function resolveSNS(name: string): Promise<string | null> {
  // Strip .sol suffix for the API
  const label = name.replace(/\.sol$/i, "");
  const resp = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${label}`);
  if (!resp.ok) return null;
  const json = (await resp.json()) as { result?: string; s: string };
  // The API returns { result: "base58address" } on success
  const address = json.result ?? json.s;
  if (!address || address === "") return null;
  return address;
}

// --- SpaceID resolver ---

async function resolveSpaceID(name: string): Promise<string | null> {
  const resp = await fetch(
    `https://api.prd.space.id/v1/getAddress?tld=bnb&domain=${encodeURIComponent(name)}`
  );
  if (!resp.ok) return null;
  const json = (await resp.json()) as { code?: number; address?: string };
  if (!json.address || json.address === "0x" + "0".repeat(40)) return null;
  return json.address;
}

// --- ICNS resolver ---

const ICNS_CONTRACT = "osmo1xk0s8xgktn9x5vwcgtjdceflgpasksjcll6yqzfzfj4lnq3rha4s3fwmma"; // ICNS resolver on Osmosis

async function resolveICNS(name: string, tld: string, rpcUrls: string[]): Promise<string | null> {
  const label = name.replace(new RegExp(`\\.${tld}$`, "i"), "");
  const query = btoa(JSON.stringify({ address: { name: label, bech32_prefix: tld } }));

  for (const lcdUrl of rpcUrls) {
    try {
      const resp = await fetch(
        `${lcdUrl}/cosmwasm/wasm/v1/contract/${ICNS_CONTRACT}/smart/${query}`
      );
      if (!resp.ok) continue;
      const json = (await resp.json()) as { data?: { address?: string } };
      const address = json.data?.address;
      if (address && address !== "") return address;
    } catch {
      continue;
    }
  }
  return null;
}

// --- Main entry point ---

export async function resolveNameService(
  input: string,
  env: Env,
  chains: Chain[],
): Promise<NameResolution | null> {
  const detection = detectNameService(input);
  if (!detection) return null;

  const chainMap = new Map(chains.map((c) => [c.id, c]));

  try {
    let address: string | null = null;

    switch (detection.service) {
      case "ens": {
        const ethereum = chainMap.get("ethereum");
        if (!ethereum) return null;
        const rpcUrls = getResolvedRpcUrls(ethereum, env);
        address = await resolveENS(detection.name, rpcUrls);
        break;
      }
      case "sns": {
        address = await resolveSNS(detection.name);
        break;
      }
      case "spaceid": {
        address = await resolveSpaceID(detection.name);
        break;
      }
      case "icns": {
        const osmosis = chainMap.get("osmosis");
        if (!osmosis) return null;
        const rpcUrls = getResolvedRpcUrls(osmosis, env);
        address = await resolveICNS(detection.name, detection.tld, rpcUrls);
        break;
      }
    }

    if (!address) return null;
    return { resolvedName: detection.name, resolvedAddress: address };
  } catch {
    return null; // graceful fallback
  }
}
