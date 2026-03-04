import { useMemo } from "react";
import { LookupResult } from "../types";
import ResultCard from "./ResultCard";

interface ResultsListProps {
  results: LookupResult[];
  coinGeckoUrl?: string | null;
  isVerifying: boolean;
  resolvedName?: string | null;
  resolvedAddress?: string | null;
  nameNotFound?: boolean;
  hasInput: boolean;
  isLoading: boolean;
  selectedIndex: number;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function ResultsList({
  results,
  coinGeckoUrl,
  isVerifying,
  resolvedName,
  resolvedAddress,
  nameNotFound,
  hasInput,
  isLoading,
  selectedIndex,
}: ResultsListProps) {
  const inputType = results[0]?.inputType;
  const isAddress = inputType === "address";

  const foundResults = results.filter((r) => r.status === "found");
  const unverifiedResults = results.filter((r) => r.status === "unverified");

  const addressFallback =
    isAddress &&
    results.length > 1 &&
    foundResults.length === 0 &&
    unverifiedResults.length === results.length;

  const sections = useMemo(() => {
    if (addressFallback) {
      return { allMatching: results, verified: [], unverified: [] };
    }
    return { allMatching: [], verified: foundResults, unverified: unverifiedResults };
  }, [addressFallback, results, foundResults, unverifiedResults]);

  if (isVerifying && hasInput) {
    return (
      <div className="results-empty">
        <div className="results-empty__scanner">
          <div className="scan-ring" />
          <div className="scan-ring scan-ring--delayed" />
        </div>
        <p className="results-empty__title">Scanning networks...</p>
        <p className="results-empty__sub">Verifying activity across matching chains</p>
      </div>
    );
  }

  if (nameNotFound && !isLoading) {
    return (
      <div className="results-empty">
        <p className="results-empty__title">Name not found</p>
        <p className="results-empty__sub">Could not resolve to an address</p>
      </div>
    );
  }

  if (results.length === 0 && hasInput && !isLoading) {
    return (
      <div className="results-empty">
        <p className="results-empty__title">No chains detected</p>
        <p className="results-empty__sub">Try a valid crypto address or transaction hash</p>
      </div>
    );
  }

  if (!hasInput) {
    return (
      <div className="results-empty results-empty--idle">
        <p className="results-empty__title">Ready to scan</p>
        <p className="results-empty__sub">
          Paste any crypto address, transaction hash, or name
        </p>

        <a
          href="https://www.raycast.com/sunnya97/multiscan"
          target="_blank"
          rel="noopener noreferrer"
          className="raycast-cta"
        >
          <svg className="raycast-cta__icon" width="20" height="20" viewBox="0 0 512 512" fill="none">
            <path d="M427.2 0H84.8C38 0 0 38 0 84.8v342.4C0 474 38 512 84.8 512h342.4c46.8 0 84.8-38 84.8-84.8V84.8C512 38 474 0 427.2 0z" fill="#FF6363"/>
            <path d="M256.7 152.4l-78.8 78.8 25.5 25.5 78.8-78.8-25.5-25.5zm-104.3 104.3l-25.5-25.5-40.5 40.5v51l15.5-15.5 50.5-50.5zm207.2-207.2h-51l40.5 40.5-25.5 25.5 25.5 25.5 50.5-50.5-15.5-15.5-24.5-25.5zm-78.8 78.8l-25.5-25.5-78.8 78.8 25.5 25.5 78.8-78.8zm-129.3 129.3l-25.5 25.5 25.5 25.5 25.5-25.5-25.5-25.5zm207.6-103.8l-25.5-25.5-78.8 78.8 25.5 25.5 78.8-78.8zM152.4 332.1l-25.5 25.5 66 66h51l-91.5-91.5zm207.2-75.3l-25.5 25.5 50.5 50.5 15.5 15.5v-51l-40.5-40.5zM256.7 281.3l-25.5 25.5 91.5 91.5h51l-117-117z" fill="white"/>
          </svg>
          Install Raycast Extension
          <svg className="raycast-cta__arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6H10M10 6L6.5 2.5M10 6L6.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

        <div className="integrations">
          <p className="integrations__header">Supported Networks</p>
          <div className="integrations__group">
            <span className="integrations__label">EVM</span>
            <div className="integrations__tags">
              {["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BSC", "Avalanche", "Fantom", "zkSync", "Linea", "Scroll", "Mantle", "Ethereum Classic", "HyperEVM", "HyperCore"].map((c) => (
                <span key={c} className="integrations__tag">{c}</span>
              ))}
            </div>
          </div>
          <div className="integrations__group">
            <span className="integrations__label">L1</span>
            <div className="integrations__tags">
              {["Bitcoin", "Solana", "Tron", "TON", "Polkadot", "NEAR"].map((c) => (
                <span key={c} className="integrations__tag">{c}</span>
              ))}
            </div>
          </div>
          <div className="integrations__group">
            <span className="integrations__label">Cosmos</span>
            <div className="integrations__tags">
              {["Cosmos Hub", "Osmosis", "Celestia", "dYdX", "Injective", "Sei", "Stride", "Stargaze", "Akash", "Axelar", "Kava", "Juno", "Evmos", "Secret", "Band", "Persistence", "Fetch.ai", "Regen", "Sentinel", "Sommelier", "Chihuahua", "Archway", "Noble", "Neutron", "Coreum", "KYVE", "Agoric", "OmniFlix", "Terra", "Gravity Bridge", "IRISnet", "Cronos POS", "Dymension", "MANTRA", "Babylon", "Nolus", "Pryzm"].map((c) => (
                <span key={c} className="integrations__tag">{c}</span>
              ))}
            </div>
          </div>
          <div className="integrations__group">
            <span className="integrations__label">Move</span>
            <div className="integrations__tags">
              {["Sui", "Aptos"].map((c) => (
                <span key={c} className="integrations__tag">{c}</span>
              ))}
            </div>
          </div>
          <div className="integrations__group">
            <span className="integrations__label">Names</span>
            <div className="integrations__tags">
              {[".eth", ".sol", ".bnb", ".osmo", ".cosmos"].map((c) => (
                <span key={c} className="integrations__tag integrations__tag--name">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  let cardIndex = 0;

  return (
    <div className="results">
      {resolvedName && resolvedAddress && (
        <div className="resolution-banner">
          <span className="resolution-banner__name">{resolvedName}</span>
          <span className="resolution-banner__arrow">&rarr;</span>
          <span className="resolution-banner__address">
            {truncateAddress(resolvedAddress)}
          </span>
        </div>
      )}

      {sections.allMatching.length > 0 && (
        <div className="results-section">
          <div className="results-section__header">
            <span className="results-section__label">No activity found &mdash; potential matches</span>
            <span className="results-section__count">{sections.allMatching.length}</span>
          </div>
          {sections.allMatching.map((r) => {
            const idx = cardIndex++;
            return (
              <ResultCard
                key={`${r.chainId}-${r.inputType}`}
                result={r}
                coinGeckoUrl={coinGeckoUrl}
                index={idx}
                isSelected={idx === selectedIndex}
              />
            );
          })}
        </div>
      )}

      {sections.verified.length > 0 && (
        <div className="results-section">
          <div className="results-section__header">
            <span className="results-section__label">Verified</span>
            <span className="results-section__count">{sections.verified.length}</span>
          </div>
          {sections.verified.map((r) => {
            const idx = cardIndex++;
            return (
              <ResultCard
                key={`${r.chainId}-${r.inputType}`}
                result={r}
                coinGeckoUrl={coinGeckoUrl}
                index={idx}
                isSelected={idx === selectedIndex}
              />
            );
          })}
        </div>
      )}

      {sections.unverified.length > 0 && (
        <div className="results-section">
          <div className="results-section__header">
            <span className="results-section__label">
              {sections.verified.length > 0 ? "Other Chains" : "Detected Chains"}
            </span>
            <span className="results-section__count">{sections.unverified.length}</span>
          </div>
          {sections.unverified.map((r) => {
            const idx = cardIndex++;
            return (
              <ResultCard
                key={`${r.chainId}-${r.inputType}`}
                result={r}
                coinGeckoUrl={coinGeckoUrl}
                index={idx}
                isSelected={idx === selectedIndex}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
