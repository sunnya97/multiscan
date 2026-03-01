import { Chain, InputType } from "./chains";

interface Match {
  chainId: string;
  inputType: InputType;
}

const BASE58_CHAR = "[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]";

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
    );
    // Sui address or transaction (both are 0x + 64 hex)
    matches.push({ chainId: "sui", inputType: "address" }, { chainId: "sui", inputType: "transaction" });
    // Aptos address or transaction
    matches.push({ chainId: "aptos", inputType: "address" }, { chainId: "aptos", inputType: "transaction" });
    return matches;
  }

  // IBC denom: ibc/ + 64 hex chars — candidate for all Cosmos chains
  if (/^ibc\/[0-9A-Fa-f]{64}$/i.test(trimmed)) {
    matches.push(
      { chainId: "cosmos", inputType: "denom" },
      { chainId: "osmosis", inputType: "denom" },
      { chainId: "celestia", inputType: "denom" },
    );
    return matches;
  }

  // Factory denom: factory/<bech32>/... — match chain by bech32 prefix
  if (/^factory\/[a-z]+1[a-z0-9]+\/.+$/.test(trimmed)) {
    const bech32Addr = trimmed.split("/")[1];
    const prefix = bech32Addr.split("1")[0];
    const prefixToChain: Record<string, string> = {
      osmo: "osmosis",
      cosmos: "cosmos",
      celestia: "celestia",
    };
    const chainId = prefixToChain[prefix];
    if (chainId) {
      matches.push({ chainId, inputType: "denom" });
    }
    return matches;
  }

  // Cosmos-family addresses with specific prefixes
  if (/^cosmos1[a-z0-9]{38,58}$/.test(trimmed)) {
    matches.push({ chainId: "cosmos", inputType: "address" });
    return matches;
  }
  if (/^osmo1[a-z0-9]{38,58}$/.test(trimmed)) {
    matches.push({ chainId: "osmosis", inputType: "address" });
    return matches;
  }
  if (/^celestia1[a-z0-9]{38,58}$/.test(trimmed)) {
    matches.push({ chainId: "celestia", inputType: "address" });
    return matches;
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

  // 64 hex chars (no 0x prefix) — could be Bitcoin tx, Cosmos txs, Tron tx, TON tx, Polkadot tx, NEAR implicit addr
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    matches.push(
      { chainId: "bitcoin", inputType: "transaction" },
      { chainId: "cosmos", inputType: "transaction" },
      { chainId: "osmosis", inputType: "transaction" },
      { chainId: "celestia", inputType: "transaction" },
      { chainId: "tron", inputType: "transaction" },
      { chainId: "ton", inputType: "transaction" },
      { chainId: "polkadot", inputType: "transaction" },
      { chainId: "near", inputType: "address" },
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
