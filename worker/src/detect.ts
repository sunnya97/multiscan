import { Chain, CHAINS, InputType } from "./chains";

interface Match {
  chainId: string;
  inputType: InputType;
}

const BASE58_CHAR = "[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]";

// Build Cosmos lookup tables from CHAINS data
const COSMOS_CHAINS_LIST = CHAINS.filter((c) => c.family === "cosmos" && c.bech32Prefix);
const BECH32_PREFIX_TO_CHAIN = new Map(COSMOS_CHAINS_LIST.map((c) => [c.bech32Prefix!, c.id]));
const COSMOS_CHAIN_IDS = COSMOS_CHAINS_LIST.map((c) => c.id);

function getMatches(input: string): Match[] {
  const matches: Match[] = [];
  const trimmed = input.trim();

  if (!trimmed) return matches;

  // 0x + 40 hex chars = EVM address (42 chars total)
  if (/^0x[0-9a-fA-F]{40}$/i.test(trimmed)) {
    matches.push(
      { chainId: "ethereum", inputType: "address" },
      { chainId: "base", inputType: "address" },
      { chainId: "arbitrum", inputType: "address" },
      { chainId: "optimism", inputType: "address" },
      { chainId: "polygon", inputType: "address" },
      { chainId: "bsc", inputType: "address" },
      { chainId: "avalanche", inputType: "address" },
      { chainId: "fantom", inputType: "address" },
      { chainId: "zksync", inputType: "address" },
      { chainId: "linea", inputType: "address" },
      { chainId: "scroll", inputType: "address" },
      { chainId: "mantle", inputType: "address" },
      { chainId: "ethereum-classic", inputType: "address" },
      { chainId: "hyperliquid-evm", inputType: "address" },
      { chainId: "hyperliquid-core", inputType: "address" },
    );
    return matches;
  }

  // 0x + 64 hex chars (66 chars total) = EVM tx hash + Sui addr/tx + Aptos addr/tx
  if (/^0x[0-9a-fA-F]{64}$/i.test(trimmed)) {
    // EVM transaction
    matches.push(
      { chainId: "ethereum", inputType: "transaction" },
      { chainId: "base", inputType: "transaction" },
      { chainId: "arbitrum", inputType: "transaction" },
      { chainId: "optimism", inputType: "transaction" },
      { chainId: "polygon", inputType: "transaction" },
      { chainId: "bsc", inputType: "transaction" },
      { chainId: "avalanche", inputType: "transaction" },
      { chainId: "fantom", inputType: "transaction" },
      { chainId: "zksync", inputType: "transaction" },
      { chainId: "linea", inputType: "transaction" },
      { chainId: "scroll", inputType: "transaction" },
      { chainId: "mantle", inputType: "transaction" },
      { chainId: "ethereum-classic", inputType: "transaction" },
      { chainId: "hyperliquid-evm", inputType: "transaction" },
      { chainId: "hyperliquid-core", inputType: "transaction" },
    );
    // Sui address or transaction (both are 0x + 64 hex)
    matches.push({ chainId: "sui", inputType: "address" }, { chainId: "sui", inputType: "transaction" });
    // Aptos address or transaction
    matches.push({ chainId: "aptos", inputType: "address" }, { chainId: "aptos", inputType: "transaction" });
    // Bittensor extrinsic hash
    matches.push({ chainId: "bittensor", inputType: "transaction" });
    return matches;
  }

  // IBC denom: ibc/ + 64 hex chars — candidate for all Cosmos chains
  if (/^ibc\/[0-9A-Fa-f]{64}$/i.test(trimmed)) {
    for (const chainId of COSMOS_CHAIN_IDS) {
      matches.push({ chainId, inputType: "denom" });
    }
    return matches;
  }

  // Factory denom: factory/<bech32>/... — match chain by bech32 prefix
  if (/^factory\/[a-z]+1[a-z0-9]+\/.+$/.test(trimmed)) {
    const bech32Addr = trimmed.split("/")[1];
    const prefix = bech32Addr.split("1")[0];
    const chainId = BECH32_PREFIX_TO_CHAIN.get(prefix);
    if (chainId) {
      matches.push({ chainId, inputType: "denom" });
    }
    return matches;
  }

  // Cosmos-family addresses — match by bech32 prefix
  for (const [prefix, chainId] of BECH32_PREFIX_TO_CHAIN) {
    const regex = new RegExp(`^${prefix}1[a-z0-9]{38,58}$`);
    if (regex.test(trimmed)) {
      matches.push({ chainId, inputType: "address" });
      return matches;
    }
  }

  // Bitcoin addresses
  // Legacy (1...) and P2SH (3...) — base58, 25-34 chars
  const btcLegacyRegex = new RegExp(`^[13]${BASE58_CHAR}{24,33}$`);
  if (btcLegacyRegex.test(trimmed)) {
    matches.push({ chainId: "bitcoin", inputType: "address" });
    return matches;
  }
  // Bech32 (bc1...)
  if (/^bc1[a-zA-HJ-NP-Za-km-z0-9]{25,62}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin", inputType: "address" });
    return matches;
  }

  // Dogecoin address: D + base58, 25-34 chars (legacy), A/9 for P2SH
  const dogeAddrRegex = new RegExp(`^[DA9]${BASE58_CHAR}{24,33}$`);
  if (dogeAddrRegex.test(trimmed)) {
    // D prefix is unique to Dogecoin; A/9 are Dogecoin P2SH
    if (trimmed[0] === "D" || trimmed[0] === "A" || trimmed[0] === "9") {
      matches.push({ chainId: "dogecoin", inputType: "address" });
      return matches;
    }
  }

  // Litecoin address: L/M + base58 (27-34 chars), or ltc1 bech32
  const ltcLegacyRegex = new RegExp(`^[LM]${BASE58_CHAR}{26,33}$`);
  if (ltcLegacyRegex.test(trimmed)) {
    matches.push({ chainId: "litecoin", inputType: "address" });
    return matches;
  }
  if (/^ltc1[a-zA-HJ-NP-Za-km-z0-9]{25,62}$/.test(trimmed)) {
    matches.push({ chainId: "litecoin", inputType: "address" });
    return matches;
  }

  // Bitcoin Cash CashAddr: q/p + base32 (42 chars), optionally prefixed with bitcoincash:
  if (/^(bitcoincash:)?[qp][a-z0-9]{41}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin-cash", inputType: "address" });
    return matches;
  }

  // ZCash address: t1/t3 + base58 (33 chars), or zs1 bech32
  const zcashTransparentRegex = new RegExp(`^t[13]${BASE58_CHAR}{32}$`);
  if (zcashTransparentRegex.test(trimmed)) {
    matches.push({ chainId: "zcash", inputType: "address" });
    return matches;
  }
  if (/^zs1[a-z0-9]{65,}$/.test(trimmed)) {
    matches.push({ chainId: "zcash", inputType: "address" });
    return matches;
  }

  // Monero address: starts with 4 or 8, 95 base58 chars
  const moneroAddrRegex = new RegExp(`^[48]${BASE58_CHAR}{94}$`);
  if (moneroAddrRegex.test(trimmed)) {
    matches.push({ chainId: "monero", inputType: "address" });
    return matches;
  }

  // XRP address: starts with r, base58 25-35 chars
  const xrpAddrRegex = new RegExp(`^r${BASE58_CHAR}{24,34}$`);
  if (xrpAddrRegex.test(trimmed)) {
    matches.push({ chainId: "xrp", inputType: "address" });
    return matches;
  }

  // Stellar address: starts with G, 56 chars (base32 uppercase)
  if (/^G[A-Z2-7]{55}$/.test(trimmed)) {
    matches.push({ chainId: "stellar", inputType: "address" });
    return matches;
  }

  // Bittensor address: starts with 5, SS58 format, 48 chars
  const bittensorAddrRegex = new RegExp(`^5${BASE58_CHAR}{47}$`);
  if (bittensorAddrRegex.test(trimmed)) {
    matches.push({ chainId: "bittensor", inputType: "address" });
    return matches;
  }

  // Cardano address: Shelley addr1 + bech32 (58+ chars), Byron Ae2/DdzFF + base58
  if (/^addr1[a-z0-9]{58,}$/.test(trimmed)) {
    matches.push({ chainId: "cardano", inputType: "address" });
    return matches;
  }
  const cardanoByronRegex = new RegExp(`^(Ae2|DdzFF)${BASE58_CHAR}{50,}$`);
  if (cardanoByronRegex.test(trimmed)) {
    matches.push({ chainId: "cardano", inputType: "address" });
    return matches;
  }

  // Tron address: T + 33 base58 chars (34 chars total)
  const tronAddrRegex = new RegExp(`^T${BASE58_CHAR}{33}$`);
  if (tronAddrRegex.test(trimmed)) {
    matches.push({ chainId: "tron", inputType: "address" });
    return matches;
  }

  // TON address: EQ/UQ + 46 chars (raw format with hyphens/underscores), or raw format
  if (/^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(trimmed)) {
    matches.push({ chainId: "ton", inputType: "address" });
    return matches;
  }
  // TON raw address format: workchain:hex
  if (/^-?\d+:[0-9a-fA-F]{64}$/.test(trimmed)) {
    matches.push({ chainId: "ton", inputType: "address" });
    return matches;
  }

  // Polkadot address: 1 + 45-47 base58 chars
  const polkadotAddrRegex = new RegExp(`^1${BASE58_CHAR}{45,47}$`);
  if (polkadotAddrRegex.test(trimmed)) {
    matches.push({ chainId: "polkadot", inputType: "address" });
    return matches;
  }

  // NEAR named address: *.near
  if (/^[a-z0-9_-]+\.near$/.test(trimmed)) {
    matches.push({ chainId: "near", inputType: "address" });
    return matches;
  }

  // Solana transaction signature: base58, 80-90 chars
  const solanaTxRegex = new RegExp(`^${BASE58_CHAR}{80,90}$`);
  if (solanaTxRegex.test(trimmed)) {
    matches.push({ chainId: "solana", inputType: "transaction" });
    return matches;
  }

  // Lightning Network: node pubkey (66 hex chars, no 0x prefix)
  if (/^[0-9a-fA-F]{66}$/.test(trimmed)) {
    matches.push({ chainId: "lightning", inputType: "address" });
    return matches;
  }

  // 64 hex chars (no 0x prefix) — could be Bitcoin tx, Cosmos txs, Tron tx, TON tx, Polkadot tx, NEAR implicit addr, UTXO txs
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    matches.push({ chainId: "bitcoin", inputType: "transaction" });
    matches.push({ chainId: "dogecoin", inputType: "transaction" });
    matches.push({ chainId: "litecoin", inputType: "transaction" });
    matches.push({ chainId: "bitcoin-cash", inputType: "transaction" });
    matches.push({ chainId: "zcash", inputType: "transaction" });
    for (const chainId of COSMOS_CHAIN_IDS) {
      matches.push({ chainId, inputType: "transaction" });
    }
    matches.push(
      { chainId: "tron", inputType: "transaction" },
      { chainId: "ton", inputType: "transaction" },
      { chainId: "polkadot", inputType: "transaction" },
      { chainId: "near", inputType: "address" },
      { chainId: "monero", inputType: "transaction" },
      { chainId: "xrp", inputType: "transaction" },
      { chainId: "stellar", inputType: "transaction" },
      { chainId: "cardano", inputType: "transaction" },
    );
    return matches;
  }

  // Solana address: base58, 32-44 chars
  const solanaAddrRegex = new RegExp(`^${BASE58_CHAR}{32,44}$`);
  if (solanaAddrRegex.test(trimmed)) {
    matches.push({ chainId: "solana", inputType: "address" });
    return matches;
  }

  return matches;
}

