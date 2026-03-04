import { forwardRef, useEffect, useRef } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, isLoading }, ref) => {
    const localRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      localRef.current?.focus();
    }, []);

    return (
      <div className={`search-bar ${isLoading ? "search-bar--scanning" : ""}`}>
        <div className="search-bar__prompt">
          <span className="search-bar__caret">&gt;</span>
        </div>
        <input
          ref={(el) => {
            localRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          type="text"
          className="search-bar__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste address, tx hash, or name (vitalik.eth, toly.sol)..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        {isLoading && (
          <div className="search-bar__scanner">
            <div className="search-bar__scanner-dot" />
          </div>
        )}
      </div>
    );
  }
);

export default SearchBar;
