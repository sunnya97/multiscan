/**
 * Fetches chain.json from Cosmos Chain Registry for all Mintscan-supported Cosmos chains.
 * Extracts bech32 prefix, explorer URLs (tx_page, account_page), and REST/RPC endpoints.
 * Outputs updated chain config blocks to stdout for pasting into chains.ts.
 *
 * Usage: npx tsx scripts/update-cosmos-chains.ts
 */

const COSMOS_CHAINS: {
  registryName: string;
  chainId: string;
  displayName: string;
  symbol: string;
  mintscanSlug?: string; // defaults to chainId if not set
}[] = [
  { registryName: "cosmoshub", chainId: "cosmos", displayName: "Cosmos Hub", symbol: "ATOM" },
  { registryName: "osmosis", chainId: "osmosis", displayName: "Osmosis", symbol: "OSMO" },
  { registryName: "celestia", chainId: "celestia", displayName: "Celestia", symbol: "TIA" },
  { registryName: "dydx", chainId: "dydx", displayName: "dYdX", symbol: "DYDX" },
  { registryName: "injective", chainId: "injective", displayName: "Injective", symbol: "INJ" },
  { registryName: "sei", chainId: "sei", displayName: "Sei", symbol: "SEI" },
  { registryName: "stride", chainId: "stride", displayName: "Stride", symbol: "STRD" },
  { registryName: "stargaze", chainId: "stargaze", displayName: "Stargaze", symbol: "STARS" },
  { registryName: "akash", chainId: "akash", displayName: "Akash", symbol: "AKT" },
  { registryName: "axelar", chainId: "axelar", displayName: "Axelar", symbol: "AXL" },
  { registryName: "kava", chainId: "kava", displayName: "Kava", symbol: "KAVA" },
  { registryName: "juno", chainId: "juno", displayName: "Juno", symbol: "JUNO" },
  { registryName: "evmos", chainId: "evmos", displayName: "Evmos", symbol: "EVMOS" },
  { registryName: "secretnetwork", chainId: "secret", displayName: "Secret Network", symbol: "SCRT", mintscanSlug: "secret" },
  { registryName: "bandchain", chainId: "band", displayName: "Band Protocol", symbol: "BAND", mintscanSlug: "band" },
  { registryName: "persistence", chainId: "persistence", displayName: "Persistence", symbol: "XPRT" },
  { registryName: "fetchhub", chainId: "fetchai", displayName: "Fetch.ai", symbol: "FET", mintscanSlug: "fetchai" },
  { registryName: "regen", chainId: "regen", displayName: "Regen", symbol: "REGEN" },
  { registryName: "sentinel", chainId: "sentinel", displayName: "Sentinel", symbol: "DVPN" },
  { registryName: "sommelier", chainId: "sommelier", displayName: "Sommelier", symbol: "SOMM" },
  { registryName: "chihuahua", chainId: "chihuahua", displayName: "Chihuahua", symbol: "HUAHUA" },
  { registryName: "archway", chainId: "archway", displayName: "Archway", symbol: "ARCH" },
  { registryName: "noble", chainId: "noble", displayName: "Noble", symbol: "USDC" },
  { registryName: "neutron", chainId: "neutron", displayName: "Neutron", symbol: "NTRN" },
  { registryName: "coreum", chainId: "coreum", displayName: "Coreum", symbol: "CORE" },
  { registryName: "kyve", chainId: "kyve", displayName: "KYVE", symbol: "KYVE" },
  { registryName: "agoric", chainId: "agoric", displayName: "Agoric", symbol: "BLD" },
  { registryName: "omniflixhub", chainId: "omniflix", displayName: "OmniFlix", symbol: "FLIX", mintscanSlug: "omniflix" },
  { registryName: "terra2", chainId: "terra", displayName: "Terra", symbol: "LUNA" },
  { registryName: "gravitybridge", chainId: "gravity-bridge", displayName: "Gravity Bridge", symbol: "GRAV", mintscanSlug: "gravity-bridge" },
  { registryName: "irisnet", chainId: "iris", displayName: "IRISnet", symbol: "IRIS", mintscanSlug: "iris" },
  { registryName: "cryptoorgchain", chainId: "crypto-org", displayName: "Cronos POS", symbol: "CRO", mintscanSlug: "crypto-org" },
  { registryName: "dymension", chainId: "dymension", displayName: "Dymension", symbol: "DYM" },
  { registryName: "mantrachain", chainId: "mantra", displayName: "MANTRA", symbol: "OM" },
  { registryName: "babylon", chainId: "babylon", displayName: "Babylon", symbol: "BBN" },
  { registryName: "nolus", chainId: "nolus", displayName: "Nolus", symbol: "NLS" },
  { registryName: "pryzm", chainId: "pryzm", displayName: "Pryzm", symbol: "PRYZM" },
];

