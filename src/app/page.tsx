"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { signInWithGoogle } from "@/lib/auth";
import Link from "next/link";
import {
  Sparkles, Zap, Brain, FileText, Mic2,
  ArrowRight, Check, Star, MessageSquare, CheckSquare,
  Wallet, Package, Sun, Moon, Monitor, Loader2,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Content Studio",
    desc: "18 structured templates — LinkedIn posts, cold emails, blog articles, YouTube scripts, and more.",
  },
  {
    icon: Brain,
    title: "Memory System",
    desc: "The AI remembers your background, audience, and style. Every generation feels authentically yours.",
  },
  {
    icon: Mic2,
    title: "Brand Voice",
    desc: "Define your tone once. Every piece automatically matches your voice — no more constant editing.",
  },
  {
    icon: MessageSquare,
    title: "AI Roleplay",
    desc: "Practice sales calls, interviews, or creative scenarios with custom AI partners you build.",
  },
  {
    icon: CheckSquare,
    title: "Planner",
    desc: "Plan tasks with priorities, due dates, and notes. Track progress from To-Do to Done.",
  },
  {
    icon: Wallet,
    title: "Finance Tracker",
    desc: "Log income and expenses. Ask AI to analyze your spending and tell you what to fix.",
  },
  {
    icon: Package,
    title: "Subscription Manager",
    desc: "Track all your subscriptions. AI tells you what to drop — and respects your personal notes.",
  },
  {
    icon: Zap,
    title: "30+ AI Models",
    desc: "GPT-4o, Claude Opus, Gemini, Mistral — switch models per task or set your default.",
  },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Sign in with Google", desc: "One click. No forms, no credit card required. 50 free credits on signup." },
  { step: "2", title: "Set up your memory & brand voice", desc: "Tell the AI who you are. It uses this context on every single generation." },
  { step: "3", title: "Create, plan, and analyze", desc: "Generate content, manage tasks, track finances — all in one dashboard." },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "Content Creator", quote: "I write 10x faster now. The brand voice feature is genuinely a game-changer." },
  { name: "Rahul M.", role: "SaaS Founder", quote: "LinkedIn posts, cold emails, product launches — all handled in minutes." },
  { name: "Ananya K.", role: "Freelance Writer", quote: "The memory system is wild. It actually knows my style after a few uses." },
];

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
type ThemeValue = keyof typeof THEME_ICONS;

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) localStorage.setItem("referralCode", ref);
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(userProfile?.onboardingComplete ? "/dashboard" : "/onboarding");
  }, [user, userProfile, loading, router]);

  async function handleSignIn() {
    setSignInError("");
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("popup-closed") && !msg.includes("cancelled")) {
        setSignInError("Sign-in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900">
              {(["light", "dark", "system"] as ThemeValue[]).map((t) => {
                const Icon = THEME_ICONS[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    title={t.charAt(0).toUpperCase() + t.slice(1)}
                    className={`flex items-center justify-center rounded-md p-1.5 transition-all ${
                      theme === t
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-70"
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Get started free
              {!signingIn && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          Your all-in-one personal AI dashboard
        </div>
        <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Create content, plan your life,{" "}
          <span className="text-indigo-600 dark:text-indigo-400">powered by AI</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-500 dark:text-gray-400">
          Write LinkedIn posts, practice sales calls, track your finances, manage subscriptions — all from one dashboard with 30+ AI models and your personal brand voice baked in.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 disabled:opacity-70 dark:shadow-none"
          >
            {signingIn
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in…</>
              : <><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google</>
            }
          </button>
          <p className="text-sm text-gray-400 dark:text-gray-500">50 free credits · No credit card required</p>
        </div>
        {signInError && (
          <p className="mt-4 text-sm text-red-500">{signInError}</p>
        )}
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold">Everything in one place</h2>
          <p className="mb-12 text-center text-gray-500 dark:text-gray-400">Eight tools, one dashboard. No tab-switching between 6 apps.</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
                  <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">Up and running in 2 minutes</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                  {step}
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">Loved by creators</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, quote }) => (
              <div key={name} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">&ldquo;{quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="mb-8 text-gray-500 dark:text-gray-400">
            Start free with 50 credits. Subscribe monthly for more, or buy one-time packs — they never expire.
          </p>
          <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            {[
              { name: "Free", price: "₹0", credits: "50 credits/month", cta: "Get started", highlight: false },
              { name: "Starter", price: "₹299/mo", credits: "500 credits/month", cta: "Start Starter", highlight: false },
              { name: "Pro", price: "₹699/mo", credits: "1,500 credits/month", cta: "Go Pro", highlight: true },
            ].map(({ name, price, credits, cta, highlight }) => (
              <div
                key={name}
                className={`rounded-2xl p-5 ring-1 ${
                  highlight
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                }`}
              >
                <p className={`text-sm font-medium ${highlight ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"}`}>{name}</p>
                <p className={`mt-1 text-2xl font-bold ${highlight ? "text-white" : ""}`}>{price}</p>
                <p className={`mt-1 text-xs ${highlight ? "text-indigo-200" : "text-gray-400 dark:text-gray-500"}`}>{credits}</p>
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className={`mt-4 block w-full rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors disabled:opacity-70 ${
                    highlight
                      ? "bg-white text-indigo-600 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {signingIn ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : cta}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-1 text-sm text-gray-400 dark:text-gray-500">
            <p>Business plan at ₹1,499/mo for 5,000 credits/month also available.</p>
            <p>Or buy one-time credit packs — they never expire.</p>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-8 text-2xl font-bold">Every plan includes</h2>
          <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
            {[
              "All 30+ AI models",
              "Content Studio (18 templates)",
              "Brand Voice",
              "Memory System",
              "Version History",
              "Export (MD & TXT)",
              "AI Roleplay partners",
              "Planner & task manager",
              "Finance Tracker + AI",
              "Subscription Manager + AI",
              "Content Calendar",
              "Referral rewards",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold text-white">Ready to get more done?</h2>
          <p className="mt-4 text-indigo-200">
            Join creators and founders who run their work life from one AI dashboard.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 disabled:opacity-70"
          >
            {signingIn
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <><ArrowRight className="h-5 w-5" /> Sign in with Google — it's free</>
            }
          </button>
          <p className="mt-3 text-sm text-indigo-300">50 credits free · No card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Dashboard</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">Terms</Link>
          </div>
          <p>© {new Date().getFullYear()} Dashboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
