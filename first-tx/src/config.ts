import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  network: "testnet" | "mainnet";
  rpcEndpoint?: string;
  transferAmount: number;
  faucetAmount: number;
  maxGasBudget: number;
  confirmationTimeoutMs: number;
  dryRun: boolean;
  waitForConfirmation: boolean;
}

export function loadConfig(): AppConfig {
  const network = (process.env.CEDRA_NETWORK || "testnet") as "testnet" | "mainnet";
  const rpcEndpoint = process.env.CEDRA_RPC_ENDPOINT;
  const transferAmount = parseInt(process.env.TRANSFER_AMOUNT || "100000000");
  const faucetAmount = parseInt(process.env.FAUCET_AMOUNT || "100000000");
  const maxGasBudget = parseInt(process.env.MAX_GAS_BUDGET || "50000000");
  const confirmationTimeoutMs = parseInt(
    process.env.CONFIRMATION_TIMEOUT_MS || "30000"
  );
  const dryRun = process.env.DRY_RUN === "true";
  const waitForConfirmation = process.env.WAIT_FOR_CONFIRMATION !== "false";

  return {
    network,
    rpcEndpoint,
    transferAmount,
    faucetAmount,
    maxGasBudget,
    confirmationTimeoutMs,
    dryRun,
    waitForConfirmation,
  };
}

export function validateConfig(config: AppConfig): void {
  if (!config.network) {
    throw new Error("CEDRA_NETWORK must be set to 'testnet' or 'mainnet'");
  }

  if (!["testnet", "mainnet"].includes(config.network)) {
    throw new Error(
      `Invalid network: ${config.network}. Must be 'testnet' or 'mainnet'`
    );
  }

  if (config.transferAmount <= 0) {
    throw new Error("TRANSFER_AMOUNT must be greater than 0");
  }

  if (config.faucetAmount <= 0) {
    throw new Error("FAUCET_AMOUNT must be greater than 0");
  }

  if (config.maxGasBudget <= 0) {
    throw new Error("MAX_GAS_BUDGET must be greater than 0");
  }

  if (config.confirmationTimeoutMs <= 0) {
    throw new Error("CONFIRMATION_TIMEOUT_MS must be greater than 0");
  }

  console.log("✅ Configuration validated");
}