interface RegistryExplorer {
  kind?: string;
  url?: string;
  tx_page?: string;
  account_page?: string;
}

interface RegistryApi {
  address?: string;
  provider?: string;
}

interface RegistryChain {
  chain_name?: string;
  bech32_prefix?: string;
  apis?: {
    rest?: RegistryApi[];
    rpc?: RegistryApi[];
  };
  explorers?: RegistryExplorer[];
}

async function fetchChainJson(registryName: string): Promise<RegistryChain> {
  const url = `https://raw.githubusercontent.com/cosmos/chain-registry/master/${registryName}/chain.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as RegistryChain;
}

function parseExplorerPath(template: string | undefined, baseUrl: string): string | null {
  if (!template || !baseUrl) return null;
  if (!template.startsWith(baseUrl)) return null;
  const path = template.slice(baseUrl.length);
  return path.replace(/\$\{txHash\}/g, "{query}").replace(/\$\{accountAddress\}/g, "{query}");
}

async function main() {
  console.log("// Auto-generated from Cosmos Chain Registry");
  console.log("// Run: npx tsx scripts/update-cosmos-chains.ts\n");

  for (const chain of COSMOS_CHAINS) {
    try {
      const data = await fetchChainJson(chain.registryName);
      const bech32Prefix = data.bech32_prefix ?? "";
      const mintscanSlug = chain.mintscanSlug ?? chain.chainId;

      // Extract explorers from registry (non-Mintscan ones)
      const registryExplorers = (data.explorers ?? [])
        .filter((e) => e.url && (e.tx_page || e.account_page))
        .filter((e) => !e.url?.includes("mintscan"))
        .slice(0, 2)
        .map((e) => {
          const baseUrl = e.url!.replace(/\/$/, "");
          const txPath = parseExplorerPath(e.tx_page, baseUrl) ?? "/tx/{query}";
          const addressPath = parseExplorerPath(e.account_page, baseUrl) ?? "/address/{query}";
          return { name: e.kind ?? "Explorer", baseUrl, addressPath, txPath };
        });

      // Always include Mintscan as first explorer
      const explorers = [
        {
          name: "Mintscan",
          baseUrl: `https://www.mintscan.io/${mintscanSlug}`,
          addressPath: "/address/{query}",
          txPath: "/tx/{query}",
          denomPath: "/assets/{query}",
        },
        ...registryExplorers,
      ];

      // Extract REST endpoints
      const restEndpoints = (data.apis?.rest ?? [])
        .filter((api) => api.address && !api.address.includes("localhost"))
        .slice(0, 2)
        .map((api) => ({
          url: api.address!.replace(/\/$/, ""),
          provider: "public" as const,
        }));

      console.log(`  {`);
      console.log(`    id: "${chain.chainId}",`);
      console.log(`    name: "${chain.displayName}",`);
      console.log(`    symbol: "${chain.symbol}",`);
      console.log(`    family: "cosmos",`);
      console.log(`    bech32Prefix: "${bech32Prefix}",`);
      console.log(`    explorers: ${JSON.stringify(explorers, null, 6).replace(/\n/g, "\n    ")},`);
      console.log(`    rpcUrls: ${JSON.stringify(restEndpoints, null, 6).replace(/\n/g, "\n    ")},`);
      console.log(`  },`);
    } catch (err) {
      console.error(`  // ERROR fetching ${chain.registryName}:`, err);
    }
  }
}

main();
