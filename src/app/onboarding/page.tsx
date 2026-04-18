"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { logOnboardingComplete } from "@/lib/analytics";

const ROLES = [
  "Software Engineer",
  "Designer",
  "Product Manager",
  "Data Scientist",
  "Marketer",
  "Student",
  "Freelancer",
  "Other",
];

export default function OnboardingPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [preferredName, setPreferredName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && userProfile?.onboardingComplete) router.replace("/dashboard");
  }, [loading, user, userProfile, router]);

  useEffect(() => {
    if (userProfile?.displayName) {
      setPreferredName(userProfile.preferredName ?? userProfile.displayName);
    }
  }, [userProfile]);

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    await updateDoc(doc(db, "users", user.uid), {
      preferredName: preferredName.trim() || userProfile?.displayName,
      role,
      onboardingComplete: true,
    });
    await logOnboardingComplete(role);
    router.replace("/dashboard");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        {/* Step progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  i < step
                    ? "bg-indigo-600 text-white"
                    : i === step
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900"
                    : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 rounded transition-all duration-300 ${
                    i < step ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-900 dark:ring-1 dark:ring-gray-700">
          {step === 0 && (
            <div className="text-center">
              {userProfile?.photoURL && (
                <img
                  src={userProfile.photoURL}
                  alt=""
                  className="mx-auto mb-4 h-20 w-20 rounded-full ring-4 ring-indigo-100 dark:ring-indigo-900"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Welcome, {userProfile?.displayName?.split(" ")[0]}!
              </h1>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                We&apos;re glad you&apos;re here. Let&apos;s take a moment to set up your dashboard
                so it feels like home.
              </p>
              <button
                onClick={() => setStep(1)}
                className="mt-8 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Get started →
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tell us about yourself</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This helps personalise your experience.</p>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="name">
                    What should we call you?
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder="Your preferred name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="role">
                    What best describes your role?
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">Select a role…</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!preferredName.trim() || !role}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">You&apos;re all set!</h2>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Welcome aboard, <span className="font-medium text-gray-900 dark:text-gray-100">{preferredName}</span>.
                Your dashboard is ready.
              </p>

              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <p><span className="font-medium">Name:</span> {preferredName}</p>
                <p className="mt-1"><span className="font-medium">Role:</span> {role}</p>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Setting up…" : "Go to Dashboard →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
