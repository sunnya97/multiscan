import { useEffect, useRef, useState } from "react";

// Public Turnstile site key (safe to embed). The matching secret is set as the
// worker's TURNSTILE_SECRET; verification is only enforced when that is present.
const TURNSTILE_SITE_KEY = "0x4AAAAAADs-QWgnebCfpxy0";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface SuggestNetworkProps {
  onClose: () => void;
}

interface SuggestResult {
  created: boolean;
  issueNumber?: number;
  issueUrl?: string;
  existingIssue?: { number: number; url: string; title: string };
}

export default function SuggestNetwork({ onClose }: SuggestNetworkProps) {
  const [networkName, setNetworkName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);

  // Render the Turnstile widget. Loads the script once, then renders explicitly.
  useEffect(() => {
    let widgetId: string | undefined;

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => {
          setTurnstileToken(token);
          setTurnstileError(false);
        },
        "error-callback": () => setTurnstileError(true),
        "expired-callback": () => setTurnstileToken(null),
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);

    return () => {
      script?.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  const handleSubmit = async () => {
    const trimmed = networkName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const resp = await fetch("/api/suggest/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkName: trimmed,
          description: description.trim() || undefined,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });

      if (!resp.ok) {
        throw new Error(`API returned ${resp.status}`);
      }

      const data = (await resp.json()) as SuggestResult;
      setResult(data);
    } catch {
      setError("Failed to submit suggestion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="suggest-overlay" onClick={handleOverlayClick}>
      <div className="suggest-modal">
        <h2 className="suggest-modal__title">Suggest a Network</h2>

        {!result ? (
          <>
            <input
              className="suggest-modal__input"
              type="text"
              placeholder="Network name (e.g. Polkadot)"
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && networkName.trim()) handleSubmit();
              }}
            />
            <textarea
              className="suggest-modal__textarea"
              placeholder="Why should this network be added? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            {error && <p className="suggest-modal__error">{error}</p>}
            <div className="suggest-modal__turnstile" ref={turnstileRef} />
            <div className="suggest-modal__actions">
              <button
                className="suggest-modal__btn suggest-modal__btn--secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="suggest-modal__btn suggest-modal__btn--primary"
                onClick={handleSubmit}
                disabled={
                  !networkName.trim() ||
                  isSubmitting ||
                  (!turnstileToken && !turnstileError)
                }
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </>
        ) : (
          <div className="suggest-modal__result">
            {result.created ? (
              <p>
                Suggestion created!{" "}
                <a
                  href={result.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View issue #{result.issueNumber}
                </a>
              </p>
            ) : (
              <p>
                This network was already suggested! Added your vote.{" "}
                <a
                  href={result.existingIssue?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View issue #{result.existingIssue?.number}
                </a>
              </p>
            )}
            <div className="suggest-modal__actions">
              <button
                className="suggest-modal__btn suggest-modal__btn--secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
