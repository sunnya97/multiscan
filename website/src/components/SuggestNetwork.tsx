import { useState } from "react";

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
                disabled={!networkName.trim() || isSubmitting}
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
                <a href={result.issueUrl} target="_blank" rel="noopener noreferrer">
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
