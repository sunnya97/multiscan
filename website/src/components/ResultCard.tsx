import { useEffect, useRef, useState } from "react";
import { LookupResult } from "../types";
import { CHAIN_LOGO } from "../chainLogos";

interface ResultCardProps {
  result: LookupResult;
  coinGeckoUrl?: string | null;
  index: number;
  isSelected?: boolean;
}

export default function ResultCard({ result, coinGeckoUrl, index, isSelected }: ResultCardProps) {
  const { chainName, symbol, inputType, explorerUrls, status, isToken, isTestnet } = result;
  const isVerified = status === "found";
  const typeLabel = inputType === "address" ? "ADDR" : inputType === "transaction" ? "TX" : "DENOM";
  const cardRef = useRef<HTMLDivElement>(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const logoSrc = CHAIN_LOGO[chainName];

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  return (
    <div
      ref={cardRef}
      className={`result-card${isSelected ? " result-card--selected" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="result-card__header">
        <div className="result-card__chain">
          {logoSrc && !logoBroken ? (
            <img
              className="result-card__logo"
              src={logoSrc}
              alt=""
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <span className="result-card__logo-fallback">{chainName[0]}</span>
          )}
          <span className="result-card__name">{chainName}</span>
          <span className="result-card__symbol">{symbol}</span>
        </div>
        <div className="result-card__badges">
          {isTestnet && (
            <span className="result-card__badge result-card__badge--testnet">TESTNET</span>
          )}
          {isVerified && (
            <span className="result-card__badge result-card__badge--verified">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              VERIFIED
            </span>
          )}
          {isToken ? (
            <span className="result-card__badge result-card__badge--token">TOKEN</span>
          ) : (
            <span className="result-card__badge result-card__badge--type">{typeLabel}</span>
          )}
        </div>
      </div>
      <div className="result-card__actions">
        {explorerUrls.map((explorer) => (
          <a
            key={explorer.name}
            href={explorer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="result-card__link"
          >
            {explorer.name}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1H9V7M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        ))}
        {isToken && coinGeckoUrl && (
          <a
            href={coinGeckoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="result-card__link result-card__link--coingecko"
          >
            CoinGecko
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1H9V7M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
