/** Credits deducted per generation, based on model tier. */
export const GENERATION_COST = {
  free_model: 5,   // model IDs ending in :free
  paid_model: 10,  // everything else
};

export function getGenerationCost(modelId: string): number {
  return modelId.includes(":free") ? GENERATION_COST.free_model : GENERATION_COST.paid_model;
}

/** One-time credit packs available for purchase. */
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number; // INR
  badge?: string;
  perCredit: string; // display string
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_500",
    name: "Starter Pack",
    credits: 500,
    price: 249,
    perCredit: "₹0.50/credit",
  },
  {
    id: "pack_2000",
    name: "Pro Pack",
    credits: 2000,
    price: 799,
    badge: "Best Value",
    perCredit: "₹0.40/credit",
  },
  {
    id: "pack_5000",
    name: "Power Pack",
    credits: 5000,
    price: 1799,
    perCredit: "₹0.36/credit",
  },
];

/** Free credits awarded to new users on signup. */
export const FREE_SIGNUP_CREDITS = 50;
