import { describe, it, expect } from "vitest";
import { detect, type DetectionResult } from "./detect";
import { CHAINS } from "./chains";

/** Helper: chain IDs from detection results */
function chainIds(results: DetectionResult[]): string[] {
  return results.map((r) => r.chain.id);
}

/** Helper: unique input types */
function inputTypes(results: DetectionResult[]): string[] {
  return [...new Set(results.map((r) => r.inputType))];
}

const EVM_CHAINS = [
  "ethereum", "base", "arbitrum", "optimism", "polygon",
  "bsc", "avalanche", "fantom", "zksync", "linea", "scroll", "mantle",
  "ethereum-classic",
];

const COSMOS_CHAIN_IDS = CHAINS.filter((c) => c.family === "cosmos").map((c) => c.id);

// --- EVM address (0x + 40 hex) ---

describe("EVM address detection", () => {
  const addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  it("detects all 12 EVM chains for a valid address", () => {
    const results = detect(addr, CHAINS);
    expect(chainIds(results)).toEqual(EVM_CHAINS);
    expect(inputTypes(results)).toEqual(["address"]);
  });

  it("is case insensitive", () => {
    const lower = detect(addr.toLowerCase(), CHAINS);
    const upper = detect(addr.toUpperCase(), CHAINS);
    expect(chainIds(lower)).toEqual(EVM_CHAINS);
    expect(chainIds(upper)).toEqual(EVM_CHAINS);
  });

  it("trims whitespace", () => {
    const results = detect(`  ${addr}  `, CHAINS);
    expect(chainIds(results)).toEqual(EVM_CHAINS);
  });

  it("rejects wrong length (too short)", () => {
    expect(detect("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604", CHAINS)).toHaveLength(0);
  });

  it("rejects wrong length (too long)", () => {
    expect(detect("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA960455", CHAINS)).toHaveLength(0);
  });

  it("rejects invalid hex chars", () => {
    expect(detect("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604G", CHAINS)).toHaveLength(0);
  });
});

// --- EVM tx / Sui / Aptos (0x + 64 hex) ---

describe("0x + 64 hex detection", () => {
  const hash = "0x" + "a".repeat(64);

  it("returns 13 EVM tx + Sui addr/tx + Aptos addr/tx = 17 results", () => {
    const results = detect(hash, CHAINS);
    expect(results).toHaveLength(17);
  });

  it("includes all EVM chains as transactions", () => {
    const results = detect(hash, CHAINS);
    const evmTx = results.filter((r) => r.chain.family === "evm");
    expect(evmTx.every((r) => r.inputType === "transaction")).toBe(true);
    expect(evmTx).toHaveLength(13);
  });

  it("includes Sui as both address and transaction", () => {
    const results = detect(hash, CHAINS);
    const sui = results.filter((r) => r.chain.id === "sui");
    expect(sui).toHaveLength(2);
    expect(sui.map((r) => r.inputType).sort()).toEqual(["address", "transaction"]);
  });

  it("includes Aptos as both address and transaction", () => {
    const results = detect(hash, CHAINS);
    const aptos = results.filter((r) => r.chain.id === "aptos");
    expect(aptos).toHaveLength(2);
    expect(aptos.map((r) => r.inputType).sort()).toEqual(["address", "transaction"]);
  });
});

// --- IBC denom ---

describe("IBC denom detection", () => {
  const ibcDenom = "ibc/" + "A".repeat(64);

  it("matches all cosmos chains with inputType denom", () => {
    const results = detect(ibcDenom, CHAINS);
    expect(results).toHaveLength(COSMOS_CHAIN_IDS.length);
    expect(results.every((r) => r.inputType === "denom")).toBe(true);
    expect(chainIds(results).sort()).toEqual([...COSMOS_CHAIN_IDS].sort());
  });

  it("is case insensitive", () => {
    const lower = detect("ibc/" + "a".repeat(64), CHAINS);
    expect(lower).toHaveLength(COSMOS_CHAIN_IDS.length);
  });
});

// --- Factory denom ---

