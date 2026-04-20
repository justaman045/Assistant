"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { TOKEN_PACKS, TokenPack } from "@/lib/credits";
import { Zap, Check, AlertTriangle, Loader2, ShoppingCart, X, Sparkles, Star } from "lucide-react";
import { PLANS, annualSavings } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="checkout.razorpay"]')) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.head.appendChild(s);
  });
}

const SUBSCRIPTIONS_ENABLED = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === "true";
const DISMISS_KEY = "sub_banner_dismissed";

export default function BillingPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    setBannerDismissed(!!localStorage.getItem(DISMISS_KEY));
  }, []);

  function dismissBanner() {
    localStorage.setItem(DISMISS_KEY, "1");
    setBannerDismissed(true);
  }

  const tokens = userProfile?.tokens ?? userProfile?.credits ?? 0;
  const tokensUsed = userProfile?.tokensUsed ?? userProfile?.creditsUsed ?? 0;
  const isLow = tokens < 10_000;
  const razorpayConfigured = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  async function handleSubscribe(planId: string) {
    if (!user || planId === "free") return;
    setSubLoading(planId);
    try {
      await loadRazorpayScript();
      const idToken = await user.getIdToken();
      const res = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Plan not configured") {
          toast("Subscriptions coming soon — use credit packs for now.", "info");
        } else {
          throw new Error(data.error ?? `Request failed: ${res.status}`);
        }
        return;
      }

      const { subscriptionId, keyId } = await res.json();
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          subscription_id: subscriptionId,
          name: "Personal Dashboard",
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} plan — ${billingCycle}`,
          theme: { color: "#4f46e5" },
          handler: () => {
            toast("Subscription activated! Tokens will be added shortly.", "success");
            resolve();
          },
          modal: { ondismiss: () => reject(new Error("dismissed")) },
        });
        rzp.open();
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "dismissed") toast(msg || "Subscription failed. Please try again.", "error");
    } finally {
      setSubLoading(null);
    }
  }

  async function handleBuy(pack: TokenPack) {
    if (!user) return;
    setLoading(pack.id);

    try {
      await loadRazorpayScript();

      const idToken = await user.getIdToken();
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ packId: pack.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const { orderId, keyId } = await res.json();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          order_id: orderId,
          name: "Personal Dashboard",
          description: `${pack.name} — ${(pack.tokens / 1000).toFixed(0)}K tokens`,
          amount: pack.price * 100,
          currency: "INR",
          theme: { color: "#4f46e5" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await user.getIdToken()}`,
                },
                body: JSON.stringify({ ...response, packId: pack.id }),
              });
              if (!verifyRes.ok) throw new Error("Payment verification failed");
              await verifyRes.json();
              toast(`${(pack.tokens / 1000).toFixed(0)}K tokens added to your account!`, "success");
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error("dismissed")) },
        });
        rzp.open();
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "dismissed") toast(msg || "Payment failed. Please try again.", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Subscription upgrade banner */}
      {SUBSCRIPTIONS_ENABLED && !bannerDismissed && (
        <div className="relative flex items-start gap-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-200" />
          <div className="flex-1">
            <p className="font-semibold">Monthly subscriptions are now available!</p>
            <p className="mt-0.5 text-sm text-indigo-200">
              Get tokens automatically every month at a lower per-token price. Switch to a subscription plan and save more.
            </p>
            <button
              onClick={() => document.getElementById("subscription-plans")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-3 rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              View subscription plans →
            </button>
          </div>
          <button
            onClick={dismissBanner}
            className="shrink-0 rounded-md p-1 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Billing & Tokens</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Buy tokens and track your usage. Charged based on actual AI token consumption.
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-xl p-6 shadow-sm ring-1 ${isLow ? "bg-red-50 ring-red-200 dark:bg-red-950/30 dark:ring-red-800" : "bg-white ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tokens Remaining</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isLow ? "bg-red-100 dark:bg-red-900" : "bg-indigo-50 dark:bg-indigo-950"}`}>
              <Zap className={`h-4 w-4 ${isLow ? "text-red-500" : "text-indigo-600 dark:text-indigo-400"}`} />
            </div>
          </div>
          <p className={`mt-2 text-3xl font-bold ${isLow ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
            {tokens >= 1_000 ? `${(tokens / 1000).toFixed(1)}K` : tokens.toLocaleString()}
          </p>
          {isLow && (
            <p className="mt-1 text-xs text-red-500">Low balance — top up to keep generating</p>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tokens Used</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {tokensUsed >= 1_000 ? `${(tokensUsed / 1000).toFixed(1)}K` : tokensUsed.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">all time</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Billing Model</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Pay as you go</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">no recurring charges</p>
        </div>
      </div>

      {/* Token cost info */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">How tokens work</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-indigo-700 dark:text-indigo-400">
          <span>Tokens are deducted based on <strong>actual AI usage</strong> — 1 token = 1 OpenRouter token consumed.</span>
          <span>You start with <strong>50,000 free tokens</strong>. Top up any time — tokens never expire.</span>
        </div>
      </div>

      {/* Subscription plans */}
      <div id="subscription-plans">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription Plans</h2>
          {/* Monthly / Annual toggle */}
          <div className="flex w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white sm:w-auto dark:border-gray-700 dark:bg-gray-900">
            {(["monthly", "annual"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  billingCycle === cycle
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {cycle}
                {cycle === "annual" && (
                  <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400">
                    Save 2 months
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const savings = annualSavings(plan);
            const isCurrentPlan = userProfile?.plan === plan.id;
            const isFree = plan.id === "free";
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 shadow-sm ring-1 transition-all hover:shadow-md ${
                  plan.badge
                    ? "bg-indigo-600 ring-indigo-600 text-white"
                    : "bg-white ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-amber-900">
                    <Star className="h-3 w-3" /> {plan.badge}
                  </span>
                )}
                <div className="mb-4">
                  <h3 className={`text-base font-bold ${plan.badge ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-0.5 text-xs ${plan.badge ? "text-indigo-200" : "text-gray-400 dark:text-gray-500"}`}>
                    {plan.description}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${plan.badge ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
                      {isFree ? "Free" : `₹${price}`}
                    </span>
                    {!isFree && (
                      <span className={`text-xs ${plan.badge ? "text-indigo-200" : "text-gray-400"}`}>
                        /{billingCycle === "annual" ? "yr" : "mo"}
                      </span>
                    )}
                  </div>
                  {billingCycle === "annual" && savings > 0 && (
                    <p className={`mt-1 text-xs ${plan.badge ? "text-indigo-200" : "text-green-600 dark:text-green-400"}`}>
                      Save ₹{savings}/yr
                    </p>
                  )}
                </div>
                <ul className="mb-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.badge ? "text-indigo-200" : "text-green-500 dark:text-green-400"}`} />
                      <span className={`text-xs ${plan.badge ? "text-indigo-100" : "text-gray-600 dark:text-gray-400"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <div className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${plan.badge ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    Current plan
                  </div>
                ) : isFree ? (
                  <div className="rounded-lg bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-400 dark:bg-gray-800">
                    Always free
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={!!subLoading || !razorpayConfigured}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                      plan.badge
                        ? "bg-white text-indigo-600 hover:bg-indigo-50"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {subLoading === plan.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Token packs */}
      <div>
        <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-gray-100">Buy Tokens</h2>

        {!razorpayConfigured && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Razorpay is not configured. Add <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900">NEXT_PUBLIC_RAZORPAY_KEY_ID</code> to your <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900">.env.local</code>.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {TOKEN_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="relative flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md dark:bg-gray-900 dark:ring-gray-700"
            >
              {pack.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-amber-900">
                  {pack.badge}
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{pack.name}</h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">₹{pack.price}</span>
                  <span className="text-sm text-gray-400">one-time</span>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{pack.perKTokens}</p>
              </div>

              <ul className="mb-6 flex-1 space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{(pack.tokens / 1000).toFixed(0)}K tokens</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
                  Never expires
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
                  All AI models included
                </li>
              </ul>

              <button
                onClick={() => handleBuy(pack)}
                disabled={!!loading || !razorpayConfigured}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading === pack.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <><ShoppingCart className="h-4 w-4" /> Buy for ₹{pack.price}</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
