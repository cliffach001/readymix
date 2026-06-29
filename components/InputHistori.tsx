"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface InputHistoriProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  multiline?: boolean;
  className?: string;
  name?: string;
}

export default function InputHistori({
  value,
  onChange,
  suggestions,
  placeholder = "",
  label,
  required = false,
  multiline = false,
  className = "",
  name,
}: InputHistoriProps) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current value (case-insensitive)
  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  // Reset highlight when filtered list or value changes
  useEffect(() => {
    setHighlightIdx(-1);
  }, [filtered.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = useCallback(
    (s: string) => {
      onChange(s);
      setOpen(false);
      setHighlightIdx(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          selectSuggestion(filtered[highlightIdx]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightIdx(-1);
        break;
    }
  };

  const showDropdown = open && filtered.length > 0;

  const inputProps = {
    value,
    placeholder,
    required,
    name,
    ref: inputRef as any,
    onFocus: () => setOpen(true),
    onBlur: () => {
      // Delay to allow click on dropdown
      setTimeout(() => setOpen(false), 200);
    },
    onChange: (e: React.ChangeEvent<any>) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    autoComplete: "off",
    className: `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${className}`,
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <div className="relative">
        {multiline ? (
          <textarea
            {...(inputProps as any)}
            rows={2}
            className={`resize-none ${inputProps.className}`}
          />
        ) : (
          <input
            type="text"
            {...(inputProps as any)}
          />
        )}

        {/* Dropdown suggestions */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
            style={{ top: "100%" }}
          >
            {filtered.map((s, i) => (
              <button
                key={s + i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(s);
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === highlightIdx
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
