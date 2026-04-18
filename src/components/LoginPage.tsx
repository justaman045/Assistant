"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth";
import { Sparkles, Brain, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    label: "AI content generation",
    desc: "Generate any content type using 200+ models from OpenRouter",
  },
  {
    icon: Brain,
    label: "Personalized memory",
    desc: "The app learns your voice and style with every generation",
  },
  {
    icon: Zap,
    label: "Streaming & fast",
    desc: "Real-time streaming output, ready to copy or save instantly",
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      const msg = (e as { code?: string }).code;
      if (msg !== "auth/popup-closed-by-user") {
        setError("Sign-in failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-indigo-600 to-violet-700 p-14 text-white">
        <div className="max-w-sm">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Personal Dashboard</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Your AI-powered<br />content studio
          </h2>
          <p className="mt-4 text-base text-indigo-200 leading-relaxed">
            Generate personalized content at scale. The more you use it, the better it knows you.
          </p>
          <div className="mt-10 space-y-6">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-indigo-200">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100">Personal Dashboard</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to continue to your dashboard.
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          {error && (
            <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            By signing in you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-400">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-gray-600 dark:hover:text-gray-400">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
