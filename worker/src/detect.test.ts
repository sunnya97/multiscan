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
  "ethereum-classic", "hyperliquid-evm", "hyperliquid-core",
  "berachain", "ronin", "flare", "oasis-sapphire", "core", "monad", "megaeth", "plasma",
];

const COSMOS_CHAIN_IDS = CHAINS.filter((c) => c.family === "cosmos" && c.bech32Prefix).map((c) => c.id);

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

  it("returns EVM tx + Sui addr/tx + Aptos addr/tx + Bittensor tx + Starknet addr/tx", () => {
    const results = detect(hash, CHAINS);
    // EVM chains + 2 Sui + 2 Aptos + 1 Bittensor + 2 Starknet = EVM_CHAINS.length + 7
    expect(results).toHaveLength(EVM_CHAINS.length + 7);
  });

  it("includes all EVM chains as transactions", () => {
    const results = detect(hash, CHAINS);
    const evmTx = results.filter((r) => r.chain.family === "evm");
    expect(evmTx.every((r) => r.inputType === "transaction")).toBe(true);
    expect(evmTx).toHaveLength(EVM_CHAINS.length);
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

// --- Dogecoin ---

describe("Dogecoin address detection", () => {
  it("detects D prefix address", () => {
    const results = detect("DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("dogecoin");
    expect(results[0].inputType).toBe("address");
  });

  it("detects A prefix (P2SH)", () => {
    const results = detect("A" + "B".repeat(33), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("dogecoin");
  });

  it("detects 9 prefix (P2SH)", () => {
    const results = detect("9" + "B".repeat(33), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("dogecoin");
  });
});

// --- Litecoin ---

describe("Litecoin address detection", () => {
  it("detects L prefix address", () => {
    const results = detect("LaMT348PWRnrqeeWArpwQPbuanpXDZGEUz", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("litecoin");
    expect(results[0].inputType).toBe("address");
  });

  it("detects M prefix (P2SH)", () => {
    const results = detect("M" + "B".repeat(33), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("litecoin");
  });

  it("detects ltc1 bech32 address", () => {
    const results = detect("ltc1qar0srrr7xfkvy5l643lydnw9re59gtzzwfhmdq", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("litecoin");
  });
});

// --- Bitcoin Cash ---

describe("Bitcoin Cash address detection", () => {
  it("detects CashAddr q prefix", () => {
    const results = detect("q" + "a".repeat(41), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin-cash");
    expect(results[0].inputType).toBe("address");
  });

  it("detects CashAddr p prefix", () => {
    const results = detect("p" + "a".repeat(41), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin-cash");
  });

  it("detects with bitcoincash: prefix", () => {
    const results = detect("bitcoincash:q" + "a".repeat(41), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin-cash");
  });
});

// --- ZCash ---

describe("ZCash address detection", () => {
  it("detects t1 transparent address", () => {
    const results = detect("t1" + "R".repeat(32), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("zcash");
    expect(results[0].inputType).toBe("address");
  });

  it("detects t3 transparent address", () => {
    const results = detect("t3" + "R".repeat(32), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("zcash");
  });

  it("detects zs1 shielded address", () => {
    const results = detect("zs1" + "a".repeat(65), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("zcash");
  });
});

// --- Monero ---

describe("Monero address detection", () => {
  it("detects address starting with 4 (95 chars)", () => {
    const addr = "4" + "A".repeat(94);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("monero");
    expect(results[0].inputType).toBe("address");
  });

  it("detects address starting with 8 (subaddress)", () => {
    const addr = "8" + "B".repeat(94);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("monero");
  });

  it("rejects wrong length", () => {
    expect(detect("4" + "A".repeat(93), CHAINS)).toHaveLength(0);
  });
});

// --- XRP ---

describe("XRP address detection", () => {
  it("detects r + base58 address (25-35 chars)", () => {
    const results = detect("rN7n3473SaZBCG4dFL83w7p1W9cgPJxtfR", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("xrp");
    expect(results[0].inputType).toBe("address");
  });

  it("does not conflict with Cosmos bech32 (no r prefix in Cosmos)", () => {
    const results = detect("rN7n3473SaZBCG4dFL83w7p1W9cgPJxtfR", CHAINS);
    expect(results[0].chain.family).toBe("xrp");
  });
});

// --- Stellar ---

describe("Stellar address detection", () => {
  it("detects G + 55 base32 chars", () => {
    const addr = "G" + "A".repeat(55);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("stellar");
    expect(results[0].inputType).toBe("address");
  });

  it("rejects lowercase", () => {
    expect(detect("g" + "a".repeat(55), CHAINS)).toHaveLength(0);
  });

  it("rejects wrong length", () => {
    expect(detect("G" + "A".repeat(54), CHAINS)).toHaveLength(0);
  });
});

// --- Bittensor ---

describe("Bittensor address detection", () => {
  it("detects 5 + 47 SS58 chars", () => {
    const addr = "5" + "F".repeat(47);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bittensor");
    expect(results[0].inputType).toBe("address");
  });

  it("Bittensor tx in 0x+64 hex block", () => {
    const hash = "0x" + "a".repeat(64);
    const results = detect(hash, CHAINS);
    const tao = results.find((r) => r.chain.id === "bittensor");
    expect(tao).toBeDefined();
    expect(tao!.inputType).toBe("transaction");
  });
});

// --- Cardano ---

describe("Cardano address detection", () => {
  it("detects Shelley addr1 address", () => {
    const addr = "addr1" + "a".repeat(58);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("cardano");
    expect(results[0].inputType).toBe("address");
  });

  it("detects Byron Ae2 address", () => {
    const addr = "Ae2" + "B".repeat(50);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("cardano");
  });

  it("detects Byron DdzFF address", () => {
    const addr = "DdzFF" + "B".repeat(50);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("cardano");
  });
});

// --- Lightning Network ---

describe("Lightning Network detection", () => {
  it("detects node pubkey (66 hex chars)", () => {
    const pubkey = "02" + "a".repeat(64);
    const results = detect(pubkey, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("lightning");
    expect(results[0].inputType).toBe("address");
  });

  it("generates explorer URLs for node pubkey", () => {
    const pubkey = "02" + "a".repeat(64);
    const results = detect(pubkey, CHAINS);
    expect(results[0].explorerUrls.length).toBe(2);
    expect(results[0].explorerUrls[0].name).toBe("mempool.space");
    expect(results[0].explorerUrls[0].url).toContain("/lightning/node/");
    expect(results[0].explorerUrls[1].name).toBe("Amboss");
    expect(results[0].explorerUrls[1].url).toContain("/node/");
  });
});

// --- Filecoin ---

describe("Filecoin detection", () => {
  it("detects f1 address (secp256k1)", () => {
    const results = detect("f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("filecoin");
    expect(results[0].inputType).toBe("address");
  });

  it("detects f0 address (ID)", () => {
    const results = detect("f01234", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("filecoin");
    expect(results[0].inputType).toBe("address");
  });

  it("detects f3 address (BLS)", () => {
    const results = detect("f3vfs6f7tagrcpnwv65wq3leznbajqyg77bmijrpvoyjv3zjyi3urq25vigfbs3ob6ug5xdihajumtgsxnz2pa", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("filecoin");
  });

  it("detects bafy CID as transaction", () => {
    const results = detect("bafy2bzacedfto5wl5xbafi3yiop6xfbji4wnr2qhp64zra73wku7qdmcuwsta", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("filecoin");
    expect(results[0].inputType).toBe("transaction");
  });

  it("generates explorer URLs", () => {
    const results = detect("f01234", CHAINS);
    expect(results[0].explorerUrls[0].name).toBe("Filfox");
    expect(results[0].explorerUrls[0].url).toContain("/en/address/f01234");
  });
});

// --- Hedera ---

describe("Hedera detection", () => {
  it("detects 0.0.xxx account", () => {
    const results = detect("0.0.1234567", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("hedera");
    expect(results[0].inputType).toBe("address");
  });

  it("generates explorer URLs", () => {
    const results = detect("0.0.1234567", CHAINS);
    expect(results[0].explorerUrls[0].name).toBe("HashScan");
    expect(results[0].explorerUrls[0].url).toContain("/mainnet/account/0.0.1234567");
  });
});

// --- Kaspa ---

describe("Kaspa detection", () => {
  it("detects kaspa: prefixed address", () => {
    const results = detect("kaspa:qr6m0t8gkfhsn0l5ynfadtvuetg3fle940dalpsqqaqeqqq4lujwsg3wrr50", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("kaspa");
    expect(results[0].inputType).toBe("address");
  });

  it("generates explorer URLs", () => {
    const results = detect("kaspa:qz1234abc", CHAINS);
    expect(results[0].explorerUrls[0].name).toBe("Kaspa Explorer");
    expect(results[0].explorerUrls[0].url).toContain("/addresses/");
  });
});

// --- Algorand ---

describe("Algorand detection", () => {
  it("detects 58-char uppercase base32 address", () => {
    const addr = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    expect(addr.length).toBe(58);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("algorand");
    expect(results[0].inputType).toBe("address");
  });

  it("rejects lowercase", () => {
    const addr = "a".repeat(58);
    const results = detect(addr, CHAINS);
    // Should not match Algorand (lowercase)
    const algo = results.find((r) => r.chain.id === "algorand");
    expect(algo).toBeUndefined();
  });

  it("does not conflict with Stellar (56 chars)", () => {
    const stellar = "G" + "A".repeat(55);
    expect(stellar.length).toBe(56);
    const results = detect(stellar, CHAINS);
    expect(results[0].chain.id).toBe("stellar");
  });
});

// --- MultiversX ---

describe("MultiversX detection", () => {
  it("detects erd1 address (62 chars)", () => {
    const addr = "erd1" + "a".repeat(58);
    expect(addr.length).toBe(62);
    const results = detect(addr, CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("multiversx");
    expect(results[0].inputType).toBe("address");
  });

  it("rejects wrong length", () => {
    const addr = "erd1" + "a".repeat(57);
    const results = detect(addr, CHAINS);
    const mvx = results.find((r) => r.chain.id === "multiversx");
    expect(mvx).toBeUndefined();
  });

  it("MultiversX tx in bare 64 hex block", () => {
    const hex64 = "a".repeat(64);
    const results = detect(hex64, CHAINS);
    const mvx = results.find((r) => r.chain.id === "multiversx");
    expect(mvx).toBeDefined();
    expect(mvx!.inputType).toBe("transaction");
  });
});

// --- Starknet ---

describe("Starknet detection", () => {
  it("detects in 0x + 64 hex block as address and transaction", () => {
    const hash = "0x" + "a".repeat(64);
    const results = detect(hash, CHAINS);
    const starknet = results.filter((r) => r.chain.id === "starknet");
    expect(starknet).toHaveLength(2);
    expect(starknet.map((r) => r.inputType).sort()).toEqual(["address", "transaction"]);
  });

  it("generates explorer URLs", () => {
    const hash = "0x" + "a".repeat(64);
    const results = detect(hash, CHAINS);
    const starknetAddr = results.find((r) => r.chain.id === "starknet" && r.inputType === "address")!;
    expect(starknetAddr.explorerUrls.length).toBe(2);
    expect(starknetAddr.explorerUrls[0].name).toBe("Starkscan");
    expect(starknetAddr.explorerUrls[0].url).toContain("/contract/");
    expect(starknetAddr.explorerUrls[1].name).toBe("Voyager");
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

  it("includes UTXO chains as tx", () => {
    const results = detect(hex64, CHAINS);
    expect(results.find((r) => r.chain.id === "dogecoin")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "litecoin")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "bitcoin-cash")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "zcash")!.inputType).toBe("transaction");
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

  it("includes Monero, XRP, Stellar, Cardano as tx", () => {
    const results = detect(hex64, CHAINS);
    expect(results.find((r) => r.chain.id === "monero")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "xrp")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "stellar")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "cardano")!.inputType).toBe("transaction");
  });

  it("includes MultiversX and Kaspa as tx", () => {
    const results = detect(hex64, CHAINS);
    expect(results.find((r) => r.chain.id === "multiversx")!.inputType).toBe("transaction");
    expect(results.find((r) => r.chain.id === "kaspa")!.inputType).toBe("transaction");
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
    const addr = "B".repeat(32);
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

// --- Testnet detection ---

describe("Litecoin testnet detection", () => {
  it("detects tltc1 bech32 address", () => {
    const results = detect("tltc1qar0srrr7xfkvy5l643lydnw9re59gtzzwfhmdq", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("litecoin-testnet");
    expect(results[0].inputType).toBe("address");
  });
});

describe("Filecoin Calibration testnet detection", () => {
  it("detects t0 address (ID)", () => {
    const results = detect("t01234", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("filecoin-calibration");
    expect(results[0].inputType).toBe("address");
  });

  it("detects t1 address (secp256k1) — not conflicting with ZCash", () => {
    // Filecoin t1 addresses are typically ~41 chars, ZCash t1 is exactly 34
    const results = detect("t1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("filecoin-calibration");
  });

  it("ZCash t1 still detected as ZCash (34 chars, base58)", () => {
    // ZCash: t1 + 32 base58 chars
    const results = detect("t1" + "R".repeat(32), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("zcash");
  });
});

describe("Kaspa testnet detection", () => {
  it("detects kaspatest: prefixed address", () => {
    const results = detect("kaspatest:qr6m0t8gkfhsn0l5ynfadtvuetg3fle940dalpsqqaqeqqq4lujwsg3wrr50", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("kaspa-testnet");
    expect(results[0].inputType).toBe("address");
  });
});

describe("Bitcoin testnet detection", () => {
  it("detects tb1 bech32 address", () => {
    const results = detect("tb1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin-testnet");
    expect(results[0].inputType).toBe("address");
  });

  it("detects m prefix legacy address", () => {
    const results = detect("m" + "A".repeat(33), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin-testnet");
  });
});

describe("Cardano testnet detection", () => {
  it("detects addr_test1 address", () => {
    const results = detect("addr_test1" + "a".repeat(50), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("cardano-preprod");
    expect(results[0].inputType).toBe("address");
  });
});

describe("NEAR testnet detection", () => {
  it("detects *.testnet addresses", () => {
    const results = detect("alice.testnet", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("near-testnet");
    expect(results[0].inputType).toBe("address");
  });
});

describe("Bitcoin Cash testnet detection", () => {
  it("detects bchtest: prefixed address", () => {
    const results = detect("bchtest:q" + "a".repeat(41), CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("bitcoin-cash-testnet");
    expect(results[0].inputType).toBe("address");
  });
});

// --- Urbit detection ---

describe("Urbit ship name detection", () => {
  it("detects galaxy with tilde (~zod)", () => {
    const results = detect("~zod", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("urbit");
    expect(results[0].inputType).toBe("address");
  });

  it("detects galaxy without tilde (zod)", () => {
    const results = detect("zod", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("urbit");
  });

  it("detects star with tilde (~marzod)", () => {
    const results = detect("~marzod", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("urbit");
  });

  it("detects star without tilde (marzod)", () => {
    const results = detect("marzod", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("urbit");
  });

  it("detects planet with tilde (~sampel-palnet)", () => {
    const results = detect("~sampel-palnet", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("urbit");
  });

  it("detects planet without tilde (sampel-palnet)", () => {
    const results = detect("sampel-palnet", CHAINS);
    expect(results).toHaveLength(1);
    expect(results[0].chain.id).toBe("urbit");
  });

  it("normalizes explorer URL to include tilde", () => {
    const results = detect("ripled", CHAINS);
    expect(results[0].explorerUrls[0].url).toContain("~ripled");
  });

  it("explorer URL includes tilde when input already has it", () => {
    const results = detect("~ripled", CHAINS);
    expect(results[0].explorerUrls[0].url).toContain("~ripled");
    // Should not have double tilde
    expect(results[0].explorerUrls[0].url).not.toContain("~~");
  });

  it("rejects invalid phonemes (abc is not a valid suffix)", () => {
    expect(detect("~abc", CHAINS)).toHaveLength(0);
  });

  it("rejects invalid star (abczod — abc is not a valid prefix)", () => {
    expect(detect("~abczod", CHAINS)).toHaveLength(0);
  });

  it("rejects names with wrong length (4 chars)", () => {
    expect(detect("abcd", CHAINS)).toHaveLength(0);
  });

  it("rejects names with wrong length (5 chars)", () => {
    expect(detect("abcde", CHAINS)).toHaveLength(0);
  });
});
