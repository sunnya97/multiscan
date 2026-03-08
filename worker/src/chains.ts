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
  | "starknet"
  | "dash"
  | "urbit"
  | "tezos"
  | "aleo"
  | "nano"
  | "chia"
  | "bitcoin-testnet";

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
  isTestnet?: boolean;
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

  {
    id: "berachain",
    name: "Berachain",
    symbol: "BERA",
    family: "evm",
    explorers: [
      { name: "Berascan", baseUrl: "https://berascan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.berachain.com", provider: "public" },
    ],
  },
  {
    id: "ronin",
    name: "Ronin",
    symbol: "RON",
    family: "evm",
    explorers: [
      { name: "Ronin Explorer", baseUrl: "https://app.roninchain.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.roninchain.com/rpc", provider: "public" },
    ],
  },
  {
    id: "flare",
    name: "Flare",
    symbol: "FLR",
    family: "evm",
    explorers: [
      { name: "Flarescan", baseUrl: "https://mainnet.flarescan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.ankr.com/flare", provider: "public" },
    ],
  },
  {
    id: "oasis-sapphire",
    name: "Oasis Sapphire",
    symbol: "ROSE",
    family: "evm",
    explorers: [
      { name: "Oasis Explorer", baseUrl: "https://explorer.oasis.io/mainnet/sapphire", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://sapphire.oasis.io", provider: "public" },
    ],
  },
  {
    id: "core",
    name: "Core",
    symbol: "CORE",
    family: "evm",
    explorers: [
      { name: "Core Scan", baseUrl: "https://scan.coredao.org", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.coredao.org", provider: "public" },
    ],
  },
  {
    id: "monad",
    name: "Monad",
    symbol: "MON",
    family: "evm",
    explorers: [
      { name: "MonadScan", baseUrl: "https://monadscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.monad.xyz", provider: "public" },
    ],
  },
  {
    id: "megaeth",
    name: "MegaETH",
    symbol: "ETH",
    family: "evm",
    explorers: [
      { name: "MegaETH Explorer", baseUrl: "https://megaeth.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.megaeth.com", provider: "public" },
    ],
  },
  {
    id: "plasma",
    name: "Plasma",
    symbol: "PLASMA",
    family: "evm",
    explorers: [
      { name: "Plasma Scan", baseUrl: "https://plasmascan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.plasma.to", provider: "public" },
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

  {
    id: "dash",
    name: "Dash",
    symbol: "DASH",
    family: "dash",
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/dash/mainnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  {
    id: "urbit",
    name: "Urbit",
    symbol: "URBIT",
    family: "urbit",
    explorers: [
      { name: "Network Explorer", baseUrl: "https://network.urbit.org", addressPath: "/{query}", txPath: "" },
      { name: "Urbit Live", baseUrl: "https://urbit.live", addressPath: "/{query}", txPath: "" },
    ],
    rpcUrls: [],
  },

  {
    id: "tezos",
    name: "Tezos",
    symbol: "XTZ",
    family: "tezos",
    explorers: [
      { name: "TzKT", baseUrl: "https://tzkt.io", addressPath: "/{query}", txPath: "/{query}" },
      { name: "TzStats", baseUrl: "https://tzstats.com", addressPath: "/{query}", txPath: "/{query}" },
    ],
    rpcUrls: [
      { url: "https://mainnet.api.tez.ie", provider: "public" },
    ],
  },
  {
    id: "aleo",
    name: "Aleo",
    symbol: "ALEO",
    family: "aleo",
    explorers: [
      { name: "Aleo Explorer", baseUrl: "https://explorer.aleo.org", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
      { name: "AleoScan", baseUrl: "https://aleoscan.io", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "nano",
    name: "Nano",
    symbol: "XNO",
    family: "nano",
    explorers: [
      { name: "NanoCrawler", baseUrl: "https://nanocrawler.cc", addressPath: "/explorer/account/{query}", txPath: "/explorer/block/{query}" },
      { name: "Nanexplorer", baseUrl: "https://nanexplorer.com", addressPath: "/accounts/{query}", txPath: "/blocks/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "chia",
    name: "Chia",
    symbol: "XCH",
    family: "chia",
    explorers: [
      { name: "XCHscan", baseUrl: "https://xchscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Spacescan", baseUrl: "https://www.spacescan.io", addressPath: "/address/{query}", txPath: "/coin/{query}" },
    ],
    rpcUrls: [],
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
    id: "thorchain",
    name: "THORChain",
    symbol: "RUNE",
    family: "cosmos",
    bech32Prefix: "thor",
    explorers: [
      { name: "RuneScan", baseUrl: "https://runescan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "ViewBlock", baseUrl: "https://viewblock.io/thorchain", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://thornode.ninerealms.com", provider: "public" },
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
    id: "movement",
    name: "Movement",
    symbol: "MOVE",
    family: "aptos",
    explorers: [
      { name: "Movement Explorer", baseUrl: "https://explorer.movementnetwork.xyz", addressPath: "/account/{query}?network=mainnet", txPath: "/txn/{query}?network=mainnet" },
    ],
    rpcUrls: [
      { url: "https://mainnet.movementnetwork.xyz/v1", provider: "public" },
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

  // --- EVM Testnets ---
  {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Etherscan Sepolia", baseUrl: "https://sepolia.etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 11155111,
    rpcUrls: [
      { url: "https://ethereum-sepolia-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "ethereum-holesky",
    name: "Ethereum Holesky",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Etherscan Holesky", baseUrl: "https://holesky.etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 17000,
    rpcUrls: [
      { url: "https://ethereum-holesky-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "base-sepolia",
    name: "Base Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Basescan Sepolia", baseUrl: "https://sepolia.basescan.org", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 84532,
    rpcUrls: [
      { url: "https://base-sepolia-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Arbiscan Sepolia", baseUrl: "https://sepolia.arbiscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 421614,
    rpcUrls: [
      { url: "https://arbitrum-sepolia-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "optimism-sepolia",
    name: "Optimism Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Etherscan Optimism Sepolia", baseUrl: "https://sepolia-optimism.etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 11155420,
    rpcUrls: [
      { url: "https://optimism-sepolia-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "polygon-amoy",
    name: "Polygon Amoy",
    symbol: "POL",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Polygonscan Amoy", baseUrl: "https://amoy.polygonscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 80002,
    rpcUrls: [
      { url: "https://polygon-amoy-bor-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "bsc-testnet",
    name: "BSC Testnet",
    symbol: "BNB",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "BscScan Testnet", baseUrl: "https://testnet.bscscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 97,
    rpcUrls: [
      { url: "https://bsc-testnet-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "avalanche-fuji",
    name: "Avalanche Fuji",
    symbol: "AVAX",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Snowscan Fuji", baseUrl: "https://testnet.snowscan.xyz", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    etherscanChainId: 43113,
    rpcUrls: [
      { url: "https://avalanche-fuji-c-chain-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "fantom-testnet",
    name: "Fantom Testnet",
    symbol: "FTM",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "FtmScan Testnet", baseUrl: "https://testnet.ftmscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.testnet.fantom.network", provider: "public" },
    ],
  },
  {
    id: "zksync-sepolia",
    name: "zkSync Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "zkSync Explorer Sepolia", baseUrl: "https://sepolia.explorer.zksync.io", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://sepolia.era.zksync.dev", provider: "public" },
    ],
  },
  {
    id: "linea-sepolia",
    name: "Linea Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Lineascan Sepolia", baseUrl: "https://sepolia.lineascan.build", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://linea-sepolia-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "scroll-sepolia",
    name: "Scroll Sepolia",
    symbol: "ETH",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Scrollscan Sepolia", baseUrl: "https://sepolia.scrollscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://scroll-sepolia-rpc.publicnode.com", provider: "public" },
    ],
  },
  {
    id: "mantle-sepolia",
    name: "Mantle Sepolia",
    symbol: "MNT",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Mantlescan Sepolia", baseUrl: "https://sepolia.mantlescan.xyz", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.sepolia.mantle.xyz", provider: "public" },
    ],
  },

  // --- New EVM Testnets ---
  {
    id: "berachain-testnet",
    name: "Berachain Testnet",
    symbol: "BERA",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Berascan Testnet", baseUrl: "https://testnet.berascan.com", addressPath: "/address/{query}", txPath: "/tx/{query}", tokenPath: "/token/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "ronin-testnet",
    name: "Ronin Saigon",
    symbol: "RON",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Ronin Saigon Explorer", baseUrl: "https://saigon-app.roninchain.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "flare-testnet",
    name: "Flare Coston2",
    symbol: "FLR",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Flarescan Coston2", baseUrl: "https://coston2.testnet.flarescan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.ankr.com/flare_coston2", provider: "public" },
    ],
  },
  {
    id: "oasis-testnet",
    name: "Oasis Sapphire Testnet",
    symbol: "ROSE",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Oasis Explorer Testnet", baseUrl: "https://explorer.oasis.io/testnet/sapphire", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "core-testnet",
    name: "Core Testnet",
    symbol: "CORE",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Core Scan Testnet", baseUrl: "https://scan.test2.btcs.network", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "monad-testnet",
    name: "Monad Testnet",
    symbol: "MON",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "MonadScan Testnet", baseUrl: "https://testnet.monadscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Ethereum Classic Testnet ---
  {
    id: "ethereum-classic-mordor",
    name: "Ethereum Classic Mordor",
    symbol: "ETC",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/ethereum-classic/mordor", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- HyperEVM / HyperCore Testnets ---
  {
    id: "hyperliquid-evm-testnet",
    name: "HyperEVM Testnet",
    symbol: "HYPE",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Hypurrscan Testnet", baseUrl: "https://testnet.hypurrscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.hyperliquid-testnet.xyz/evm", provider: "public" },
    ],
  },
  {
    id: "hyperliquid-core-testnet",
    name: "HyperCore Testnet",
    symbol: "HYPE",
    family: "evm",
    isTestnet: true,
    explorers: [
      { name: "Hypurrscan Testnet", baseUrl: "https://testnet.hypurrscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Bitcoin Testnet ---
  {
    id: "bitcoin-testnet",
    name: "Bitcoin Testnet",
    symbol: "BTC",
    family: "bitcoin-testnet",
    isTestnet: true,
    explorers: [
      { name: "mempool.space Testnet", baseUrl: "https://mempool.space/testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://mempool.space/testnet/api", provider: "public" },
    ],
  },

  // --- Solana Testnets ---
  {
    id: "solana-testnet",
    name: "Solana Testnet",
    symbol: "SOL",
    family: "solana",
    isTestnet: true,
    explorers: [
      { name: "Solana Explorer Testnet", baseUrl: "https://explorer.solana.com", addressPath: "/address/{query}?cluster=testnet", txPath: "/tx/{query}?cluster=testnet" },
    ],
    rpcUrls: [
      { url: "https://api.testnet.solana.com", provider: "public" },
    ],
  },
  {
    id: "solana-devnet",
    name: "Solana Devnet",
    symbol: "SOL",
    family: "solana",
    isTestnet: true,
    explorers: [
      { name: "Solana Explorer Devnet", baseUrl: "https://explorer.solana.com", addressPath: "/address/{query}?cluster=devnet", txPath: "/tx/{query}?cluster=devnet" },
    ],
    rpcUrls: [
      { url: "https://api.devnet.solana.com", provider: "public" },
    ],
  },

  // --- Cardano Testnet ---
  {
    id: "cardano-preprod",
    name: "Cardano Preprod",
    symbol: "ADA",
    family: "cardano",
    isTestnet: true,
    explorers: [
      { name: "Cardanoscan Preprod", baseUrl: "https://preprod.cardanoscan.io", addressPath: "/address/{query}", txPath: "/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://preprod.koios.rest/api/v1", provider: "public" },
    ],
  },

  // --- Move Testnets ---
  {
    id: "sui-testnet",
    name: "Sui Testnet",
    symbol: "SUI",
    family: "sui",
    isTestnet: true,
    explorers: [
      { name: "SuiVision Testnet", baseUrl: "https://testnet.suivision.xyz", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://fullnode.testnet.sui.io", provider: "public" },
    ],
  },
  {
    id: "aptos-testnet",
    name: "Aptos Testnet",
    symbol: "APT",
    family: "aptos",
    isTestnet: true,
    explorers: [
      { name: "Aptos Explorer Testnet", baseUrl: "https://explorer.aptoslabs.com", addressPath: "/account/{query}?network=testnet", txPath: "/txn/{query}?network=testnet" },
    ],
    rpcUrls: [
      { url: "https://fullnode.testnet.aptoslabs.com/v1", provider: "public" },
    ],
  },

  // --- NEAR Testnet ---
  {
    id: "near-testnet",
    name: "NEAR Testnet",
    symbol: "NEAR",
    family: "near",
    isTestnet: true,
    explorers: [
      { name: "NearBlocks Testnet", baseUrl: "https://testnet.nearblocks.io", addressPath: "/address/{query}", txPath: "/txns/{query}" },
    ],
    rpcUrls: [
      { url: "https://rpc.testnet.near.org", provider: "public" },
    ],
  },

  // --- Tron Testnets ---
  {
    id: "tron-shasta",
    name: "Tron Shasta",
    symbol: "TRX",
    family: "tron",
    isTestnet: true,
    explorers: [
      { name: "Tronscan Shasta", baseUrl: "https://shasta.tronscan.org", addressPath: "/#/address/{query}", txPath: "/#/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.shasta.trongrid.io", provider: "public" },
    ],
  },
  {
    id: "tron-nile",
    name: "Tron Nile",
    symbol: "TRX",
    family: "tron",
    isTestnet: true,
    explorers: [
      { name: "Tronscan Nile", baseUrl: "https://nile.tronscan.org", addressPath: "/#/address/{query}", txPath: "/#/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://nile.trongrid.io", provider: "public" },
    ],
  },

  // --- TON Testnet ---
  {
    id: "ton-testnet",
    name: "TON Testnet",
    symbol: "TON",
    family: "ton",
    isTestnet: true,
    explorers: [
      { name: "TON Viewer Testnet", baseUrl: "https://testnet.tonviewer.com", addressPath: "/{query}", txPath: "/transaction/{query}" },
      { name: "Tonscan Testnet", baseUrl: "https://testnet.tonscan.org", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://testnet.toncenter.com/api/v2", provider: "public" },
    ],
  },

  // --- Starknet Testnet ---
  {
    id: "starknet-sepolia",
    name: "Starknet Sepolia",
    symbol: "STRK",
    family: "starknet",
    isTestnet: true,
    explorers: [
      { name: "Starkscan Sepolia", baseUrl: "https://sepolia.starkscan.co", addressPath: "/contract/{query}", txPath: "/tx/{query}" },
      { name: "Voyager Sepolia", baseUrl: "https://sepolia.voyager.online", addressPath: "/contract/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://free-rpc.nethermind.io/sepolia-juno/", provider: "public" },
    ],
  },

  // --- XRP Testnet ---
  {
    id: "xrp-testnet",
    name: "XRP Testnet",
    symbol: "XRP",
    family: "xrp",
    isTestnet: true,
    explorers: [
      { name: "XRPScan Testnet", baseUrl: "https://testnet.xrpscan.com", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://s.altnet.rippletest.net:51234/", provider: "public" },
    ],
  },

  // --- Stellar Testnet ---
  {
    id: "stellar-testnet",
    name: "Stellar Testnet",
    symbol: "XLM",
    family: "stellar",
    isTestnet: true,
    explorers: [
      { name: "StellarExpert Testnet", baseUrl: "https://stellar.expert/explorer/testnet", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://horizon-testnet.stellar.org", provider: "public" },
    ],
  },

  // --- Hedera Testnet ---
  {
    id: "hedera-testnet",
    name: "Hedera Testnet",
    symbol: "HBAR",
    family: "hedera",
    isTestnet: true,
    explorers: [
      { name: "HashScan Testnet", baseUrl: "https://hashscan.io", addressPath: "/testnet/account/{query}", txPath: "/testnet/transaction/{query}" },
    ],
    rpcUrls: [
      { url: "https://testnet.mirrornode.hedera.com", provider: "public" },
    ],
  },

  // --- Algorand Testnet ---
  {
    id: "algorand-testnet",
    name: "Algorand Testnet",
    symbol: "ALGO",
    family: "algorand",
    isTestnet: true,
    explorers: [
      { name: "Allo.info Testnet", baseUrl: "https://testnet.allo.info", addressPath: "/account/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://testnet-idx.algonode.cloud", provider: "public" },
    ],
  },

  // --- MultiversX Devnet ---
  {
    id: "multiversx-devnet",
    name: "MultiversX Devnet",
    symbol: "EGLD",
    family: "multiversx",
    isTestnet: true,
    explorers: [
      { name: "MultiversX Devnet Explorer", baseUrl: "https://devnet-explorer.multiversx.com", addressPath: "/accounts/{query}", txPath: "/transactions/{query}" },
    ],
    rpcUrls: [
      { url: "https://devnet-api.multiversx.com", provider: "public" },
    ],
  },

  // --- Polkadot Testnet ---
  {
    id: "polkadot-westend",
    name: "Polkadot Westend",
    symbol: "WND",
    family: "polkadot",
    isTestnet: true,
    explorers: [
      { name: "Subscan Westend", baseUrl: "https://westend.subscan.io", addressPath: "/account/{query}", txPath: "/extrinsic/{query}" },
    ],
    rpcUrls: [
      { url: "https://westend-rpc.polkadot.io", provider: "public" },
    ],
  },

  // --- Filecoin Testnet ---
  {
    id: "filecoin-calibration",
    name: "Filecoin Calibration",
    symbol: "FIL",
    family: "filecoin",
    isTestnet: true,
    explorers: [
      { name: "Filfox Calibration", baseUrl: "https://calibration.filfox.info", addressPath: "/en/address/{query}", txPath: "/en/message/{query}" },
    ],
    rpcUrls: [
      { url: "https://api.calibration.node.glif.io/rpc/v1", provider: "public" },
    ],
  },

  // --- Litecoin Testnet ---
  {
    id: "litecoin-testnet",
    name: "Litecoin Testnet",
    symbol: "LTC",
    family: "litecoin",
    isTestnet: true,
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/litecoin/testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Dogecoin Testnet ---
  {
    id: "dogecoin-testnet",
    name: "Dogecoin Testnet",
    symbol: "DOGE",
    family: "dogecoin",
    isTestnet: true,
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/dogecoin/testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Bitcoin Cash Testnet ---
  {
    id: "bitcoin-cash-testnet",
    name: "Bitcoin Cash Testnet",
    symbol: "BCH",
    family: "bitcoincash",
    isTestnet: true,
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/bitcoin-cash/testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- ZCash Testnet ---
  {
    id: "zcash-testnet",
    name: "ZCash Testnet",
    symbol: "ZEC",
    family: "zcash",
    isTestnet: true,
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/zcash/testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Dash Testnet ---
  {
    id: "dash-testnet",
    name: "Dash Testnet",
    symbol: "DASH",
    family: "dash",
    isTestnet: true,
    explorers: [
      { name: "BlockExplorer.one", baseUrl: "https://blockexplorer.one/dash/testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Lightning Testnet ---
  {
    id: "lightning-testnet",
    name: "Lightning Testnet",
    symbol: "BTC",
    family: "lightning",
    isTestnet: true,
    explorers: [
      { name: "mempool.space Testnet", baseUrl: "https://mempool.space/testnet/lightning", addressPath: "/node/{query}", txPath: "" },
    ],
    rpcUrls: [],
  },

  // --- Kaspa Testnet ---
  {
    id: "kaspa-testnet",
    name: "Kaspa Testnet",
    symbol: "KAS",
    family: "kaspa",
    isTestnet: true,
    explorers: [
      { name: "Kaspa Explorer Testnet", baseUrl: "https://explorer-tn11.kaspa.org", addressPath: "/addresses/{query}", txPath: "/txs/{query}" },
    ],
    rpcUrls: [],
  },

  // --- Cosmos Testnets ---
  {
    id: "osmosis-testnet",
    name: "Osmosis Testnet",
    symbol: "OSMO",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/osmosis-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "celestia-testnet",
    name: "Celestia Testnet",
    symbol: "TIA",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/celestia-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "dydx-testnet",
    name: "dYdX Testnet",
    symbol: "DYDX",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/dydx-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "injective-testnet",
    name: "Injective Testnet",
    symbol: "INJ",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/injective-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "axelar-testnet",
    name: "Axelar Testnet",
    symbol: "AXL",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/axelar-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "kava-testnet",
    name: "Kava Testnet",
    symbol: "KAVA",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/kava-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "persistence-testnet",
    name: "Persistence Testnet",
    symbol: "XPRT",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/persistence-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "archway-testnet",
    name: "Archway Testnet",
    symbol: "ARCH",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/archway-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "noble-testnet",
    name: "Noble Testnet",
    symbol: "USDC",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/noble-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "neutron-testnet",
    name: "Neutron Testnet",
    symbol: "NTRN",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/neutron-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "coreum-testnet",
    name: "Coreum Testnet",
    symbol: "CORE",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/coreum-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "mantra-testnet",
    name: "MANTRA Testnet",
    symbol: "OM",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/mantra-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
  {
    id: "babylon-testnet",
    name: "Babylon Testnet",
    symbol: "BBN",
    family: "cosmos",
    isTestnet: true,
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/babylon-testnet", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [],
  },
];
