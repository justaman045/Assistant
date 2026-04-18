export interface Plan {
  id: "free" | "starter" | "pro" | "business";
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  credits: number;
  badge?: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started for free",
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 50,
    features: [
      "50 credits/month",
      "All AI models",
      "Content history",
      "Memory system",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For regular creators",
    monthlyPrice: 299,
    annualPrice: 2490,
    credits: 500,
    features: [
      "500 credits/month",
      "All AI models",
      "Brand Voice",
      "Export (MD, TXT)",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For power users",
    monthlyPrice: 699,
    annualPrice: 5990,
    credits: 1500,
    badge: "Most Popular",
    features: [
      "1,500 credits/month",
      "All AI models",
      "Brand Voice",
      "Referral bonuses",
      "Content calendar",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For teams and agencies",
    monthlyPrice: 1499,
    annualPrice: 12990,
    credits: 5000,
    features: [
      "5,000 credits/month",
      "All AI models",
      "Brand Voice",
      "Referral bonuses",
      "Content calendar",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function annualSavings(plan: Plan): number {
  return plan.monthlyPrice * 12 - plan.annualPrice;
}
