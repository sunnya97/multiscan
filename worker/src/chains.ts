export type FormatFamily =
  | "evm"
  | "bitcoin"
  | "solana"
  | "cosmos"
  | "sui"
  | "aptos"
  | "tron"
  | "ton"
  | "polkadot"
  | "near"
  | "dogecoin"
  | "litecoin"
  | "bitcoincash"
  | "zcash"
  | "monero"
  | "xrp"
  | "stellar"
  | "bittensor"
  | "cardano"
  | "lightning"
  | "filecoin"
  | "hedera"
  | "kaspa"
  | "algorand"
  | "multiversx"
  | "starknet";

export type InputType = "address" | "transaction" | "denom";

export interface Explorer {
  name: string;
  baseUrl: string;
  addressPath: string;
  txPath: string;
  tokenPath?: string; // e.g. "/token/{query}" — used when address is a token contract
  denomPath?: string; // e.g. "/assets/{query}" — used for Cosmos denom lookups
}

export interface RpcEndpoint {
  url: string; // URL or template with {key} placeholder
  provider: "alchemy" | "helius" | "public";
  keyEnvVar?: string; // env secret name, e.g. "ALCHEMY_API_KEY"
}

export interface Chain {
  id: string;
  name: string;
  symbol: string;
  family: FormatFamily;
  explorers: Explorer[];
  etherscanChainId?: number;
  alchemyNetwork?: string; // e.g. "eth-mainnet" — used by Portfolio API
  coingeckoPlatformId?: string; // e.g. "ethereum" — used by CoinGecko API for token lookup
  bech32Prefix?: string; // e.g. "cosmos", "osmo" — used for Cosmos address detection
  rpcUrls: RpcEndpoint[];
}

export interface Env {
  ETHERSCAN_API_KEY?: string;
  ALCHEMY_API_KEY?: string;
  HELIUS_API_KEY?: string;
}

/** Replace {key} placeholder with the actual secret value. Returns null if key is required but missing. */
export function resolveRpcUrl(endpoint: RpcEndpoint, env: Env): string | null {
  if (!endpoint.keyEnvVar) return endpoint.url;
  const key = env[endpoint.keyEnvVar as keyof Env];
  if (!key) return null;
  return endpoint.url.replace("{key}", key);
}

/** Returns the Alchemy RPC URL for a chain, or null if no Alchemy endpoint is configured / key is missing. */
export function getAlchemyRpcUrl(chain: Chain, env: Env): string | null {
  const ep = chain.rpcUrls.find((e) => e.provider === "alchemy");
  if (!ep) return null;
  return resolveRpcUrl(ep, env);
}

/** Returns ordered list of concrete URLs for a chain, skipping endpoints whose keys are missing. */
export function getResolvedRpcUrls(chain: Chain, env: Env): string[] {
  const urls: string[] = [];
  for (const ep of chain.rpcUrls) {
    const resolved = resolveRpcUrl(ep, env);
    if (resolved) urls.push(resolved);
  }
  return urls;
}

