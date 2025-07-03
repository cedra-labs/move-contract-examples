import {
  Account,
  Cedra,
  CedraConfig,
  Network,
} from "@cedra-labs/ts-sdk";
  
async function main() {
  try {
    // Step 1: Initialize the CEDRA client
    console.log("=== Connecting to CEDRA ===");
    const config = new CedraConfig({ network: Network.TESTNET });
    const client = new Cedra(config);
    console.log("✅ Connected to CEDRA testnet");
    
    // Display network info
    const chainId = await client.getChainId();
    console.log(`Chain ID: ${chainId}`);
    console.log(`API Endpoint: ${config.fullnode}\n`);
    
    // Step 2: Generate test accounts
    console.log("=== Creating Accounts ===");
    const alice = Account.generate();
    const bob = Account.generate();
    
    console.log("Alice's address:", alice.accountAddress.toString());
    console.log("Alice's public key:", alice.publicKey.toString());
    console.log("\nBob's address:", bob.accountAddress.toString());
    console.log("Bob's public key:", bob.publicKey.toString());
    
    // Save private keys (in production, store these securely!)
    console.log("\n⚠️  Save these private keys for future use:");
    console.log("Alice's private key:", alice.privateKey.toString());
    console.log("Bob's private key:", bob.privateKey.toString());
    
    // Step 3: Fund Alice's account from faucet
    console.log("\n=== Funding Accounts ===");
    await client.faucet.fundAccount({
      accountAddress: alice.accountAddress,
      amount: 100_000_000, // 1 CEDRA = 100,000,000 sub-units
    });
    console.log("✅ Alice's account funded");
    
    // Check initial balances
    const aliceBalance = await client.getAccountCoinAmount({
      accountAddress: alice.accountAddress,
      coinType: "0x1::cedra_coin::CedraCoin",
    });
    
    const bobBalance = await client.getAccountCoinAmount({
      accountAddress: bob.accountAddress,
      coinType: "0x1::cedra_coin::CedraCoin",
    });
    
    console.log("\n=== Initial Balances ===");
    console.log(`Alice: ${aliceBalance} sub-units (${aliceBalance / 100_000_000} CEDRA)`);
    console.log(`Bob: ${bobBalance} sub-units (${bobBalance / 100_000_000} CEDRA)`);
    
    // Step 4: Build the transaction
    console.log("\n=== Building Transaction ===");
    const transaction = await client.transaction.build.simple({
      sender: alice.accountAddress,
      data: {
        function: "0x1::cedra_account::transfer",
        functionArguments: [
          bob.accountAddress,
          1000, // Transfer 1000 sub-units
        ],
      },
    });
    
    console.log("✅ Transaction built");
    console.log("Transaction details:");
    console.log(`  - Function: 0x1::cedra_account::transfer`);
    console.log(`  - Sender: ${alice.accountAddress}`);
    console.log(`  - Recipient: ${bob.accountAddress}`);
    console.log(`  - Amount: 1000 sub-units`);
    
    // Step 5: Simulate the transaction
    console.log("\n=== Simulating Transaction ===");
    const [simulationResult] = await client.transaction.simulate.simple({
      signerPublicKey: alice.publicKey,
      transaction,
    });
    
    const gasUsed = parseInt(simulationResult.gas_used);
    const gasUnitPrice = parseInt(simulationResult.gas_unit_price);
    const totalGasCost = gasUsed * gasUnitPrice;
    
    console.log("✅ Simulation complete");
    console.log(`  - Gas units used: ${gasUsed}`);
    console.log(`  - Gas unit price: ${gasUnitPrice}`);
    console.log(`  - Total gas cost: ${totalGasCost} sub-units`);
    console.log(`  - Status: ${simulationResult.success ? "✅ Will succeed" : "❌ Will fail"}`);
    
    if (!simulationResult.success) {
      console.error("Transaction simulation failed:", simulationResult.vm_status);
      return;
    }
    
    // Step 6: Sign the transaction
    console.log("\n=== Signing Transaction ===");
    const senderAuthenticator = await client.transaction.sign({
      signer: alice,
      transaction,
    });
    console.log("✅ Transaction signed");
    
    // Step 7: Submit the transaction
    console.log("\n=== Submitting Transaction ===");
    const pendingTransaction = await client.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });
    
    console.log("✅ Transaction submitted");
    console.log(`Transaction hash: ${pendingTransaction.hash}`);
    console.log(`View on explorer: https://explorer.testnet.cedra.network/txn/${pendingTransaction.hash}`);
    
    // Step 8: Wait for confirmation
    console.log("\n=== Waiting for Confirmation ===");
    const committedTransaction = await client.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });
    
    console.log("✅ Transaction confirmed");
    console.log(`  - Status: ${committedTransaction.success ? "SUCCESS" : "FAILED"}`);
    console.log(`  - Gas used: ${committedTransaction.gas_used}`);
    console.log(`  - VM Status: ${committedTransaction.vm_status}`);
    
    // Step 9: Verify final balances
    console.log("\n=== Final Balances ===");
    const aliceFinalBalance = await client.getAccountCoinAmount({
      accountAddress: alice.accountAddress,
      coinType: "0x1::cedra_coin::CedraCoin",
    });
    
    const bobFinalBalance = await client.getAccountCoinAmount({
      accountAddress: bob.accountAddress,
      coinType: "0x1::cedra_coin::CedraCoin",
    });
    
    console.log(`Alice: ${aliceFinalBalance} sub-units (spent ${aliceBalance - aliceFinalBalance})`);
    console.log(`Bob: ${bobFinalBalance} sub-units (received ${bobFinalBalance - bobBalance})`);
    
    const totalCost = aliceBalance - aliceFinalBalance;
    const gasCost = totalCost - 1000;
    console.log(`\nTransaction breakdown:`);
    console.log(`  - Transfer amount: 1000 sub-units`);
    console.log(`  - Gas fee: ${gasCost} sub-units`);
    console.log(`  - Total cost: ${totalCost} sub-units`);
    
    console.log("\n🎉 Congratulations! You've successfully completed your first CEDRA transaction!");
    
  } catch (error) {
    console.error("\n❌ Error occurred:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);