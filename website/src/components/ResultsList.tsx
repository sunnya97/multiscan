import { useMemo, useState, useRef, useEffect } from "react";
import { LookupResult } from "../types";
import { CHAIN_LOGO } from "../chainLogos";
import ResultCard from "./ResultCard";

type CloudItem =
  | { type: "chain"; name: string }
  | { type: "group"; id: string; label: string; preview: string[]; chains: string[] }
  | { type: "name"; name: string };

const CLOUD_ITEMS: CloudItem[] = [
  { type: "chain", name: "Bitcoin" },
  { type: "group", id: "evm", label: "EVM", preview: ["Ethereum", "Base", "Arbitrum", "Optimism"], chains: ["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "BSC", "Avalanche", "Fantom", "zkSync", "Linea", "Scroll", "Mantle", "Ethereum Classic", "HyperEVM"] },
  { type: "chain", name: "Solana" },
  { type: "group", id: "cosmos", label: "Cosmos", preview: ["Cosmos Hub", "Osmosis", "Celestia", "dYdX"], chains: ["Cosmos Hub", "Osmosis", "Celestia", "dYdX", "Injective", "Sei", "Stride", "Stargaze", "Akash", "Axelar", "Kava", "Juno", "Evmos", "Secret", "Band", "Persistence", "Fetch.ai", "Regen", "Sentinel", "Sommelier", "Chihuahua", "Archway", "Noble", "Neutron", "Coreum", "KYVE", "Agoric", "OmniFlix", "Terra", "Gravity Bridge", "IRISnet", "Cronos POS", "Dymension", "MANTRA", "Babylon", "Nolus", "Pryzm"] },
  { type: "chain", name: "Sui" },
  { type: "chain", name: "Aptos" },
  { type: "chain", name: "Cardano" },
  { type: "chain", name: "Polkadot" },
  { type: "chain", name: "TON" },
  { type: "chain", name: "XRP Ledger" },
  { type: "chain", name: "Tron" },
  { type: "chain", name: "NEAR" },
  { type: "chain", name: "Dogecoin" },
  { type: "chain", name: "Stellar" },
  { type: "chain", name: "Filecoin" },
  { type: "chain", name: "Monero" },
  { type: "chain", name: "Litecoin" },
  { type: "chain", name: "Hedera" },
  { type: "chain", name: "Algorand" },
  { type: "chain", name: "Starknet" },
  { type: "chain", name: "MultiversX" },
  { type: "chain", name: "Kaspa" },
  { type: "chain", name: "Lightning Network" },
  { type: "chain", name: "Bitcoin Cash" },
  { type: "chain", name: "ZCash" },
  { type: "chain", name: "Bittensor" },
  { type: "chain", name: "HyperCore" },
  { type: "chain", name: "Dash" },
  { type: "name", name: ".eth" },
  { type: "name", name: ".sol" },
  { type: "name", name: ".bnb" },
  { type: "name", name: ".osmo" },
  { type: "name", name: ".cosmos" },
  { type: "name", name: ".ton" },
  { type: "name", name: ".sui" },
  { type: "name", name: ".apt" },
];

function ChainLogo({ name }: { name: string }) {
  const [broken, setBroken] = useState(false);
  const src = CHAIN_LOGO[name];

  if (broken || !src) {
    return (
      <span className="tag-logo tag-logo--fallback" aria-label={name}>
        {name[0]}
      </span>
    );
  }

  return (
    <img
      className="tag-logo"
      src={src}
      alt={name}
      onError={() => setBroken(true)}
    />
  );
}

function GroupTag({ group }: { group: Extract<CloudItem, { type: "group" }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="tag-group-wrapper" ref={ref}>
      <button
        className={`integrations__tag integrations__tag--group${open ? " integrations__tag--group-open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span className="tag-logo-stack">
          {group.preview.map((c) => (
            <ChainLogo key={c} name={c} />
          ))}
        </span>
        {group.label} ({group.chains.length})
        <svg
          className={`tag-chevron${open ? " tag-chevron--open" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="tag-group-popover">
          {group.chains.map((c) => (
            <span key={c} className="integrations__tag">
              <ChainLogo name={c} />
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
  onSuggest?: () => void;
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
  onSuggest,
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
          <div className="integrations__cloud">
            {CLOUD_ITEMS.map((item) => {
              if (item.type === "group") {
                return <GroupTag key={item.id} group={item} />;
              }
              if (item.type === "name") {
                return <span key={item.name} className="integrations__tag integrations__tag--name">{item.name}</span>;
              }
              return (
                <span key={item.name} className="integrations__tag">
                  <ChainLogo name={item.name} />
                  {item.name}
                </span>
              );
            })}
          </div>
          {onSuggest && (
            <button className="suggest-link" onClick={onSuggest}>
              Missing a network? Suggest one
            </button>
          )}
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
