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
  | "near";

export type InputType = "address" | "transaction";

export interface Explorer {
  name: string;
  baseUrl: string;
  addressPath: string;
  txPath: string;
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
      { name: "Etherscan", baseUrl: "https://etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://eth.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 1,
    alchemyNetwork: "eth-mainnet",
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
      { name: "Basescan", baseUrl: "https://basescan.org", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://base.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 8453,
    alchemyNetwork: "base-mainnet",
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
      { name: "Arbiscan", baseUrl: "https://arbiscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://arbitrum.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 42161,
    alchemyNetwork: "arb-mainnet",
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
      { name: "Optimistic Etherscan", baseUrl: "https://optimistic.etherscan.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://optimism.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 10,
    alchemyNetwork: "opt-mainnet",
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
      { name: "Polygonscan", baseUrl: "https://polygonscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://polygon.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 137,
    alchemyNetwork: "polygon-mainnet",
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
      { name: "BscScan", baseUrl: "https://bscscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://bsc.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 56,
    alchemyNetwork: "bnb-mainnet",
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
      { name: "Snowscan", baseUrl: "https://snowscan.xyz", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://avalanche.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 43114,
    alchemyNetwork: "avax-mainnet",
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
      { name: "FtmScan", baseUrl: "https://ftmscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
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
      { name: "zkSync Explorer", baseUrl: "https://explorer.zksync.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://zksync.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    alchemyNetwork: "zksync-mainnet",
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
      { name: "Lineascan", baseUrl: "https://lineascan.build", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://linea.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 59144,
    alchemyNetwork: "linea-mainnet",
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
      { name: "Scrollscan", baseUrl: "https://scrollscan.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://scroll.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 534352,
    alchemyNetwork: "scroll-mainnet",
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
      { name: "Mantlescan", baseUrl: "https://mantlescan.xyz", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Blockscout", baseUrl: "https://mantle.blockscout.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    etherscanChainId: 5000,
    alchemyNetwork: "mantle-mainnet",
    rpcUrls: [
      { url: "https://mantle-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://mantle-rpc.publicnode.com", provider: "public" },
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
      { name: "Solscan", baseUrl: "https://solscan.io", addressPath: "/account/{query}", txPath: "/tx/{query}" },
      { name: "Solana Explorer", baseUrl: "https://explorer.solana.com", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "SolanaFM", baseUrl: "https://solana.fm", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://mainnet.helius-rpc.com/?api-key={key}", provider: "helius", keyEnvVar: "HELIUS_API_KEY" },
      { url: "https://solana-mainnet.g.alchemy.com/v2/{key}", provider: "alchemy", keyEnvVar: "ALCHEMY_API_KEY" },
      { url: "https://api.mainnet-beta.solana.com", provider: "public" },
    ],
  },
  {
    id: "cosmos",
    name: "Cosmos Hub",
    symbol: "ATOM",
    family: "cosmos",
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/cosmos", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Ping.pub", baseUrl: "https://ping.pub/cosmos", addressPath: "/account/{query}", txPath: "/tx/{query}" },
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
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/osmosis", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Ping.pub", baseUrl: "https://ping.pub/osmosis", addressPath: "/account/{query}", txPath: "/tx/{query}" },
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
    explorers: [
      { name: "Mintscan", baseUrl: "https://www.mintscan.io/celestia", addressPath: "/address/{query}", txPath: "/tx/{query}" },
      { name: "Celenium", baseUrl: "https://celenium.io", addressPath: "/address/{query}", txPath: "/tx/{query}" },
    ],
    rpcUrls: [
      { url: "https://celestia-rest.publicnode.com", provider: "public" },
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
];
