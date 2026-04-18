"use client";

import { Component, ReactNode } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorId: null };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  async componentDidCatch(error: Error) {
    const errorId = await logCrash({
      message: error.message,
      stack: error.stack ?? "",
      type: "react_boundary",
    });
    this.setState({ errorId });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-500">
              This error has been logged automatically.
            </p>
            {this.state.errorId && (
              <p className="mt-1 text-xs text-gray-400">Error ID: {this.state.errorId}</p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Global unhandled promise rejections & JS errors ──────────────────────────

export function registerGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    const stack = e.reason instanceof Error ? (e.reason.stack ?? "") : "";
    logCrash({ message: msg, stack, type: "unhandled_rejection" });
  });

  window.addEventListener("error", (e) => {
    logCrash({
      message: e.message,
      stack: e.error?.stack ?? "",
      type: "global_error",
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });
}

// ── Firestore logger ─────────────────────────────────────────────────────────

async function logCrash(params: {
  message: string;
  stack: string;
  type: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, "crashes"), {
      ...params,
      uid: auth.currentUser?.uid ?? null,
      page: typeof window !== "undefined" ? window.location.pathname : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch {
    // Never throw from an error handler
    return null;
  }
}