export const CHAINS: Chain[] = [
  // --- EVM Chains ---
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "Etherscan", baseUrl: "https://etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://eth.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 1,
    alchemyNetwork: "eth-mainnet",
    coingeckoPlatformId: "ethereum",
    rpcUrls: [
      { url: "https://eth-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://ethereum-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "base",
    name: "Base",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "Basescan", baseUrl: "https://basescan.org", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://base.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 8453,
    alchemyNetwork: "base-mainnet",
    coingeckoPlatformId: "base",
    rpcUrls: [
      { url: "https://base-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://base-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "Arbiscan", baseUrl: "https://arbiscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://arbitrum.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 42161,
    alchemyNetwork: "arb-mainnet",
    coingeckoPlatformId: "arbitrum-one",
    rpcUrls: [
      { url: "https://arb-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://arbitrum-one-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "Optimistic Etherscan", baseUrl: "https://optimistic.etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://optimism.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 10,
    alchemyNetwork: "opt-mainnet",
    coingeckoPlatformId: "optimistic-ethereum",
    rpcUrls: [
      { url: "https://opt-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://optimism-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "POL",
    family: "evm",
    explorers: [
      { name: "Polygonscan", baseUrl: "https://polygonscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://polygon.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 137,
    alchemyNetwork: "polygon-mainnet",
    coingeckoPlatformId: "polygon-pos",
    rpcUrls: [
      { url: "https://polygon-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://polygon-bor-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "bsc",
    name: "BSC",
    symbol: "BNB",
    family: "evm",
    explorers: [
      { name: "BscScan", baseUrl: "https://bscscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://bsc.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 56,
    alchemyNetwork: "bnb-mainnet",
    coingeckoPlatformId: "binance-smart-chain",
    rpcUrls: [
      { url: "https://bnb-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://bsc-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "avalanche",
    name: "Avalanche",
    symbol: "AVAX",
    family: "evm",
    explorers: [
      { name: "Snowscan", baseUrl: "https://snowscan.xyz", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://avalanche.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 43114,
    alchemyNetwork: "avax-mainnet",
    coingeckoPlatformId: "avalanche",
    rpcUrls: [
      { url: "https://avax-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://avalanche-c-chain-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "fantom",
    name: "Fantom",
    symbol: "FTM",
    family: "evm",
    explorers: [
      { name: "FtmScan", baseUrl: "https://ftmscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    coingeckoPlatformId: "fantom",
    rpcUrls: [
      { url: "https://rpcapi.fantom.network", provider: "public" },
    ],
  },
  {
    id: "zksync",
    name: "zkSync Era",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "zkSync Explorer", baseUrl: "https://explorer.zksync.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://zksync.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    alchemyNetwork: "zksync-mainnet",
    coingeckoPlatformId: "zksync",
    rpcUrls: [
      { url: "https://zksync-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://mainnet.era.zksync.io", provider: "public" },
    ],
  },
  {
    id: "linea",
    name: "Linea",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "Lineascan", baseUrl: "https://lineascan.build", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://linea.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 59144,
    alchemyNetwork: "linea-mainnet",
    coingeckoPlatformId: "linea",
    rpcUrls: [
      { url: "https://linea-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://linea-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "scroll",
    name: "Scroll",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "Scrollscan", baseUrl: "https://scrollscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://scroll.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 534352,
    alchemyNetwork: "scroll-mainnet",
    coingeckoPlatformId: "scroll",
    rpcUrls: [
      { url: "https://scroll-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://scroll-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "mantle",
    name: "Mantle",
    symbol: "MNT",
    family: "evm",
    explorers: [
      { name: "Mantlescan", baseUrl: "https://mantlescan.xyz", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Blockscout", baseUrl: "https://mantle.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 5000,
    alchemyNetwork: "mantle-mainnet",
    coingeckoPlatformId: "mantle",
    rpcUrls: [
      { url: "https://mantle-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://mantle-rpc.publicnode.com", provider: "public" },
    ],
  },

  {
    id: "ethereum-classic",
    name: "Ethereum Classic",
    symbol: "ETC",
    family: "evm",
    explorers: [
      { name: "Blockscout", baseUrl: "https://etc.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://etc.blockscout.com/api/eth-rpc", provider: "public" },
    ],
  },

  {
    id: "hyperliquid-evm",
    name: "HyperEVM",
    symbol: "HYPE",
    family: "evm",
    explorers: [
      { name: "Hypurrscan", baseUrl: "https://hypurrscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.hyperliquid.xyz/evm", provider: "public" },
    ],
  },
  {
    id: "hyperliquid-core",
    name: "HyperCore",
    symbol: "HYPE",
    family: "evm",
    explorers: [
      { name: "Hypurrscan", baseUrl: "https://hypurrscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.hyperliquid.xyz/info", provider: "public" },
    ],
  },

  // --- Non-EVM Chains ---
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    family: "bitcoin",
    explorers: [
      { name: "mempool.space", baseUrl: "https://mempool.space", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockstream", baseUrl: "https://blockstream.info", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://mempool.space/api", provider: "public" },
    ],
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    family: "solana",
    explorers: [
      { name: "Solscan", baseUrl: "https://solscan.io", addressPath: "/account/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
      { name: "Solana Explorer", baseUrl: "https://explorer.solana.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "SolanaFM", baseUrl: "https://solana.fm", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    coingeckoPlatformId: "solana",
    rpcUrls: [
      { url: "https://mainnet.helius-rpc.com/?api-key={key}", provider: "helius", keyEnvVar: "HELIUS_API_KEY" },
      { url: "https://solana-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://api.mainnet-beta.solana.com", provider: "public" },
    ],
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    family: "dogecoin",
    explorers: [
      { name: "Blockchair", baseUrl: "https://blockchair.com/dogecoin", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.blockcypher.com/v1/doge/main", provider: "public" },
    ],
  },
  {
    id: "litecoin",
    name: "Litecoin",
    symbol: "LTC",
    family: "litecoin",
    explorers: [
      { name: "Blockchair", baseUrl: "https://blockchair.com/litecoin", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.blockcypher.com/v1/ltc/main", provider: "public" },
    ],
  },
  {
    id: "bitcoin-cash",
    name: "Bitcoin Cash",
    symbol: "BCH",
    family: "bitcoincash",
    explorers: [
      { name: "Blockchair", baseUrl: "https://blockchair.com/bitcoin-cash", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.blockchair.com/bitcoin-cash", provider: "public" },
    ],
  },
  {
    id: "zcash",
    name: "ZCash",
    symbol: "ZEC",
    family: "zcash",
    explorers: [
      { name: "Blockchair", baseUrl: "https://blockchair.com/zcash", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.blockchair.com/zcash", provider: "public" },
    ],
  },

  // --- Cosmos Chains ---
  {
    id: "cosmos",
    name: "Cosmos Hub",
    symbol: "ATOM",
    family: "cosmos",
    bech32Prefix: "cosmos",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/cosmos", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://cosmos-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "osmosis",
    name: "Osmosis",
    symbol: "OSMO",
    family: "cosmos",
    bech32Prefix: "osmo",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/osmosis", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://osmosis-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "celestia",
    name: "Celestia",
    symbol: "TIA",
    family: "cosmos",
    bech32Prefix: "celestia",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/celestia", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
      { name: "Celenium", baseUrl: "https://celenium.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://celestia-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "dydx",
    name: "dYdX",
    symbol: "DYDX",
    family: "cosmos",
    bech32Prefix: "dydx",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/dydx", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://dydx-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "injective",
    name: "Injective",
    symbol: "INJ",
    family: "cosmos",
    bech32Prefix: "inj",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/injective", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://injective-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "sei",
    name: "Sei",
    symbol: "SEI",
    family: "cosmos",
    bech32Prefix: "sei",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/sei", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://sei-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "stride",
    name: "Stride",
    symbol: "STRD",
    family: "cosmos",
    bech32Prefix: "stride",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/stride", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://stride-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "stargaze",
    name: "Stargaze",
    symbol: "STARS",
    family: "cosmos",
    bech32Prefix: "stars",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/stargaze", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://stargaze-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "akash",
    name: "Akash",
    symbol: "AKT",
    family: "cosmos",
    bech32Prefix: "akash",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/akash", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://akash-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "axelar",
    name: "Axelar",
    symbol: "AXL",
    family: "cosmos",
    bech32Prefix: "axelar",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/axelar", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://axelar-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "kava",
    name: "Kava",
    symbol: "KAVA",
    family: "cosmos",
    bech32Prefix: "kava",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/kava", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://kava-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "juno",
    name: "Juno",
    symbol: "JUNO",
    family: "cosmos",
    bech32Prefix: "juno",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/juno", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://juno-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "evmos",
    name: "Evmos",
    symbol: "EVMOS",
    family: "cosmos",
    bech32Prefix: "evmos",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/evmos", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://evmos-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "secret",
    name: "Secret Network",
    symbol: "SCRT",
    family: "cosmos",
    bech32Prefix: "secret",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/secret", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://rest.lavenderfive.com:443/secretnetwork", provider: "public" },
    ],
  },
  {
    id: "band",
    name: "Band Protocol",
    symbol: "BAND",
    family: "cosmos",
    bech32Prefix: "band",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/band", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://laozi1.bandchain.org/api", provider: "public" },
    ],
  },
  {
    id: "persistence",
    name: "Persistence",
    symbol: "XPRT",
    family: "cosmos",
    bech32Prefix: "persistence",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/persistence", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://persistence-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "fetchai",
    name: "Fetch.ai",
    symbol: "FET",
    family: "cosmos",
    bech32Prefix: "fetch",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/fetchai", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://fetch-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "regen",
    name: "Regen",
    symbol: "REGEN",
    family: "cosmos",
    bech32Prefix: "regen",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/regen", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://regen-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    symbol: "DVPN",
    family: "cosmos",
    bech32Prefix: "sent",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/sentinel", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://sentinel-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "sommelier",
    name: "Sommelier",
    symbol: "SOMM",
    family: "cosmos",
    bech32Prefix: "somm",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/sommelier", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://api-sommelier.pupmos.network", provider: "public" },
    ],
  },
  {
    id: "chihuahua",
    name: "Chihuahua",
    symbol: "HUAHUA",
    family: "cosmos",
    bech32Prefix: "chihuahua",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/chihuahua", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://chihuahua-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "archway",
    name: "Archway",
    symbol: "ARCH",
    family: "cosmos",
    bech32Prefix: "archway",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/archway", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.mainnet.archway.io", provider: "public" },
    ],
  },
  {
    id: "noble",
    name: "Noble",
    symbol: "USDC",
    family: "cosmos",
    bech32Prefix: "noble",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/noble", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://noble-api.polkachu.com", provider: "public" },
    ],
  },
  {
    id: "neutron",
    name: "Neutron",
    symbol: "NTRN",
    family: "cosmos",
    bech32Prefix: "neutron",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/neutron", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://neutron-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "coreum",
    name: "Coreum",
    symbol: "CORE",
    family: "cosmos",
    bech32Prefix: "core",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/coreum", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://coreum-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "kyve",
    name: "KYVE",
    symbol: "KYVE",
    family: "cosmos",
    bech32Prefix: "kyve",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/kyve", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.kyve.network", provider: "public" },
    ],
  },
  {
    id: "agoric",
    name: "Agoric",
    symbol: "BLD",
    family: "cosmos",
    bech32Prefix: "agoric",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/agoric", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://main.api.agoric.net:443", provider: "public" },
    ],
  },
  {
    id: "omniflix",
    name: "OmniFlix",
    symbol: "FLIX",
    family: "cosmos",
    bech32Prefix: "omniflix",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/omniflix", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.omniflix.nodestake.org", provider: "public" },
    ],
  },
  {
    id: "terra",
    name: "Terra",
    symbol: "LUNA",
    family: "cosmos",
    bech32Prefix: "terra",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/terra", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://terra-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "gravity-bridge",
    name: "Gravity Bridge",
    symbol: "GRAV",
    family: "cosmos",
    bech32Prefix: "gravity",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/gravity-bridge", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://gravitychain.io:1317", provider: "public" },
    ],
  },
  {
    id: "iris",
    name: "IRISnet",
    symbol: "IRIS",
    family: "cosmos",
    bech32Prefix: "iaa",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/iris", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://iris-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "crypto-org",
    name: "Cronos POS",
    symbol: "CRO",
    family: "cosmos",
    bech32Prefix: "cro",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/crypto-org", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://rest.mainnet.crypto.org", provider: "public" },
    ],
  },
  {
    id: "dymension",
    name: "Dymension",
    symbol: "DYM",
    family: "cosmos",
    bech32Prefix: "dym",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/dymension", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://dymension-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "mantra",
    name: "MANTRA",
    symbol: "OM",
    family: "cosmos",
    bech32Prefix: "mantra",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/mantra", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.mantrachain.io", provider: "public" },
    ],
  },
  {
    id: "babylon",
    name: "Babylon",
    symbol: "BBN",
    family: "cosmos",
    bech32Prefix: "bbn",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/babylon", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://babylon-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "nolus",
    name: "Nolus",
    symbol: "NLS",
    family: "cosmos",
    bech32Prefix: "nolus",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/nolus", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://nolus-rest.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "pryzm",
    name: "Pryzm",
    symbol: "PRYZM",
    family: "cosmos",
    bech32Prefix: "pryzm",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/pryzm", addressPath: "/address/{query}", txPath: "/tx/{query}", denomPath: "/assets/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.pryzm.zone", provider: "public" },
    ],
  },
  {
    id: "sui",
    name: "Sui",
    symbol: "SUI",
    family: "sui",
    explorers: [
      { name: "Suiscan", baseUrl: "https://suiscan.xyz", addressPath: "/account/{query}", txPath: "/tx/{query}" },
      { name: "Sui Explorer", baseUrl: "https://suiexplorer.com", addressPath: "/address/{query}", txPath: "/txblock/{query}" },
    ],
    rpcUrls: [
      { url: "https://sui-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://fullnode.mainnet.sui.io", provider: "public" },
    ],
  },
  {
    id: "aptos",
    name: "Aptos",
    symbol: "APT",
    family: "aptos",
    explorers: [
      { name: "Aptos Explorer", baseUrl: "https://explorer.aptoslabs.com", addressPath: "/account/{query}", txPath: "/txn/{query}" },
      { name: "Apscan", baseUrl: "https://apscan.io", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://aptos-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://fullnode.mainnet.aptoslabs.com/v1", provider: "public" },
    ],
  },
  {
    id: "tron",
    name: "Tron",
    symbol: "TRX",
    family: "tron",
    explorers: [
      { name: "Tronscan", baseUrl: "https://tronscan.org", addressPath: "/#/address/{query}", txPath: "/#/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.trongrid.io", provider: "public" },
    ],
  },
  {
    id: "ton",
    name: "TON",
    symbol: "TON",
    family: "ton",
    explorers: [
      { name: "TON Viewer", baseUrl: "https://tonviewer.com", addressPath: "/{query}", txPath: "/transaction/{query}" },
      { name: "Tonscan", baseUrl: "https://tonscan.org", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://toncenter.com/api/v2", provider: "public" },
    ],
  },
  {
    id: "polkadot",
    name: "Polkadot",
    symbol: "DOT",
    family: "polkadot",
    explorers: [
      { name: "Subscan", baseUrl: "https://polkadot.subscan.io", addressPath: "/account/{query}", txPath: "/extrinsic/{query}" },
    ],
    rpcUrls: [
      { url: "https://polkadot-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "near",
    name: "NEAR",
    symbol: "NEAR",
    family: "near",
    explorers: [
      { name: "NearBlocks", baseUrl: "https://nearblocks.io", addressPath: "/address/{query}", txPath: "/txns/{query}" },
      { name: "NEAR Explorer", baseUrl: "https://explorer.near.org", addressPath: "/accounts/{query}", txPath: "/transactions/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.mainnet.near.org", provider: "public" },
    ],
  },
  {
    id: "monero",
    name: "Monero",
    symbol: "XMR",
    family: "monero",
    explorers: [
      { name: "xmrchain.net", baseUrl: "https://xmrchain.net", addressPath: "/search?value={query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "xrp",
    name: "XRP Ledger",
    symbol: "XRP",
    family: "xrp",
    explorers: [
      { name: "XRPScan", baseUrl: "https://xrpscan.com", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://s1.ripple.com:51234/", provider: "public" },
    ],
  },
  {
    id: "stellar",
    name: "Stellar",
    symbol: "XLM",
    family: "stellar",
    explorers: [
      { name: "StellarExpert", baseUrl: "https://stellar.expert/explorer/public", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://horizon.stellar.org", provider: "public" },
    ],
  },
  {
    id: "bittensor",
    name: "Bittensor",
    symbol: "TAO",
    family: "bittensor",
    explorers: [
      { name: "Taostats", baseUrl: "https://taostats.io", addressPath: "/account/{query}", txPath: "/extrinsic/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "cardano",
    name: "Cardano",
    symbol: "ADA",
    family: "cardano",
    explorers: [
      { name: "Cardanoscan", baseUrl: "https://cardanoscan.io", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.koios.rest/api/v1", provider: "public" },
    ],
  },
  {
    id: "lightning",
    name: "Lightning Network",
    symbol: "BTC",
    family: "lightning",
    explorers: [
      { name: "mempool.space", baseUrl: "https://mempool.space", addressPath: "/lightning/node/{query}", txPath: "" },
      { name: "Amboss", baseUrl: "https://amboss.space", addressPath: "/node/{query}", txPath: "" },
    ],
    rpcUrls: [
      { url: "https://mempool.space/api/v1/lightning", provider: "public" },
    ],
  },
  {
    id: "filecoin",
    name: "Filecoin",
    symbol: "FIL",
    family: "filecoin",
    explorers: [
      { name: "Filfox", baseUrl: "https://filfox.info", addressPath: "/en/address/{query}", txPath: "/en/message/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.node.glif.io/rpc/v1", provider: "public" },
    ],
  },
  {
    id: "hedera",
    name: "Hedera",
    symbol: "HBAR",
    family: "hedera",
    explorers: [
      { name: "HashScan", baseUrl: "https://hashscan.io", addressPath: "/mainnet/account/{query}", txPath: "/mainnet/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://mainnet.mirrornode.hedera.com", provider: "public" },
    ],
  },
  {
    id: "kaspa",
    name: "Kaspa",
    symbol: "KAS",
    family: "kaspa",
    explorers: [
      { name: "Kaspa Explorer", baseUrl: "https://explorer.kaspa.org", addressPath: "/addresses/{query}", txPath: "/txs/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.kaspa.org", provider: "public" },
    ],
  },
  {
    id: "algorand",
    name: "Algorand",
    symbol: "ALGO",
    family: "algorand",
    explorers: [
      { name: "Allo.info", baseUrl: "https://allo.info", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://mainnet-idx.algonode.cloud", provider: "public" },
    ],
  },
  {
    id: "multiversx",
    name: "MultiversX",
    symbol: "EGLD",
    family: "multiversx",
    explorers: [
      { name: "MultiversX Explorer", baseUrl: "https://explorer.multiversx.com", addressPath: "/accounts/{query}", txPath: "/transactions/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.multiversx.com", provider: "public" },
    ],
  },
  {
    id: "starknet",
    name: "Starknet",
    symbol: "STRK",
    family: "starknet",
    explorers: [
      { name: "Starkscan", baseUrl: "https://starkscan.co", addressPath: "/contract/{query}", txPath: "/tx/{query}" },
      { name: "Voyager", baseUrl: "https://voyager.online", addressPath: "/contract/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://free-rpc.nethermind.io/mainnet-juno/", provider: "public" },
    ],
  },
];
