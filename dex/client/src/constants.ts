// Token symbols
export const TOKENS = {
  ETH: "ETH" as const,
  BTC: "BTC" as const,
  USDC: "USDC" as const
};

// Token decimals
export const TOKEN_DECIMALS = 8;

// Slippage constants
export const DEFAULT_SLIPPAGE_PERCENT = 5;
export const MAX_SLIPPAGE_PERCENT = 3;

// Fee constants
export const SWAP_FEE_BPS = 30; // 0.3% = 30 basis points