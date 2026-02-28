/**
 * Fetches chain.json from Cosmos Chain Registry for cosmoshub, osmosis, celestia.
 * Extracts explorer URLs (tx_page, account_page) and REST/RPC endpoints.
 * Outputs updated chain config blocks to stdout.
 *
 * Usage: npx tsx scripts/update-cosmos-chains.ts
 */

const COSMOS_CHAINS = [
  { registryName: "cosmoshub", chainId: "cosmos", displayName: "Cosmos Hub", symbol: "ATOM" },
  { registryName: "osmosis", chainId: "osmosis", displayName: "Osmosis", symbol: "OSMO" },
  { registryName: "celestia", chainId: "celestia", displayName: "Celestia", symbol: "TIA" },
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
  // Template looks like "https://www.mintscan.io/cosmos/tx/${txHash}"
  // We want the path portion after baseUrl, with the placeholder normalized
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

      // Extract explorers
      const explorers = (data.explorers ?? [])
        .filter((e) => e.url && (e.tx_page || e.account_page))
        .slice(0, 3)
        .map((e) => {
          const baseUrl = e.url!.replace(/\/$/, "");
          const txPath = parseExplorerPath(e.tx_page, baseUrl) ?? "/tx/{query}";
          const addressPath = parseExplorerPath(e.account_page, baseUrl) ?? "/address/{query}";
          return {
            name: e.kind ?? "Explorer",
            baseUrl,
            addressPath,
            txPath,
          };
        });

      // Extract REST endpoints
      const restEndpoints = (data.apis?.rest ?? [])
        .filter((api) => api.address)
        .slice(0, 3)
        .map((api) => ({
          url: api.address!.replace(/\/$/, ""),
          provider: "public" as const,
        }));

      console.log(`// ${chain.displayName} (${chain.registryName})`);
      console.log(`{`);
      console.log(`  id: "${chain.chainId}",`);
      console.log(`  name: "${chain.displayName}",`);
      console.log(`  symbol: "${chain.symbol}",`);
      console.log(`  family: "cosmos",`);
      console.log(`  explorers: ${JSON.stringify(explorers, null, 4).replace(/\n/g, "\n  ")},`);
      console.log(`  rpcUrls: ${JSON.stringify(restEndpoints, null, 4).replace(/\n/g, "\n  ")},`);
      console.log(`},\n`);
    } catch (err) {
      console.error(`// ERROR fetching ${chain.registryName}:`, err);
    }
  }
}

main();
