import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectNameService, resolveNameService, type NameDetection } from "./resolve";
import { CHAINS } from "./chains";
import type { Env } from "./chains";

// --- detectNameService (pure logic) ---

describe("detectNameService", () => {
  it(".eth → ens", () => {
    const result = detectNameService("vitalik.eth");
    expect(result).toEqual({ service: "ens", name: "vitalik.eth", tld: "eth" });
  });

  it(".sol → sns", () => {
    const result = detectNameService("bonfida.sol");
    expect(result).toEqual({ service: "sns", name: "bonfida.sol", tld: "sol" });
  });

  it(".bnb → spaceid", () => {
    const result = detectNameService("test.bnb");
    expect(result).toEqual({ service: "spaceid", name: "test.bnb", tld: "bnb" });
  });

  it(".osmo → icns", () => {
    const result = detectNameService("alice.osmo");
    expect(result).toEqual({ service: "icns", name: "alice.osmo", tld: "osmo" });
  });

  it(".cosmos → icns", () => {
    const result = detectNameService("bob.cosmos");
    expect(result).toEqual({ service: "icns", name: "bob.cosmos", tld: "cosmos" });
  });

  it(".ton → tondns", () => {
    const result = detectNameService("wallet.ton");
    expect(result).toEqual({ service: "tondns", name: "wallet.ton", tld: "ton" });
  });

  it(".sui → suins", () => {
    const result = detectNameService("myname.sui");
    expect(result).toEqual({ service: "suins", name: "myname.sui", tld: "sui" });
  });

  it(".apt → aptosnames", () => {
    const result = detectNameService("alice.apt");
    expect(result).toEqual({ service: "aptosnames", name: "alice.apt", tld: "apt" });
  });

  it("rejects .com", () => {
    expect(detectNameService("example.com")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(detectNameService("")).toBeNull();
  });

  it("rejects no TLD", () => {
    expect(detectNameService("vitalik")).toBeNull();
  });

  it("is case insensitive (normalized to lowercase)", () => {
    const result = detectNameService("Vitalik.ETH");
    expect(result).toEqual({ service: "ens", name: "vitalik.eth", tld: "eth" });
  });

  it("supports hyphens in name", () => {
    const result = detectNameService("my-name.eth");
    expect(result).toEqual({ service: "ens", name: "my-name.eth", tld: "eth" });
  });

  it("trims whitespace", () => {
    const result = detectNameService("  vitalik.eth  ");
    expect(result).toEqual({ service: "ens", name: "vitalik.eth", tld: "eth" });
  });
});

// --- resolveNameService (mocked fetch) ---

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

describe("ENS resolution", () => {
  const env: Env = { ALCHEMY_API_KEY: "test-key" };

  it("resolves ENS name to address", async () => {
    const resolvedAddr = "d8da6bf26964af9d7eed9e03e53415d37aa96045";
    // First call: registry resolver lookup
    // Second call: resolver addr lookup
    mockFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      if (body.includes("0x0178b8bf")) {
        // resolver() call - return a resolver address
        return jsonResponse({
          jsonrpc: "2.0",
          id: 1,
          result: "0x000000000000000000000000" + "4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41",
        });
      }
      if (body.includes("0x3b3b57de")) {
        // addr() call - return the resolved address
        return jsonResponse({
          jsonrpc: "2.0",
          id: 1,
          result: "0x000000000000000000000000" + resolvedAddr,
        });
      }
      return new Response("", { status: 500 });
    });

    const result = await resolveNameService("vitalik.eth", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("vitalik.eth");
    expect(result!.resolvedAddress).toBe("0x" + resolvedAddr);
  });

  it("returns null when resolver is zero address", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        result: "0x" + "0".repeat(64),
      }),
    );

    const result = await resolveNameService("nonexistent.eth", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("SNS resolution", () => {
  const env: Env = {};

  it("resolves .sol name via Bonfida API", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ result: "7kEBnUfCrjQqDt6we3dEFagxAqKbwnDSgE6X4H3a3Bri" }),
    );

    const result = await resolveNameService("bonfida.sol", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("bonfida.sol");
    expect(result!.resolvedAddress).toBe("7kEBnUfCrjQqDt6we3dEFagxAqKbwnDSgE6X4H3a3Bri");
  });

  it("returns null when API returns not ok", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 404 }));

    const result = await resolveNameService("nonexistent.sol", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("SpaceID resolution", () => {
  const env: Env = {};

  it("resolves .bnb name", async () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    mockFetch.mockResolvedValue(
      jsonResponse({ code: 0, address: addr }),
    );

    const result = await resolveNameService("test.bnb", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("test.bnb");
    expect(result!.resolvedAddress).toBe(addr);
  });

  it("returns null when address is zero", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ code: 0, address: "0x" + "0".repeat(40) }),
    );

    const result = await resolveNameService("empty.bnb", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("ICNS resolution", () => {
  const env: Env = {};

  it("resolves .osmo name via CosmWasm query", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: { address: "osmo1abc123def456" } }),
    );

    const result = await resolveNameService("alice.osmo", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("alice.osmo");
    expect(result!.resolvedAddress).toBe("osmo1abc123def456");
  });

  it("returns null when address is empty", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data: { address: "" } }),
    );

    const result = await resolveNameService("nobody.osmo", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("TON DNS resolution", () => {
  const env: Env = {};

  it("resolves .ton name via tonapi.io", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ wallet: { address: "EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2" } }),
    );

    const result = await resolveNameService("wallet.ton", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("wallet.ton");
    expect(result!.resolvedAddress).toBe("EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2");
  });

  it("returns null when not found", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 404 }));

    const result = await resolveNameService("nonexistent.ton", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("SuiNS resolution", () => {
  const env: Env = {};

  it("resolves .sui name via Sui RPC", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        result: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      }),
    );

    const result = await resolveNameService("myname.sui", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("myname.sui");
    expect(result!.resolvedAddress).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  });

  it("returns null when result is null", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ jsonrpc: "2.0", id: 1, result: null }),
    );

    const result = await resolveNameService("nonexistent.sui", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("Aptos Names resolution", () => {
  const env: Env = {};

  it("resolves .apt name via aptosnames.com", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ address: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" }),
    );

    const result = await resolveNameService("alice.apt", env, CHAINS);
    expect(result).not.toBeNull();
    expect(result!.resolvedName).toBe("alice.apt");
    expect(result!.resolvedAddress).toBe("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
  });

  it("returns null when not found", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 404 }));

    const result = await resolveNameService("nonexistent.apt", env, CHAINS);
    expect(result).toBeNull();
  });
});

describe("error handling", () => {
  it("returns null gracefully on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await resolveNameService("vitalik.eth", { ALCHEMY_API_KEY: "key" }, CHAINS);
    expect(result).toBeNull();
  });

  it("returns null for non-name-service input", async () => {
    const result = await resolveNameService("0xabc123", {}, CHAINS);
    expect(result).toBeNull();
  });
});