describe("factory denom detection", () => {
  it("matches correct cosmos chain by bech32 prefix", () => {
    const results = detect("factory/osmo1abc123def456ghi789jkl012mno345pqr678stu/utoken", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("osmosis");
    expect(results[0].inputType).toBe("denom");
  });

  it("rejects unknown prefix", () => {
    const results = detect("factory/unknown1abc123def456ghi789jkl012mno345pqr678stu/utoken", CHAINS);
    expect(results).toHaveLength(0);
  });
});

// --- Cosmos bech32 addresses ---

describe("Cosmos bech32 address detection", () => {
  // Generate a test address for each prefix: prefix + "1" + alphanumeric (38-58 chars)
  const testCases: [string, string][] = [
    ["cosmos", "cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu"],
    ["osmo", "osmo1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc50eacts"],
    ["celestia", "celestia1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5rxd7xd"],
    ["dydx", "dydx1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc59erf7f"],
    ["inj", "inj1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5h9w2ad"],
    ["sei", "sei1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc548v0xd"],
    ["stride", "stride1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5fnrp4s"],
    ["stars", "stars1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5m6gyqd"],
    ["akash", "akash1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5nlvntp"],
    ["axelar", "axelar1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5e5tyua"],
    ["juno", "juno1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5ye6c0q"],
    ["secret", "secret1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5f6c46d"],
    ["terra", "terra1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5pufxpv"],
    ["noble", "noble1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5klq7xp"],
    ["neutron", "neutron1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5xhnlzd"],
    ["bbn", "bbn1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5vzzj9n"],
    ["iaa", "iaa1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5c65z6f"],
    ["cro", "cro1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc53p35xf"],
    ["dym", "dym1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc598glde"],
    ["mantra", "mantra1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5p7q9hs"],
  ];

  for (const [prefix, addr] of testCases) {
    it(`detects ${prefix} address`, () => {
      const results = detect(addr, CHAINS);
      expect(results.length, `No match for ${prefix} address`).toBeGreaterThanOrEqual(1);
      expect(results[0].inputType).toBe("address");
      expect(results[0].chain.bech32Prefix).toBe(prefix);
    });
  }

  it("rejects uppercase bech32 address", () => {
    const results = detect("COSMOS1QYPQXPQ9QCRSSZG2PVXQ6RS0ZQG3YYC5LZV7XU", CHAINS);
    expect(results).toHaveLength(0);
  });
});

// --- Bitcoin ---

describe("Bitcoin address detection", () => {
  it("detects legacy address starting with 1", () => {
    const results = detect("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin");
    expect(results[0].inputType).toBe("address");
  });

  it("detects P2SH address starting with 3", () => {
    const results = detect("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin");
  });

  it("detects bech32 address starting with bc1", () => {
    const results = detect("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin");
  });

  it("detects taproot address starting with bc1p", () => {
    const results = detect("bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin");
  });
});

// --- Tron ---

describe("Tron address detection", () => {
  it("detects T + 33 base58 chars", () => {
    const results = detect("TN7cSJWwhx2zQDCVFPgMPTxMiGRx5SQFjR", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("tron");
    expect(results[0].inputType).toBe("address");
  });
});

// --- TON ---

describe("TON address detection", () => {
  it("detects EQ + 46 chars with hyphens/underscores", () => {
    const results = detect("EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("ton");
    expect(results[0].inputType).toBe("address");
  });

  it("detects UQ prefix", () => {
    const results = detect("UQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("ton");
  });

  it("detects raw workchain:hex format", () => {
    const results = detect("0:" + "a".repeat(64), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("ton");
    expect(results[0].inputType).toBe("address");
  });

  it("detects negative workchain", () => {
    const results = detect("-1:" + "a".repeat(64), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("ton");
  });
});

// --- Polkadot ---

describe("Polkadot address detection", () => {
  it("detects 1 + 45-47 base58 chars", () => {
    // 1 + 47 base58 chars = 48 total
    const addr = "1" + "A".repeat(47);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("polkadot");
    expect(results[0].inputType).toBe("address");
  });

  it("does not overlap with Bitcoin (Bitcoin legacy is 25-34 chars)", () => {
    // Bitcoin: 1 + 24-33 = 25-34 total
    // Polkadot: 1 + 45-47 = 46-48 total
    // No overlap in lengths
    const btcAddr = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // 34 chars
    expect(detect(btcAddr, CHAINS)[0].chain.id).toBe("bitcoin");

    const dotAddr = "1" + "A".repeat(47); // 48 chars
    expect(detect(dotAddr, CHAINS)[0].chain.id).toBe("polkadot");
  });
});

// --- NEAR ---

describe("NEAR named address detection", () => {
  it("detects *.near addresses", () => {
    const results = detect("alice.near", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("near");
    expect(results[0].inputType).toBe("address");
  });

  it("supports hyphens and underscores", () => {
    expect(detect("my-wallet_123.near", CHAINS)).toHaveLength(1);
  });
});

// --- Solana transaction ---

describe("Solana transaction detection", () => {
  it("detects base58 80-90 chars as Solana tx", () => {
    // 85 base58 chars
    const sig = "5" + "A".repeat(84);
    const results = detect(sig, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("solana");
    expect(results[0].inputType).toBe("transaction");
  });

  it("rejects 79 char base58 (too short)", () => {
    const short = "5" + "A".repeat(78);
    expect(detect(short, CHAINS)).toHaveLength(0);
  });

  it("rejects 91 char base58 (too long for Solana tx, also not Solana address)", () => {
    const long = "5" + "A".repeat(90);
    expect(detect(long, CHAINS)).toHaveLength(0);
  });
});

// --- Bare 64 hex ---

describe("bare 64 hex detection", () => {
  const hex64 = "a".repeat(64);

  it("includes Bitcoin tx", () => {
    const results = detect(hex64, CHAINS);
    expect(chainIds(results)).toContain("bitcoin");
    expect(results.find((r) => r.chain.id === "bitcoin")!.inputType).toBe("transaction");
  });

  it("includes all Cosmos chains as tx", () => {
    const results = detect(hex64, CHAINS);
    const cosmosTx = results.filter((r) => r.chain.family === "cosmos");
    expect(cosmosTx.length).toBe(COSMOS_CHAIN_IDS.length);
    expect(cosmosTx.every((r) => r.inputType === "transaction")).toBe(true);
  });

  it("includes Tron tx, TON tx, Polkadot tx", () => {
    const results = detect(hex64, CHAINS);
    expect(results.find((r) => r.chain.id === "tron")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "ton")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "polkadot")!.inputType).toBe("transaction");
  });

  it("includes NEAR as address (implicit account)", () => {
    const results = detect(hex64, CHAINS);
    expect(results.find((r) => r.chain.id === "near")!.inputType).toBe("address");
  });
});

// --- Solana address ---

describe("Solana address detection", () => {
  it("detects base58 32-44 chars", () => {
    // 44 base58 chars
    const addr = "So11111111111111111111111111111111111111112";
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("solana");
    expect(results[0].inputType).toBe("address");
  });

  it("detects 32 char base58", () => {
    const addr = "A".repeat(32);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("solana");
  });
});

// --- Explorer URL generation ---

describe("explorer URL generation", () => {
  it("generates correct URLs for EVM address", () => {
    const addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const results = detect(addr, CHAINS);
    const eth = results.find((r) => r.chain.id === "ethereum")!;
    expect(eth.explorerUrls[0].url).toBe(
      `https://etherscan.io/address/${addr}`,
    );
  });

  it("applies encodeURIComponent to query", () => {
    // IBC denom contains "/" which should be encoded in the path
    const ibcDenom = "ibc/" + "A".repeat(64);
    const results = detect(ibcDenom, CHAINS);
    const cosmos = results.find((r) => r.chain.id === "cosmos")!;
    // denomPath filter: only explorers with denomPath
    expect(cosmos.explorerUrls.length).toBeGreaterThan(0);
    expect(cosmos.explorerUrls[0].url).toContain(encodeURIComponent(ibcDenom));
  });

  it("filters out explorers without denomPath for denom input", () => {
    const ibcDenom = "ibc/" + "A".repeat(64);
    const results = detect(ibcDenom, CHAINS);
    // Celestia has Celenium explorer without denomPath
    const celestia = results.find((r) => r.chain.id === "celestia")!;
    // Should only include Mintscan (has denomPath), not Celenium
    const explorerNames = celestia.explorerUrls.map((u) => u.name);
    expect(explorerNames).toContain("Mintscan");
    expect(explorerNames).not.toContain("Celenium");
  });
});

// --- Empty/whitespace ---

describe("empty and whitespace input", () => {
  it("returns empty for empty string", () => {
    expect(detect("", CHAINS)).toHaveLength(0);
  });

  it("returns empty for whitespace-only", () => {
    expect(detect("   ", CHAINS)).toHaveLength(0);
  });
});

// --- Edge cases ---

describe("edge cases", () => {
  it("rejects 0x + 39 hex (off-by-one short for address)", () => {
    expect(detect("0x" + "a".repeat(39), CHAINS)).toHaveLength(0);
  });

  it("rejects 0x + 41 hex (off-by-one long for address, short for tx)", () => {
    expect(detect("0x" + "a".repeat(41), CHAINS)).toHaveLength(0);
  });

  it("rejects 0x + 63 hex (off-by-one short for tx)", () => {
    expect(detect("0x" + "a".repeat(63), CHAINS)).toHaveLength(0);
  });

  it("rejects 0x + 65 hex (off-by-one long for tx)", () => {
    expect(detect("0x" + "a".repeat(65), CHAINS)).toHaveLength(0);
  });

  it("rejects non-base58 in Bitcoin addresses (0, O, I, l)", () => {
    // 'O' is not in base58
    expect(detect("1O1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", CHAINS)).toHaveLength(0);
  });

  it("rejects random text", () => {
    expect(detect("hello world", CHAINS)).toHaveLength(0);
  });
});
