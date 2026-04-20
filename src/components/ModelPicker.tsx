"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search, Loader2, AlertCircle } from "lucide-react";
import { OpenRouterModel, formatContext, formatPrice } from "@/lib/openrouter";

interface Props {
  models: OpenRouterModel[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
  error: string;
}

type DropdownPos =
  | { position: "fixed"; top: number; left: number; right: number }
  | { position: "absolute"; left?: string; right?: string };

export default function ModelPicker({ models, value, onChange, loading, error }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ position: "absolute", right: "0" });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = models.find((m) => m.id === value);

  const filtered = search.trim()
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase())
      )
    : models;

  // Close on outside click / touch
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Auto-focus search when opened; calculate safe dropdown position
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);

      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const DROPDOWN_W = 320;
        const MOBILE_BREAKPOINT = 640;
        const PADDING = 16;

        if (vw < MOBILE_BREAKPOINT) {
          // On mobile: fixed, full-width inside viewport padding
          setDropdownPos({
            position: "fixed",
            top: rect.bottom + 4,
            left: PADDING,
            right: PADDING,
          });
        } else {
          // On desktop: absolute, prefer right-aligned but flip to left if it would overflow
          const rightAlignedLeft = rect.right - DROPDOWN_W;
          if (rightAlignedLeft < PADDING) {
            setDropdownPos({ position: "absolute", left: "0" });
          } else {
            setDropdownPos({ position: "absolute", right: "0" });
          }
        }
      }
    } else {
      setSearch("");
    }
  }, [open]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
  }

  const dropdownStyle: React.CSSProperties =
    dropdownPos.position === "fixed"
      ? {
          position: "fixed",
          top: dropdownPos.top,
          left: dropdownPos.left,
          right: dropdownPos.right,
          width: "auto",
        }
      : {};

  const dropdownClassName =
    dropdownPos.position === "fixed"
      ? "z-50 mt-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
      : `absolute z-50 mt-1 min-w-[320px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${
          dropdownPos.left === "0" ? "left-0" : "right-0"
        }`;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !loading && setOpen((o) => !o)}
        disabled={loading || !!error}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        <span className="truncate text-gray-900 dark:text-gray-100">
          {loading
            ? "Loading models…"
            : error
            ? "Failed to load models"
            : selected
            ? selected.name
            : "Select a model…"}
        </span>
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
        ) : error ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={dropdownClassName} style={dropdownStyle}>
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or provider…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {filtered.length}
            </span>
          </div>

          {/* Column headers — hidden on mobile to save space */}
          <div className="hidden items-center gap-3 border-b border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-800/50 sm:flex">
            <span className="flex-1 text-xs font-medium text-gray-400 dark:text-gray-500">Model</span>
            <span className="w-12 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Ctx</span>
            <span className="w-16 text-right text-xs font-medium text-gray-400 dark:text-gray-500">In/1M</span>
            <span className="w-16 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Out/1M</span>
            <span className="w-4" />
          </div>

          {/* Model list */}
          <ul className="max-h-72 overflow-y-auto sm:max-h-80">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                No models match &ldquo;{search}&rdquo;
              </li>
            ) : (
              filtered.map((m) => {
                const provider = m.id.split("/")[0];
                const isSelected = m.id === value;
                const inputPrice = formatPrice(m.pricing.prompt);
                const outputPrice = formatPrice(m.pricing.completion);
                const isFree = inputPrice === "Free" && outputPrice === "Free";

                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(m.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        isSelected ? "bg-indigo-50 dark:bg-indigo-950" : ""
                      }`}
                    >
                      {/* Name + provider */}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${isSelected ? "text-indigo-700 dark:text-indigo-400" : "text-gray-900 dark:text-gray-100"}`}>
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {provider}
                          {/* Show pricing inline on mobile */}
                          {isFree
                            ? <span className="ml-1.5 font-medium text-green-600 dark:text-green-400">· Free</span>
                            : <span className="ml-1.5 text-gray-400"> · {inputPrice} / {outputPrice}</span>}
                        </p>
                      </div>

                      {/* Context — desktop only */}
                      <span className="hidden w-12 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500 sm:block">
                        {formatContext(m.context_length)}
                      </span>

                      {/* Input price — desktop only */}
                      <span className={`hidden w-16 shrink-0 text-right text-xs sm:block ${isFree ? "font-medium text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {isFree ? "Free" : inputPrice}
                      </span>

                      {/* Output price — desktop only */}
                      <span className="hidden w-16 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400 sm:block">
                        {isFree ? "" : outputPrice}
                      </span>

                      {/* Check */}
                      <span className="w-4 shrink-0">
                        {isSelected && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
