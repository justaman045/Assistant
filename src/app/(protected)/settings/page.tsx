"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { signOutUser } from "@/lib/auth";
import { updateUserProfile } from "@/lib/user";
import { OpenRouterModel, DEFAULT_MODEL } from "@/lib/openrouter";
import ModelPicker from "@/components/ModelPicker";
import { User, Briefcase, Cpu, LogOut, Check } from "lucide-react";

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

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-500";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
          <Icon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  // Profile state
  const [preferredName, setPreferredName] = useState("");
  const [role, setRole] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Model state
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL);
  const [savingModel, setSavingModel] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);

  // Populate form from profile
  useEffect(() => {
    if (!userProfile) return;
    setPreferredName(userProfile.preferredName ?? userProfile.displayName ?? "");
    setRole(userProfile.role ?? "");
    setDefaultModel(userProfile.defaultModel ?? DEFAULT_MODEL);
  }, [userProfile]);

  // Load models
  useEffect(() => {
    fetch("/api/models")
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<OpenRouterModel[]>;
      })
      .then(setModels)
      .catch((e) => setModelsError(e.message || "Failed to load models"))
      .finally(() => setModelsLoading(false));
  }, []);

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(user.uid, {
        preferredName: preferredName.trim() || userProfile?.displayName,
        role: role || undefined,
      });
      setProfileSaved(true);
      toast("Profile updated", "success");
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      toast("Failed to save profile", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveModel() {
    if (!user) return;
    setSavingModel(true);
    try {
      await updateUserProfile(user.uid, { defaultModel });
      setModelSaved(true);
      toast("Default model saved", "success");
      setTimeout(() => setModelSaved(false), 3000);
    } catch {
      toast("Failed to save model preference", "error");
    } finally {
      setSavingModel(false);
    }
  }

  const profileDirty =
    preferredName !== (userProfile?.preferredName ?? userProfile?.displayName ?? "") ||
    role !== (userProfile?.role ?? "");

  const modelDirty = defaultModel !== (userProfile?.defaultModel ?? DEFAULT_MODEL);

  const selectedModelName =
    models.find((m) => m.id === defaultModel)?.name ??
    defaultModel.split("/")[1] ??
    defaultModel;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your profile, AI preferences, and account.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:max-w-2xl">
        {/* ── Profile ── */}
        <SectionCard
          icon={User}
          title="Profile"
          description="Your name and role are used to personalise generated content."
        >
          <div className="flex flex-col gap-4">
            {/* Display name (read-only from Google) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Display name
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  from Google
                </span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.displayName ?? ""}
                className={inputCls}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  from Google
                </span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.email ?? ""}
                className={inputCls}
              />
            </div>

            {/* Preferred name */}
            <div>
              <label
                htmlFor="preferred-name"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Preferred name
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                  how you want to be addressed
                </span>
              </label>
              <input
                id="preferred-name"
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g. Alex"
                className={inputCls}
              />
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputCls}
              >
                <option value="">Select your role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile || !profileDirty}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              >
                {profileSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : savingProfile ? (
                  "Saving…"
                ) : (
                  "Save profile"
                )}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ── AI Preferences ── */}
        <SectionCard
          icon={Cpu}
          title="AI Preferences"
          description="Set a default model to pre-select on the Create page and all Apps. You can still switch per-generation using the model dropdown."
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Default model
              </label>
              <ModelPicker
                models={models}
                value={defaultModel}
                onChange={setDefaultModel}
                loading={modelsLoading}
                error={modelsError}
              />
              {!modelsLoading && !modelsError && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Currently set to{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {selectedModelName}
                  </span>
                  {!modelDirty && userProfile?.defaultModel && (
                    <span className="ml-1 text-green-600 dark:text-green-400">· saved</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveModel}
                disabled={savingModel || !modelDirty}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              >
                {modelSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : savingModel ? (
                  "Saving…"
                ) : (
                  "Save preference"
                )}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ── Account ── */}
        <SectionCard
          icon={Briefcase}
          title="Account"
          description="Manage your session and account details."
        >
          <div className="flex flex-col gap-4">
            {/* Member since */}
            {userProfile?.createdAt && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Member since</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(userProfile.createdAt.toDate()).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Sign out */}
            <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                onClick={signOutUser}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
