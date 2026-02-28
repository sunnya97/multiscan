import { Action, ActionPanel, Clipboard, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getExplorerOverrides } from "./chains";
import { ExplorerUrl, InputType, LookupResult } from "./types";

interface DisplayResult {
  chainId: string;
  chainName: string;
  symbol: string;
  inputType: InputType;
  explorerUrls: ExplorerUrl[];
  status: "found" | "not_found" | "unverified";
}

function applyExplorerOverride(
  result: LookupResult,
  overrides: Map<string, string>,
): DisplayResult {
  let explorerUrls = result.explorerUrls;

  const overrideBaseUrl = overrides.get(result.chainId);
  if (overrideBaseUrl && explorerUrls.length > 0) {
    const first = explorerUrls[0];
    const originalUrl = new URL(first.url);
    const overriddenUrl = `${overrideBaseUrl}${originalUrl.pathname}${originalUrl.hash}`;
    explorerUrls = [
      { name: first.name, url: overriddenUrl },
      ...explorerUrls.slice(1),
    ];
  }

  return {
    chainId: result.chainId,
    chainName: result.chainName,
    symbol: result.symbol,
    inputType: result.inputType,
    explorerUrls,
    status: result.status,
  };
}

async function fetchWorker(input: string, workerUrl: string, verify: boolean): Promise<LookupResult[]> {
  const response = await fetch(`${workerUrl}/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, verify }),
  });

  if (!response.ok) {
    throw new Error(`Worker returned ${response.status}`);
  }

  const data = (await response.json()) as { results: LookupResult[] };
  return data.results;
}

export default function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [verifiedResults, setVerifiedResults] = useState<LookupResult[] | null>(null);
  const [verifyingInput, setVerifyingInput] = useState("");

  const { data: clipboardText } = usePromise(async () => {
    const clip = await Clipboard.readText();
    return clip?.trim() ?? "";
  });

  // Auto-fill from clipboard on launch
  useEffect(() => {
    if (clipboardText && !searchText) {
      const clip = clipboardText.trim();
      if (clip.length >= 20 && /^[a-zA-Z0-9._:\-]+$/.test(clip)) {
        setSearchText(clip);
      }
    }
  }, [clipboardText]);

  const prefs = getPreferenceValues<{ workerUrl: string }>();
  const workerUrl = prefs.workerUrl;

  const explorerOverrides = useMemo(() => getExplorerOverrides(), []);

  // Phase 1: instant detection (verify=false)
  const {
    data: detectResults,
    isLoading: isDetecting,
  } = usePromise(
    async (input: string) => {
      if (!input.trim()) return [];
      return fetchWorker(input.trim(), workerUrl, false);
    },
    [searchText],
    { execute: searchText.trim().length > 0 },
  );

  // Phase 2: kick off verification in background when detection returns multiple results
  const trimmedSearch = searchText.trim();
  useEffect(() => {
    if (!detectResults || detectResults.length <= 1 || trimmedSearch !== verifyingInput) {
      // Clear stale verified results when input changes
      if (trimmedSearch !== verifyingInput) {
        setVerifiedResults(null);
      }
    }
    if (!detectResults || detectResults.length <= 1 || !trimmedSearch) return;
    if (trimmedSearch === verifyingInput && verifiedResults) return;

    setVerifyingInput(trimmedSearch);
    let cancelled = false;
    fetchWorker(trimmedSearch, workerUrl, true).then((results) => {
      if (!cancelled) setVerifiedResults(results);
    });
    return () => { cancelled = true; };
  }, [detectResults, trimmedSearch]);

  // Use verified results when available, otherwise detection results
  const lookupResults = (verifiedResults && verifyingInput === trimmedSearch) ? verifiedResults : detectResults;
  const isVerifying = !!detectResults && detectResults.length > 1 && (!verifiedResults || verifyingInput !== trimmedSearch);
  const isLoading = isDetecting || isVerifying;

  // Apply local explorer overrides — hide results while verifying to avoid flash of unverified list
  const displayResults: DisplayResult[] = useMemo(() => {
    if (!lookupResults || lookupResults.length === 0 || isVerifying) return [];
    return lookupResults.map((r) => applyExplorerOverride(r, explorerOverrides));
  }, [lookupResults, explorerOverrides, isVerifying]);

  // Determine section grouping
  const inputType = displayResults[0]?.inputType;
  const isAddress = inputType === "address";

  const foundResults = displayResults.filter((r) => r.status === "found");
  const unverifiedResults = displayResults.filter((r) => r.status === "unverified");

  // For addresses: if all results are unverified (no activity anywhere), show as "All Matching"
  const addressFallback = isAddress && displayResults.length > 1 && foundResults.length === 0 && unverifiedResults.length === displayResults.length;

  const sectioned = useMemo(() => {
    if (addressFallback) {
      return { allMatching: displayResults, verified: [], unverified: [] };
    }
    return { allMatching: [], verified: foundResults, unverified: unverifiedResults };
  }, [addressFallback, displayResults, foundResults, unverifiedResults]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste a crypto address or transaction hash..."
      isLoading={isLoading}
      throttle
    >
      {isVerifying && searchText.trim() ? (
        <List.EmptyView
          title="Searching across networks..."
          description="Verifying activity on matching chains"
          icon={Icon.Globe}
        />
      ) : displayResults.length === 0 && searchText.trim() && !isLoading ? (
        <List.EmptyView
          title="No chains detected"
          description="Try pasting a valid crypto address or transaction hash"
          icon={Icon.MagnifyingGlass}
        />
      ) : !searchText.trim() ? (
        <List.EmptyView
          title="Search Crypto Address / Transaction"
          description="Paste or type any crypto address or transaction hash to detect the chain"
          icon={Icon.MagnifyingGlass}
        />
      ) : null}

      {sectioned.allMatching.length > 0 && (
        <List.Section title="No activity found — potential matches">
          {sectioned.allMatching.map((result) => (
            <ResultItem key={`${result.chainId}-${result.inputType}`} result={result} query={searchText} />
          ))}
        </List.Section>
      )}

      {sectioned.verified.length > 0 && (
        <List.Section title="Verified">
          {sectioned.verified.map((result) => (
            <ResultItem key={`${result.chainId}-${result.inputType}`} result={result} query={searchText} />
          ))}
        </List.Section>
      )}

      {sectioned.unverified.length > 0 && (
        <List.Section title={sectioned.verified.length > 0 ? "Other Chains" : "Detected Chains"}>
          {sectioned.unverified.map((result) => (
            <ResultItem key={`${result.chainId}-${result.inputType}`} result={result} query={searchText} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ResultItem({ result, query }: { result: DisplayResult; query: string }) {
  const { chainName, symbol, inputType, explorerUrls, status } = result;
  const typeLabel = inputType === "address" ? "Address" : "Transaction";
  const tagColor = inputType === "address" ? Color.Blue : Color.Green;

  const primaryUrl = explorerUrls[0]?.url ?? "";
  const additionalExplorers = explorerUrls.slice(1);

  const accessories: List.Item.Accessory[] = [];

  if (status === "found") {
    accessories.push({ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Verified on-chain" });
  }

  accessories.push({ tag: { value: typeLabel, color: tagColor } });

  return (
    <List.Item
      title={chainName}
      subtitle={symbol}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={`Open in ${explorerUrls[0]?.name ?? "Explorer"}`} url={primaryUrl} />
          {additionalExplorers.map((explorer) => (
            <Action.OpenInBrowser key={explorer.name} title={`Open in ${explorer.name}`} url={explorer.url} />
          ))}
          <Action.CopyToClipboard title="Copy Explorer URL" content={primaryUrl} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard
            title="Copy Input"
            content={query.trim()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
