import { Account } from "@cedra-labs/ts-sdk";
import { loadConfig, validateConfig } from "./config";
import {
  initializeCedraClient,
  getBalance,
  fundFromFaucet,
  analyzeGas,
  estimateTransactionCost,
  validateBalance,
  accountFromPrivateKey,
  formatBalance,
  printAccountDetails,
  printTransactionSummary,
  getExplorerUrl,
} from "./utils";
import {
  ErrorHandler,
  TransactionSimulationError,
  InsufficientFundsError,
  retryWithBackoff,
  withTimeout,
} from "./errors";

async function main() {
  try {
    console.log("🔧 Loading configuration...\n");
    const appConfig = loadConfig();
    validateConfig(appConfig);

    console.log(`📋 Configuration loaded:`);
    console.log(`  Network: ${appConfig.network}`);
    console.log(`  Transfer amount: ${(appConfig.transferAmount / 100_000_000).toFixed(2)} CEDRA`);
    console.log(`  Dry run: ${appConfig.dryRun ? "✅ Yes" : "❌ No"}`);
    console.log();

    console.log("=== Connecting to CEDRA ===");
    const client = await initializeCedraClient(
      appConfig.network,
      appConfig.rpcEndpoint
    );
    console.log(`API Endpoint: ${appConfig.rpcEndpoint || "default"}\n`);

    console.log("=== Account Setup ===");
    let alice: Account;
    let bob: Account;

    const alicePrivateKey = process.env.ALICE_PRIVATE_KEY;
    const bobPrivateKey = process.env.BOB_PRIVATE_KEY;

    if (alicePrivateKey && bobPrivateKey) {
      console.log("Using accounts from environment variables...");
      alice = accountFromPrivateKey(alicePrivateKey);
      bob = accountFromPrivateKey(bobPrivateKey);
    } else {
      console.log("Generating new test accounts...");
      alice = Account.generate();
      bob = Account.generate();

      console.log("\n⚠️  IMPORTANT: Save your private keys securely for future use.");
      console.log("Store these credentials in your .env file.");
    }

    printAccountDetails("Alice (Sender)", alice);
    printAccountDetails("Bob (Recipient)", bob);
    console.log();

    console.log("=== Funding Alice's Account ===");
    await retryWithBackoff(
      () =>
        fundFromFaucet(client, alice.accountAddress.toString(), appConfig.faucetAmount),
      3,
      1000
    );
    console.log();

    console.log("=== Initial Balances ===");
    const aliceBalance = await getBalance(
      client,
      alice.accountAddress.toString()
    );
    const bobBalance = await getBalance(
      client,
      bob.accountAddress.toString()
    );

    console.log(`Alice: ${formatBalance(aliceBalance.subUnits)}`);
    console.log(`Bob: ${formatBalance(bobBalance.subUnits)}\n`);

    const balanceValidation = validateBalance(
      aliceBalance.subUnits,
      appConfig.transferAmount
    );
    if (!balanceValidation.valid) {
      throw new InsufficientFundsError(
        appConfig.transferAmount,
        Number(aliceBalance.subUnits)
      );
    }
    console.log(`✅ ${balanceValidation.message}\n`);

    console.log("=== Building Transaction ===");
    const transaction = await client.transaction.build.simple({
      sender: alice.accountAddress,
      data: {
        function: "0x1::cedra_account::transfer",
        functionArguments: [
          bob.accountAddress,
          appConfig.transferAmount,
        ],
      },
    });

    console.log("✅ Transaction built\n");

    console.log("=== Simulating Transaction ===");
    const [simulationResult] = await client.transaction.simulate.simple({
      signerPublicKey: alice.publicKey,
      transaction,
    });

    const gasAnalysis = analyzeGas(simulationResult);
    const costEstimate = estimateTransactionCost(
      appConfig.transferAmount,
      gasAnalysis
    );

    console.log("✅ Simulation complete\n");
    printTransactionSummary(
      alice.accountAddress.toString(),
      bob.accountAddress.toString(),
      appConfig.transferAmount,
      gasAnalysis
    );

    if (!simulationResult.success) {
      throw new TransactionSimulationError(simulationResult.vm_status);
    }

    const totalNeeded = costEstimate.totalCost;
    if (aliceBalance.subUnits < BigInt(totalNeeded)) {
      throw new InsufficientFundsError(
        totalNeeded,
        Number(aliceBalance.subUnits)
      );
    }

    console.log(`✅ Simulation successful - transaction will succeed\n`);

    if (appConfig.dryRun) {
      console.log("🏁 DRY RUN MODE: Transaction simulation complete.");
      console.log("Remove DRY_RUN=true to submit the transaction.");
      return;
    }

    console.log("=== Signing Transaction ===");
    const senderAuthenticator = await client.transaction.sign({
      signer: alice,
      transaction,
    });
    console.log("✅ Transaction signed\n");

    console.log("=== Submitting Transaction ===");
    const pendingTransaction = await client.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    console.log("✅ Transaction submitted");
    console.log(`Transaction hash: ${pendingTransaction.hash}`);
    const explorerUrl = getExplorerUrl(pendingTransaction.hash, appConfig.network);
    console.log(`View on explorer: ${explorerUrl}\n`);

    if (!appConfig.waitForConfirmation) {
      console.log("⏭️  Skipping confirmation (WAIT_FOR_CONFIRMATION=false)");
      console.log("\nℹ️  Transaction submitted but not confirmed.");
      console.log(`Use the explorer link to check the status: ${explorerUrl}`);
      return;
    }

    console.log("=== Waiting for Confirmation ===");
    const committedTransaction = await withTimeout(
      client.waitForTransaction({
        transactionHash: pendingTransaction.hash,
      }),
      appConfig.confirmationTimeoutMs,
      `Transaction confirmation timeout after ${appConfig.confirmationTimeoutMs}ms`
    ) as any;

    console.log("✅ Transaction confirmed\n");
    console.log(`  Status: ${committedTransaction.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`  Gas used: ${committedTransaction.gas_used}`);
    console.log(`  VM Status: ${committedTransaction.vm_status}`);

    console.log("\n=== Final Balances ===");
    const aliceFinalBalance = await getBalance(
      client,
      alice.accountAddress.toString()
    );
    const bobFinalBalance = await getBalance(
      client,
      bob.accountAddress.toString()
    );

    console.log(`Alice: ${formatBalance(aliceFinalBalance.subUnits)}`);
    console.log(`Bob: ${formatBalance(bobFinalBalance.subUnits)}\n`);

    const aliceSpent = Number(aliceBalance.subUnits) - Number(aliceFinalBalance.subUnits);
    const bobReceived = Number(bobFinalBalance.subUnits) - Number(bobBalance.subUnits);
    const actualGasCost = aliceSpent - appConfig.transferAmount;

    console.log("=== Transaction Breakdown ===");
    console.log(`Transfer amount: ${(appConfig.transferAmount / 100_000_000).toFixed(2)} CEDRA`);
    console.log(`Actual gas fee: ${(actualGasCost / 100_000_000).toFixed(6)} CEDRA`);
    console.log(`Total cost: ${(aliceSpent / 100_000_000).toFixed(6)} CEDRA`);
    console.log(`Bob received: ${(bobReceived / 100_000_000).toFixed(2)} CEDRA\n`);

    console.log("=== Gas Efficiency ===");
    console.log(`Estimated gas cost: ${gasAnalysis.estimatedCostInCedra.toFixed(6)} CEDRA`);
    console.log(`Actual gas cost: ${(actualGasCost / 100_000_000).toFixed(6)} CEDRA`);
    const difference = actualGasCost - gasAnalysis.totalGasCost;
    const differencePercent = (difference / gasAnalysis.totalGasCost) * 100;
    console.log(`Difference: ${difference > 0 ? "+" : ""}${(difference / 100_000_000).toFixed(6)} CEDRA (${differencePercent > 0 ? "+" : ""}${differencePercent.toFixed(2)}%)\n`);

    console.log("🎉 Congratulations! You've successfully completed your first CEDRA transaction!");
    console.log(`📊 Explorer: ${explorerUrl}`);
  } catch (error) {
    ErrorHandler.handle(error, "Transaction execution");
  }
}

main();
