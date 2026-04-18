"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { generateReferralCode, getReferralStats } from "@/lib/referral";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Gift, Copy, Check, Users, Zap, Link2 } from "lucide-react";

export default function ReferralPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<{ count: number; creditsEarned: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimCode, setClaimCode] = useState("");

  const referralCode = userProfile?.referralCode ?? (user ? generateReferralCode(user.uid) : "");
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${appUrl}/?ref=${referralCode}`;

  useEffect(() => {
    if (!referralCode || !user) return;
    // Ensure the referral code is persisted
    if (!userProfile?.referralCode && user) {
      updateDoc(doc(db, "users", user.uid), { referralCode }).catch(() => {});
    }
    getReferralStats(referralCode).then(setStats).catch(() => {});
  }, [referralCode, user, userProfile?.referralCode]);

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast("Referral link copied!", "success");
  }

  async function handleClaimReferral() {
    if (!claimCode.trim() || !user) return;
    setClaiming(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/referral/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralCode: claimCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to claim");
      toast(`Referral claimed! +${data.creditsAwarded} credits added to your account.`, "success");
      setClaimCode("");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Referral Program</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Invite friends and earn 50 credits for each person who signs up.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Link2, title: "Share your link", desc: "Send your unique referral link to friends." },
          { icon: Users, title: "They sign up", desc: "Your friend creates an account using your link." },
          { icon: Zap, title: "Both get credits", desc: "You and your friend each get 50 free credits." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* Your referral link */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Your Referral Link</h2>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600 truncate dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-3 dark:bg-indigo-950/40">
          <span className="text-xs text-gray-500 dark:text-gray-400">Your code:</span>
          <span className="font-mono text-lg font-bold tracking-widest text-indigo-700 dark:text-indigo-300">
            {referralCode}
          </span>
        </div>
      </div>

      {/* Stats */}
      {stats !== null && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Friends referred</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.count}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Credits earned</p>
            <p className="mt-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.creditsEarned.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Claim a referral */}
      {!userProfile?.referredBy && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <h2 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
            Have a referral code?
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Enter a friend&apos;s code to get 50 bonus credits (one-time).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={8}
              className="block w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm uppercase text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              onClick={handleClaimReferral}
              disabled={!claimCode.trim() || claiming}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              {claiming ? "Claiming…" : "Claim +50 credits"}
            </button>
          </div>
        </div>
      )}
      {userProfile?.referredBy && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You were referred by code <span className="font-mono font-bold">{userProfile.referredBy}</span> and received your bonus credits.
        </p>
      )}
    </div>
  );
}
