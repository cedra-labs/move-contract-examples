export class CedraError extends Error {
  constructor(
    message: string,
    public code: string = "CEDRA_ERROR",
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "CedraError";
  }
}

export class InsufficientFundsError extends CedraError {
  constructor(available: number, required: number) {
    super(
      `Insufficient funds. Available: ${available}, Required: ${required}`,
      "INSUFFICIENT_FUNDS",
      { available, required }
    );
    this.name = "InsufficientFundsError";
  }
}

export class TransactionSimulationError extends CedraError {
  constructor(message: string, simulationOutput?: any) {
    super(message, "SIMULATION_FAILED", { simulationOutput });
    this.name = "TransactionSimulationError";
  }
}

export class TransactionTimeoutError extends CedraError {
  constructor(txHash: string, timeoutMs: number) {
    super(
      `Transaction ${txHash} not confirmed within ${timeoutMs}ms`,
      "TIMEOUT",
      { txHash, timeoutMs }
    );
    this.name = "TransactionTimeoutError";
  }
}

export class NetworkError extends CedraError {
  constructor(message: string, endpoint?: string) {
    super(message, "NETWORK_ERROR", { endpoint });
    this.name = "NetworkError";
  }
}

export class ConfigurationError extends CedraError {
  constructor(message: string, missingField?: string) {
    super(message, "CONFIG_ERROR", { missingField });
    this.name = "ConfigurationError";
  }
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): string {
    let msg = "";
    if (error instanceof CedraError) {
      msg = `❌ ${error.name}: ${error.message}`;
      if (error.context) {
        console.log("   Context:", JSON.stringify(error.context, null, 2));
      }
    } else if (error instanceof Error) {
      msg = `❌ Error: ${error.message}`;
    } else {
      msg = `❌ Unknown error: ${String(error)}`;
    }

    if (context) {
      console.log(`\n${context}`);
    }
    return msg;
  }

  static logError(error: unknown, context?: string): void {
    const message = this.handle(error, context);
    console.log(message);
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(
          `Attempt ${attempt} failed. Retrying in ${delayMs}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}
