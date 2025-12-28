import {
  Account,
  Cedra,
  CedraConfig,
  Network,
} from "@cedra-labs/ts-sdk";

export interface TransactionConfig {
  dryRun?: boolean;
  waitForConfirmation?: boolean;
  confirmationTimeoutMs?: number;
}

export interface GasAnalysis {
  gasUnitsUsed: number;
  gasUnitPrice: number;
  totalGasCost: number;
  estimatedCostInCedra: number;
}

export async function initializeCedraClient(
  network: "testnet" | "mainnet" = "testnet",
  customRpcEndpoint?: string
): Promise<Cedra> {
  const config = new CedraConfig({
    network: network === "mainnet" ? Network.MAINNET : Network.TESTNET,
    fullnode: customRpcEndpoint,
  });

  const client = new Cedra(config);

  try {
    const chainId = await client.getChainId();
    console.log(`✅ Connected to ${network} (Chain ID: ${chainId})`);
    return client;
  } catch (error) {
    throw new Error(`Failed to connect to CEDRA ${network}: ${error}`);
  }
}

export async function getBalance(
  client: Cedra,
  address: string,
  coinType: `${string}::${string}::${string}` = "0x1::cedra_coin::CedraCoin"
): Promise<{ subUnits: bigint; cedra: number }> {
  try {
    const balance = await client.getAccountCoinAmount({
      accountAddress: address,
      coinType,
    });

    return {
      subUnits: BigInt(balance),
      cedra: Number(balance) / 100_000_000,
    };
  } catch (error) {
    throw new Error(`Failed to get balance for ${address}: ${error}`);
  }
}

export async function fundFromFaucet(
  client: Cedra,
  address: string,
  amount: number = 100_000_000,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Funding attempt ${attempt}/${maxRetries}...`);
      await client.faucet.fundAccount({
        accountAddress: address,
        amount,
      });
      console.log(
        `✅ Account funded: ${(amount / 100_000_000).toFixed(2)} CEDRA`
      );
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        console.log(
          `⚠️  Faucet attempt ${attempt} failed. Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Failed to fund account after ${maxRetries} attempts: ${lastError}`);
}

export function analyzeGas(simulationResult: any): GasAnalysis {
  const gasUnitsUsed = parseInt(simulationResult.gas_used);
  const gasUnitPrice = parseInt(simulationResult.gas_unit_price);
  const totalGasCost = gasUnitsUsed * gasUnitPrice;

  return {
    gasUnitsUsed,
    gasUnitPrice,
    totalGasCost,
    estimatedCostInCedra: totalGasCost / 100_000_000,
  };
}

export function estimateTransactionCost(
  transferAmount: number,
  gasAnalysis: GasAnalysis
): { transferAmount: number; gasCost: number; totalCost: number } {
  return {
    transferAmount,
    gasCost: gasAnalysis.totalGasCost,
    totalCost: transferAmount + gasAnalysis.totalGasCost,
  };
}

export function validateBalance(
  availableBalance: bigint,
  requiredAmount: number
): { valid: boolean; message: string } {
  if (availableBalance >= BigInt(requiredAmount)) {
    return {
      valid: true,
      message: `Sufficient balance: ${(Number(availableBalance) / 100_000_000).toFixed(2)} CEDRA available`,
    };
  }

  return {
    valid: false,
    message: `Insufficient balance. Required: ${(requiredAmount / 100_000_000).toFixed(2)} CEDRA, Available: ${(Number(availableBalance) / 100_000_000).toFixed(2)} CEDRA`,
  };
}

export function accountFromPrivateKey(privateKeyStr: string): Account {
  try {
    const account = Account.fromPrivateKey({
      privateKey: privateKeyStr,
    } as any);
    return account;
  } catch (error) {
    throw new Error(`Failed to parse private key: ${error}`);
  }
}

export function formatBalance(subUnits: number | bigint): string {
  const cedra = Number(subUnits) / 100_000_000;
  return `${cedra.toFixed(4)} CEDRA (${subUnits} sub-units)`;
}

export function printAccountDetails(label: string, account: Account): void {
  console.log(`\n${label}:`);
  console.log(`  Address: ${account.accountAddress.toString()}`);
  console.log(`  Public Key: ${account.publicKey.toString()}`);
}

export function printTransactionSummary(
  sender: string,
  recipient: string,
  transferAmount: number,
  gas: GasAnalysis
): void {
  console.log("\n=== Transaction Summary ===");
  console.log(`Sender: ${sender}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Transfer: ${(transferAmount / 100_000_000).toFixed(2)} CEDRA`);
  console.log(`Gas Units: ${gas.gasUnitsUsed}`);
  console.log(`Gas Unit Price: ${gas.gasUnitPrice}`);
  console.log(`Gas Fee: ${gas.estimatedCostInCedra.toFixed(6)} CEDRA`);
  console.log(
    `Total Cost: ${((transferAmount + gas.totalGasCost) / 100_000_000).toFixed(6)} CEDRA`
  );
}

export function getExplorerUrl(
  txHash: string,
  network: "testnet" | "mainnet" = "testnet"
): string {
  const domain =
    network === "mainnet"
      ? "https://explorer.cedra.network"
      : "https://explorer.testnet.cedra.network";
  return `${domain}/txn/${txHash}`;
}
