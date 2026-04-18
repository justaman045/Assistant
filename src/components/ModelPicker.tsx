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

export default function ModelPicker({ models, value, onChange, loading, error }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Auto-focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
    else setSearch("");
  }, [open]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
  }

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

      {/* Dropdown — min-w so it's always readable even in narrow containers */}
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[320px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
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

          {/* Column headers */}
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="flex-1 text-xs font-medium text-gray-400 dark:text-gray-500">Model</span>
            <span className="w-12 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Ctx</span>
            <span className="w-16 text-right text-xs font-medium text-gray-400 dark:text-gray-500">In/1M</span>
            <span className="w-16 text-right text-xs font-medium text-gray-400 dark:text-gray-500">Out/1M</span>
            <span className="w-4" />
          </div>

          {/* Model list */}
          <ul className="max-h-80 overflow-y-auto">
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
                        <p
                          className={`truncate text-sm font-medium ${
                            isSelected
                              ? "text-indigo-700 dark:text-indigo-400"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{provider}</p>
                      </div>

                      {/* Context */}
                      <span className="w-12 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500">
                        {formatContext(m.context_length)}
                      </span>

                      {/* Input price */}
                      <span
                        className={`w-16 shrink-0 text-right text-xs ${
                          isFree
                            ? "font-medium text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {isFree ? "Free" : inputPrice}
                      </span>

                      {/* Output price */}
                      <span className="w-16 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
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
