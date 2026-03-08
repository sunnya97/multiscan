import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLookup } from "./api";
import { LookupResult } from "./types";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import SuggestNetwork from "./components/SuggestNetwork";

export default function App() {
  const [searchText, setSearchText] = useState("");
  const [detectResults, setDetectResults] = useState<LookupResult[] | null>(null);
  const [verifiedResults, setVerifiedResults] = useState<LookupResult[] | null>(null);
  const [verifyingInput, setVerifyingInput] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [nameNotFound, setNameNotFound] = useState(false);
  const [coinGeckoUrl, setCoinGeckoUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelPhase2Ref = useRef<(() => void) | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced Phase 1 detection
  const handleSearch = useCallback((input: string) => {
    setSearchText(input);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cancelPhase2Ref.current) {
      cancelPhase2Ref.current();
      cancelPhase2Ref.current = undefined;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      setDetectResults(null);
      setVerifiedResults(null);
      setVerifyingInput("");
      setResolvedName(null);
      setResolvedAddress(null);
      setNameNotFound(false);
      setCoinGeckoUrl(null);
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetchLookup(trimmed, false);

        if (resp.resolvedName && resp.resolvedAddress) {
          setResolvedName(resp.resolvedName);
          setResolvedAddress(resp.resolvedAddress);
          setNameNotFound(false);
        } else if (resp.nameNotFound) {
          setResolvedName(null);
          setResolvedAddress(null);
          setNameNotFound(true);
        } else {
          setResolvedName(null);
          setResolvedAddress(null);
          setNameNotFound(false);
        }

        if (resp.results.length === 1 && resp.coinGeckoUrl) {
          setCoinGeckoUrl(resp.coinGeckoUrl);
        }

        setDetectResults(resp.results);
        setIsDetecting(false);

        // Phase 2: verify if multiple results
        if (resp.results.length > 1) {
          setVerifiedResults(null);
          setCoinGeckoUrl(null);
          setVerifyingInput(trimmed);

          let cancelled = false;
          cancelPhase2Ref.current = () => { cancelled = true; };

          const phase2Input = resp.resolvedAddress ?? trimmed;
          const verifyResp = await fetchLookup(phase2Input, true);
          if (!cancelled) {
            setVerifiedResults(verifyResp.results);
            setCoinGeckoUrl(verifyResp.coinGeckoUrl ?? null);
          }
        } else {
          setVerifiedResults(null);
          setVerifyingInput("");
        }
      } catch {
        setIsDetecting(false);
      }
    }, 300);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (cancelPhase2Ref.current) cancelPhase2Ref.current();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const trimmedSearch = searchText.trim();
  const lookupResults =
    verifiedResults && verifyingInput === trimmedSearch
      ? verifiedResults
      : detectResults;
  const isVerifying =
    !!detectResults &&
    detectResults.length > 1 &&
    (!verifiedResults || verifyingInput !== trimmedSearch);

  const displayResults =
    !lookupResults || lookupResults.length === 0 || isVerifying
      ? []
      : lookupResults;

  const isLoading = isDetecting || isVerifying;

  // Reset selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayResults.length]);

  // Show toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 1800);
  }, []);

  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keys when a modal is open
      if (showSuggestModal) return;
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      const inputFocused = document.activeElement === inputRef.current;

      // ArrowDown / ArrowUp — navigate results
      if (e.key === "ArrowDown" && displayResults.length > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, displayResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp" && displayResults.length > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      // Enter — open primary explorer URL
      if (e.key === "Enter" && displayResults.length > 0 && !metaOrCtrl) {
        e.preventDefault();
        const selected = displayResults[selectedIndex];
        if (selected?.explorerUrls[0]?.url) {
          window.open(selected.explorerUrls[0].url, "_blank");
        }
        return;
      }

      // Cmd/Ctrl+Shift+C — copy raw input/address
      if (e.key === "c" && metaOrCtrl && e.shiftKey && displayResults.length > 0) {
        e.preventDefault();
        const text = resolvedAddress || trimmedSearch;
        navigator.clipboard.writeText(text);
        showToast("Copied input");
        return;
      }

      // Cmd/Ctrl+C — copy explorer URL (only when no text selected in input)
      if (e.key === "c" && metaOrCtrl && !e.shiftKey && displayResults.length > 0) {
        const selection = window.getSelection()?.toString() ?? "";
        if (selection.length > 0) return; // let native copy work
        e.preventDefault();
        const selected = displayResults[selectedIndex];
        if (selected?.explorerUrls[0]?.url) {
          navigator.clipboard.writeText(selected.explorerUrls[0].url);
          showToast("Copied URL");
        }
        return;
      }

      // Escape — clear search or blur
      if (e.key === "Escape") {
        if (trimmedSearch) {
          handleSearch("");
        } else {
          inputRef.current?.blur();
        }
        return;
      }

      // Printable key when input not focused — refocus input
      if (!inputFocused && !metaOrCtrl && !e.altKey && e.key.length === 1) {
        inputRef.current?.focus();
        // Don't preventDefault — let the character be typed into the input
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayResults, selectedIndex, trimmedSearch, resolvedAddress, handleSearch, showToast, showSuggestModal]);

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1 className="header__title">
            <span className="header__multi">Multi</span>scan
          </h1>
          <p className="header__sub">Universal crypto address &amp; transaction scanner</p>
        </header>
        <SearchBar ref={inputRef} value={searchText} onChange={handleSearch} isLoading={isLoading} />
        <ResultsList
          results={displayResults}
          coinGeckoUrl={coinGeckoUrl}
          isVerifying={isVerifying}
          resolvedName={resolvedName}
          resolvedAddress={resolvedAddress}
          nameNotFound={nameNotFound}
          hasInput={trimmedSearch.length > 0}
          isLoading={isLoading}
          selectedIndex={selectedIndex}
          onSuggest={() => setShowSuggestModal(true)}
        />
        {displayResults.length > 0 && (
          <div className="keyboard-hints">
            <span className="keyboard-hints__item"><kbd>{"↑↓"}</kbd> Navigate</span>
            <span className="keyboard-hints__sep">&middot;</span>
            <span className="keyboard-hints__item"><kbd>{"↵"}</kbd> Open</span>
            <span className="keyboard-hints__sep">&middot;</span>
            <span className="keyboard-hints__item"><kbd>{"⌘C"}</kbd> Copy URL</span>
            <span className="keyboard-hints__sep">&middot;</span>
            <span className="keyboard-hints__item"><kbd>{"⌘⇧C"}</kbd> Copy Input</span>
            <span className="keyboard-hints__sep">&middot;</span>
            <span className="keyboard-hints__item"><kbd>Esc</kbd> Clear</span>
          </div>
        )}
        <footer className="footer">
          <span>Multiscan</span>
          <span className="footer__sep">&middot;</span>
          <span>Open source</span>
        </footer>
      </div>
      {showSuggestModal && (
        <SuggestNetwork onClose={() => setShowSuggestModal(false)} />
      )}
      {toastMessage && (
        <div className="toast" key={toastMessage}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
