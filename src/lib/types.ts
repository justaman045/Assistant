import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  onboardingComplete: boolean;
  preferredName?: string;
  role?: string;
  defaultModel?: string;
  isAdmin?: boolean;
  brandVoice?: {
    tone?: string;
    style?: string;
    audience?: string;
    avoidWords?: string;
    samplePhrase?: string;
  };
  referralCode?: string;
  referredBy?: string;
  plan?: "free" | "starter" | "pro" | "business";
  planExpiresAt?: import("firebase/firestore").Timestamp;
  // Credits & billing
  credits?: number;
  creditsUsed?: number;
}

export interface LengthTarget {
  count: number;
  unit: "characters" | "words";
}

export interface Item {
  id: string;
  uid: string;
  title: string;
  content: string;
  contentType?: string;
  model?: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
  versionCount?: number;
}

// ─── Roleplay ─────────────────────────────────────────────────────────────────

export type RoleplayCategory = "general" | "marketing" | "therapy" | "nsfw" | "custom";

export interface RoleplayPartner {
  id: string;
  uid: string;
  name: string;
  persona: string;
  personality: string;
  category: RoleplayCategory;
  customCategoryLabel?: string;
  systemPrompt?: string;
  avatar: string;
  memoryEnabled: boolean;
  createdAt: Timestamp | null;
}

export interface RoleplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Timestamp | null;
}

// ─── Planner ──────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface PlannerTask {
  id: string;
  uid: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags?: string[];
  createdAt: Timestamp | null;
  completedAt?: Timestamp | null;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";

export interface FinanceTransaction {
  id: string;
  uid: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  createdAt: Timestamp | null;
}

// ─── Subscription Manager ─────────────────────────────────────────────────────

export type BillingCycle = "weekly" | "monthly" | "annual" | "one-time";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface ManagedSubscription {
  id: string;
  uid: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextRenewal?: string;
  category: string;
  notes?: string;
  status: SubscriptionStatus;
  emoji?: string;
  createdAt: Timestamp | null;
}

export type VersionSource = "initial" | "edit" | "regenerated" | "restored";

export interface ItemVersion {
  id: string;
  uid: string;
  content: string;
  versionNumber: number;
  source: VersionSource;
  note?: string;
  createdAt: Timestamp | null;
}
