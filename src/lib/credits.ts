/** Free tokens awarded to new users on signup. */
export const FREE_SIGNUP_TOKENS = 50_000;

/** Minimum token balance required to start a generation. */
export const MIN_TOKENS_TO_GENERATE = 100;

/** Balance below which the "running low" warning is shown. */
export const LOW_TOKEN_THRESHOLD = 10_000;

/** @deprecated kept for any remaining references during migration */
export const FREE_SIGNUP_CREDITS = FREE_SIGNUP_TOKENS;

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number; // INR
  badge?: string;
  perKTokens: string;
}

export const TOKEN_PACKS: TokenPack[] = [
  {
    id: "pack_100k",
    name: "Starter Pack",
    tokens: 100_000,
    price: 99,
    perKTokens: "₹0.99 / 1K tokens",
  },
  {
    id: "pack_500k",
    name: "Pro Pack",
    tokens: 500_000,
    price: 399,
    badge: "Best Value",
    perKTokens: "₹0.80 / 1K tokens",
  },
  {
    id: "pack_2m",
    name: "Power Pack",
    tokens: 2_000_000,
    price: 1299,
    perKTokens: "₹0.65 / 1K tokens",
  },
];

/** @deprecated Use TOKEN_PACKS */
export const CREDIT_PACKS = TOKEN_PACKS;

/** @deprecated flat-rate cost no longer used; tokens are charged by actual usage */
export function getGenerationCost(_modelId: string): number { return 0; }
export const GENERATION_COST = { free_model: 0, paid_model: 0 };
