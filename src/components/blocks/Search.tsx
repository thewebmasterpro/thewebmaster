"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// SEARCH INPUT
// Basic search input with icon
// =============================================================================

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = "Rechercher...",
  autoFocus = false,
  size = "md",
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = controlledValue ?? internalValue;

  const sizeStyles = {
    sm: "h-9 text-sm pl-9 pr-3",
    md: "h-11 pl-11 pr-4",
    lg: "h-14 text-lg pl-12 pr-5",
  };

  const iconSizes = {
    sm: "w-4 h-4 left-3",
    md: "w-5 h-5 left-3.5",
    lg: "w-6 h-6 left-4",
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  const handleClear = () => {
    setInternalValue("");
    onChange?.("");
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <SearchIcon
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          iconSizes[size]
        )}
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary",
          sizeStyles[size]
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}

// =============================================================================
// SEARCH WITH SUGGESTIONS
// Search input with autocomplete/suggestions
// =============================================================================

interface SearchSuggestion {
  id: string;
  title: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode;
}

interface SearchWithSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSearch?: (query: string) => void;
  onSelect?: (suggestion: SearchSuggestion) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchWithSuggestions({
  suggestions,
  onSearch,
  onSelect,
  isLoading = false,
  placeholder = "Rechercher...",
  className,
}: SearchWithSuggestionsProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(-1);
    onSearch?.(value);
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    onSelect?.(suggestion);
    setQuery("");
    setIsOpen(false);
    if (suggestion.href) {
      router.push(suggestion.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-11 pl-11 pr-10 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.id}>
                  <button
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      "w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-muted transition-colors",
                      selectedIndex === index && "bg-muted"
                    )}
                  >
                    {suggestion.icon && (
                      <span className="text-muted-foreground">
                        {suggestion.icon}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.description && (
                        <div className="text-sm text-muted-foreground truncate">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// SEARCH MODAL
// Full-screen search modal (Cmd+K style)
// =============================================================================

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchModal({
  isOpen,
  onClose,
  onSearch,
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  placeholder = "Rechercher...",
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Toggle would be handled by parent
      }
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    onClose();
    if (suggestion.href) {
      router.push(suggestion.href);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b">
          <SearchIcon className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-14 px-3 bg-transparent focus:outline-none"
          />
          {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
          <kbd className="hidden sm:block px-2 py-1 text-xs bg-muted rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query ? (
            suggestions.length > 0 ? (
              <ul className="py-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      onClick={() => handleSelect(suggestion)}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-muted transition-colors"
                    >
                      {suggestion.icon}
                      <div className="flex-1">
                        <div className="font-medium">{suggestion.title}</div>
                        {suggestion.description && (
                          <div className="text-sm text-muted-foreground">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Aucun résultat pour &ldquo;{query}&rdquo;
              </div>
            )
          ) : recentSearches.length > 0 ? (
            <div className="py-4">
              <h3 className="px-4 text-xs font-medium text-muted-foreground uppercase mb-2">
                Recherches récentes
              </h3>
              <ul>
                {recentSearches.map((search, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleChange(search)}
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                    >
                      {search}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Commencez à taper pour rechercher
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// SEARCH TRIGGER
// Button to open search modal
// =============================================================================

interface SearchTriggerProps {
  onClick: () => void;
  className?: string;
}

export function SearchTrigger({ onClick, className }: SearchTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors",
        className
      )}
    >
      <SearchIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Rechercher...</span>
      <kbd className="hidden md:block px-1.5 py-0.5 text-xs bg-background rounded border ml-auto">
        ⌘K
      </kbd>
    </button>
  );
}