export interface ExplorerUrl {
  name: string;
  url: string;
}

export interface DetectionResult {
  chain: Chain;
  inputType: InputType;
  explorerUrls: ExplorerUrl[];
}

function buildExplorerUrls(chain: Chain, inputType: InputType, query: string): ExplorerUrl[] {
  return chain.explorers
    .map((explorer) => {
      let pathTemplate: string;
      if (inputType === "denom") {
        if (!explorer.denomPath) return null;
        pathTemplate = explorer.denomPath;
      } else {
        pathTemplate = inputType === "address" ? explorer.addressPath : explorer.txPath;
      }
      const path = pathTemplate.replace("{query}", encodeURIComponent(query));
      return { name: explorer.name, url: `${explorer.baseUrl}${path}` };
    })
    .filter((u): u is ExplorerUrl => u !== null);
}

export function detect(input: string, chains: Chain[]): DetectionResult[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const matches = getMatches(trimmed);
  const chainMap = new Map(chains.map((c) => [c.id, c]));

  return matches
    .map((m) => {
      const chain = chainMap.get(m.chainId);
      if (!chain) return null;
      return {
        chain,
        inputType: m.inputType,
        explorerUrls: buildExplorerUrls(chain, m.inputType, trimmed),
      };
    })
    .filter((r): r is DetectionResult => r !== null);
}
