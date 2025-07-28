import {
  Account,
  Cedra,
  CedraConfig,
  Network,
} from "@cedra-labs/ts-sdk";

// ═══════════════════════════════════════════════════════════════════════════
// DEX Example on Cedra - Educational Implementation
// This example demonstrates how to interact with a DEX smart contract
// ═══════════════════════════════════════════════════════════════════════════

// Configuration
const NETWORK = Network.DEVNET;
const NODE_URL = "https://testnet.cedra.dev/v1";
const FAUCET_URL = "https://faucet-api.cedra.dev";

// Your deployed DEX module address
const MODULE_ADDRESS = "0xbeaeaff8da45012f8fff424eab43c39c5330cd8c1066cbe04542a91734468df8";

// Module references for easy access
const MODULES = {
  swap: `${MODULE_ADDRESS}::swap`,
  test_tokens: `${MODULE_ADDRESS}::test_tokens`,
  slippage: `${MODULE_ADDRESS}::slippage`,
  multihop: `${MODULE_ADDRESS}::multihop`,
  math_amm: `${MODULE_ADDRESS}::math_amm`,
};

// Initialize Cedra SDK
const config = new CedraConfig({
  network: NETWORK,
  fullnode: NODE_URL,
  faucet: FAUCET_URL
});
const cedra = new Cedra(config);

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

// Format token amounts for display (assumes 8 decimals)
function formatAmount(amount: number, symbol: string = ""): string {
  const formatted = (amount / 100_000_000).toFixed(4);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Display a separator line
function separator(title?: string): void {
  if (title) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  ${title}`);
    console.log(`${"═".repeat(70)}`);
  } else {
    console.log(`${"─".repeat(70)}`);
  }
}

// Display token balances in a nice format
async function displayBalances(
  account: string,
  tokens: Array<{ symbol: string; metadata: string; decimals: number }>
): Promise<void> {
  console.log("\n💰 Token Balances:");
  console.log("┌─────────┬──────────────────┐");
  console.log("│ Token   │ Balance          │");
  console.log("├─────────┼──────────────────┤");
  
  for (const token of tokens) {
    const balance = await getTokenBalance(account, token.metadata);
    const formatted = formatAmount(balance, token.symbol);
    console.log(`│ ${token.symbol.padEnd(7)} │ ${formatted.padStart(16)} │`);
  }
  
  console.log("└─────────┴──────────────────┘");
}

// Display pool information
async function displayPoolInfo(lpToken: string): Promise<void> {
  const [reserveX, reserveY] = await getReserves(lpToken);
  const price = reserveX > 0 ? reserveY / reserveX : 0;
  const tvl = reserveX + reserveY; // Simplified TVL calculation
  
  console.log("\n📊 Pool Information:");
  console.log(`   • Reserve X: ${formatAmount(reserveX)}`);
  console.log(`   • Reserve Y: ${formatAmount(reserveY)}`);
  console.log(`   • Price (Y/X): ${price.toFixed(6)}`);
  console.log(`   • TVL: ~${formatAmount(tvl)} (in base units)`);
  console.log(`   • K constant: ${(reserveX * reserveY).toLocaleString()}`);
}

// Fund account with test tokens
async function fundAccount(account: Account): Promise<void> {
  console.log(`\n💳 Funding account ${account.accountAddress.toString().slice(0, 6)}...`);
  await cedra.fundAccount({
    accountAddress: account.accountAddress,
    amount: 1_000_000_000, // 10 CEDRA
  });
  console.log("   ✓ Account funded with 10 CEDRA");
}

// ═══════════════════════════════════════════════════════════════════════════
// Core DEX Functions
// ═══════════════════════════════════════════════════════════════════════════

// Get token metadata address (for test tokens)
async function getTokenMetadata(tokenType: "ETH" | "BTC" | "USDC"): Promise<string> {
  const functionName = tokenType === "ETH" ? "get_eth_metadata" :
                      tokenType === "BTC" ? "get_btc_metadata" :
                      "get_usdc_metadata";
  
  const result = await cedra.view({
    payload: {
      function: `${MODULES.test_tokens}::${functionName}`,
      typeArguments: [],
      functionArguments: [],
    }
  });
  
  const metadata = result[0];
  if (typeof metadata === 'object' && metadata !== null && 'inner' in metadata) {
    const inner = metadata.inner as string;
    return inner.startsWith('0x') ? inner : `0x${inner}`;
  }
  return metadata.toString();
}

// Mint test tokens to an account
async function mintTestTokens(
  account: Account,
  tokenType: "ETH" | "BTC" | "USDC",
  amount: number
): Promise<void> {
  console.log(`\n🪙  Minting ${formatAmount(amount)} test${tokenType}...`);
  
  const functionName = tokenType === "ETH" ? "mint_eth" :
                      tokenType === "BTC" ? "mint_btc" :
                      "mint_usdc";
  
  const transaction = await cedra.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${MODULES.test_tokens}::${functionName}`,
      typeArguments: [],
      functionArguments: [amount],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`   ✓ Minted successfully (tx: ${pendingTxn.hash.slice(0, 10)}...)`);
}

// Get token balance
async function getTokenBalance(
  accountAddress: string,
  tokenMetadata: string
): Promise<number> {
  try {
    const result = await cedra.view({
      payload: {
        function: "0x1::primary_fungible_store::balance",
        typeArguments: ["0x1::fungible_asset::Metadata"],
        functionArguments: [accountAddress, tokenMetadata],
      }
    });
    return Number(result[0]);
  } catch (error) {
    return 0;
  }
}

// Create a new trading pair
async function createTradingPair(
  account: Account,
  tokenX: string,
  tokenY: string
): Promise<string> {
  console.log("\n🔄 Creating trading pair...");
  
  const transaction = await cedra.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${MODULES.swap}::create_pair_entry`,
      typeArguments: [],
      functionArguments: [tokenX, tokenY],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  const result = await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  
  // Extract LP token address from state changes
  let lpToken = "";
  if ('changes' in result && Array.isArray(result.changes)) {
    for (const change of result.changes) {
      if (change.type === 'write_resource') {
        const resourceType = change.data?.type || '';
        if (resourceType.includes('::swap::TradingPair')) {
          lpToken = change.address;
          break;
        }
      }
    }
  }
  
  console.log(`   ✓ Trading pair created`);
  console.log(`   • LP Token: ${lpToken}`);
  console.log(`   • Transaction: ${pendingTxn.hash.slice(0, 10)}...`);
  
  return lpToken;
}

// Get pool reserves
async function getReserves(lpMetadata: string): Promise<[number, number]> {
  try {
    const result = await cedra.view({
      payload: {
        function: `${MODULES.swap}::reserves`,
        typeArguments: [],
        functionArguments: [lpMetadata],
      }
    });
    
    if (Array.isArray(result) && result.length === 2) {
      return [Number(result[0]), Number(result[1])];
    }
    return [0, 0];
  } catch (error) {
    return [0, 0];
  }
}

// Add liquidity to a pool
async function addLiquidity(
  account: Account,
  lpToken: string,
  tokenX: string,
  tokenY: string,
  amountX: number,
  amountY: number,
  minAmountX?: number,
  minAmountY?: number
): Promise<void> {
  console.log(`\n💧 Adding liquidity: ${formatAmount(amountX)} + ${formatAmount(amountY)}...`);
  
  // If min amounts not specified, use 95% of desired (5% slippage tolerance)
  const actualMinX = minAmountX ?? Math.floor(amountX * 0.95);
  const actualMinY = minAmountY ?? Math.floor(amountY * 0.95);
  
  const transaction = await cedra.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${MODULES.swap}::add_liquidity`,
      typeArguments: [],
      functionArguments: [
        lpToken, 
        tokenX, 
        tokenY, 
        amountX, 
        amountY, 
        actualMinX,
        actualMinY
      ],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  
  const lpBalance = await getTokenBalance(account.accountAddress.toString(), lpToken);
  console.log(`   ✓ Liquidity added successfully`);
  console.log(`   • LP tokens received: ${formatAmount(lpBalance)}`);
  console.log(`   • Transaction: ${pendingTxn.hash.slice(0, 10)}...`);
}

// Execute a token swap
async function executeSwap(
  account: Account,
  lpToken: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  minAmountOut: number = 0
): Promise<number> {
  console.log(`\n🔄 Swapping ${formatAmount(amountIn)} tokens...`);
  
  // Get initial balance to calculate actual output
  const initialOutBalance = await getTokenBalance(account.accountAddress.toString(), tokenOut);
  
  const transaction = await cedra.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${MODULES.swap}::swap_exact_input`,
      typeArguments: [],
      functionArguments: [lpToken, tokenIn, tokenOut, amountIn, minAmountOut],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  
  const finalOutBalance = await getTokenBalance(account.accountAddress.toString(), tokenOut);
  const actualOutput = finalOutBalance - initialOutBalance;
  
  console.log(`   ✓ Swap completed`);
  console.log(`   • Amount out: ${formatAmount(actualOutput)}`);
  console.log(`   • Transaction: ${pendingTxn.hash.slice(0, 10)}...`);
  
  return actualOutput;
}

// Calculate expected output using AMM formula
async function calculateSwapOutput(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): Promise<number> {
  try {
    const [amountOut] = await cedra.view({
      payload: {
        function: `${MODULES.math_amm}::get_amount_out`,
        typeArguments: [],
        functionArguments: [amountIn, reserveIn, reserveOut],
      }
    });
    return Number(amountOut);
  } catch (error) {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Example Scenarios
// ═══════════════════════════════════════════════════════════════════════════

async function exampleSetupAndTokens() {
  separator("🏗️  Example 1: Setting Up Your DEX Environment");
  
  console.log("\n💡 Key Learning: Every DEX needs test tokens for development");
  console.log("   In production, you'll use real tokens with proper metadata.\n");
  
  // Create accounts
  const alice = Account.generate();
  const bob = Account.generate();
  
  console.log("📝 Creating test accounts:");
  console.log(`   • Alice: ${alice.accountAddress.toString()}`);
  console.log(`   • Bob: ${bob.accountAddress.toString()}`);
  
  // Fund accounts
  await fundAccount(alice);
  await fundAccount(bob);
  
  // Get token metadata addresses
  console.log("\n🔍 Getting token metadata addresses:");
  const ethMetadata = await getTokenMetadata("ETH");
  const btcMetadata = await getTokenMetadata("BTC");
  const usdcMetadata = await getTokenMetadata("USDC");
  
  console.log(`   • ETH: ${ethMetadata}`);
  console.log(`   • BTC: ${btcMetadata}`);
  console.log(`   • USDC: ${usdcMetadata}`);
  
  // Mint tokens
  await mintTestTokens(alice, "ETH", 1000_000_000); // 10 ETH
  await mintTestTokens(alice, "BTC", 500_000_000);  // 5 BTC
  await mintTestTokens(alice, "USDC", 10000_000_000); // 100 USDC
  
  await mintTestTokens(bob, "ETH", 500_000_000);   // 5 ETH
  await mintTestTokens(bob, "BTC", 250_000_000);   // 2.5 BTC
  await mintTestTokens(bob, "USDC", 5000_000_000); // 50 USDC
  
  // Display balances
  const tokens = [
    { symbol: "ETH", metadata: ethMetadata, decimals: 8 },
    { symbol: "BTC", metadata: btcMetadata, decimals: 8 },
    { symbol: "USDC", metadata: usdcMetadata, decimals: 8 }
  ];
  
  console.log("\n👤 Alice's tokens:");
  await displayBalances(alice.accountAddress.toString(), tokens);
  
  console.log("\n👤 Bob's tokens:");
  await displayBalances(bob.accountAddress.toString(), tokens);
  
  return { alice, bob, ethMetadata, btcMetadata, usdcMetadata, tokens };
}

async function exampleCreatePair(alice: Account, tokenX: string, tokenY: string) {
  separator("🏗️  Example 2: Creating a Trading Pair");
  
  console.log("\n💡 Key Learning: Trading pairs are the foundation of DEX");
  console.log("   Each pair has its own LP token that represents pool ownership.\n");
  
  const lpToken = await createTradingPair(alice, tokenX, tokenY);
  
  // Show initial state
  await displayPoolInfo(lpToken);
  
  console.log("\n📝 Note: New pairs start with 0 reserves until liquidity is added");
  
  return lpToken;
}

async function exampleFirstLiquidity(
  alice: Account, 
  lpToken: string, 
  tokenX: string, 
  tokenY: string,
  amountX: number,
  amountY: number
) {
  separator("💧 Example 3: Adding Your First Liquidity");
  
  console.log("\n💡 Key Learning: First liquidity provider sets the initial price");
  console.log("   LP tokens = sqrt(amountX * amountY)\n");
  
  // Show the calculation
  const expectedLP = Math.floor(Math.sqrt(amountX * amountY));
  console.log("📐 LP Token Calculation:");
  console.log(`   sqrt(${formatAmount(amountX)} * ${formatAmount(amountY)}) = ${formatAmount(expectedLP)} LP`);
  
  await addLiquidity(alice, lpToken, tokenX, tokenY, amountX, amountY);
  await displayPoolInfo(lpToken);
}

async function exampleAddMoreLiquidity(
  bob: Account,
  lpToken: string,
  tokenX: string,
  tokenY: string,
  desiredX: number,
  desiredY: number
) {
  separator("💧 Example 4: Adding Liquidity to Existing Pool");
  
  console.log("\n💡 Key Learning: Subsequent liquidity must match pool ratio");
  console.log("   The AMM will only take the amounts that maintain the ratio.\n");
  
  const [reserveX, reserveY] = await getReserves(lpToken);
  const currentRatio = reserveY / reserveX;
  
  console.log("📊 Current Pool State:");
  console.log(`   • Ratio: 1 X = ${currentRatio.toFixed(4)} Y`);
  
  const optimalY = Math.floor((desiredX * reserveY) / reserveX);
  const optimalX = Math.floor((desiredY * reserveX) / reserveY);
  
  console.log(`\n📐 Optimal amounts calculation:`);
  console.log(`   • For ${formatAmount(desiredX)} X, optimal Y = ${formatAmount(optimalY)}`);
  console.log(`   • For ${formatAmount(desiredY)} Y, optimal X = ${formatAmount(optimalX)}`);
  
  // Determine which token will be the limiting factor
  let actualX, actualY, minX, minY;
  if (desiredY > optimalY) {
    // Y is excess, X is limiting
    actualX = desiredX;
    actualY = optimalY;
    minX = desiredX;
    minY = optimalY;
    console.log(`   • Using X as base: ${formatAmount(actualX)} X + ${formatAmount(actualY)} Y`);
    console.log(`   • Excess Y returned: ${formatAmount(desiredY - actualY)}`);
  } else {
    // X is excess, Y is limiting
    actualX = optimalX;
    actualY = desiredY;
    minX = optimalX;
    minY = desiredY;
    console.log(`   • Using Y as base: ${formatAmount(actualX)} X + ${formatAmount(actualY)} Y`);
    console.log(`   • Excess X returned: ${formatAmount(desiredX - actualX)}`);
  }
  
  await addLiquidity(bob, lpToken, tokenX, tokenY, desiredX, desiredY, minX, minY);
  await displayPoolInfo(lpToken);
}

async function exampleBasicSwap(
  bob: Account,
  lpToken: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  tokenInSymbol: string,
  tokenOutSymbol: string
) {
  separator("🔄 Example 5: Executing Token Swaps");
  
  console.log("\n💡 Key Learning: AMM uses constant product formula (x * y = k)");
  console.log("   Each swap includes a 0.3% fee that stays in the pool.\n");
  
  const [reserveIn, reserveOut] = await getReserves(lpToken);
  const expectedOut = await calculateSwapOutput(amountIn, reserveIn, reserveOut);
  
  console.log("📐 Swap Calculation:");
  console.log(`   • Input: ${formatAmount(amountIn, tokenInSymbol)}`);
  console.log(`   • Expected output: ${formatAmount(expectedOut, tokenOutSymbol)}`);
  console.log(`   • Price impact: ${((amountIn / reserveIn) * 100).toFixed(2)}%`);
  
  const actualOut = await executeSwap(bob, lpToken, tokenIn, tokenOut, amountIn);
  
  console.log("\n📊 Swap Results:");
  console.log(`   • Expected: ${formatAmount(expectedOut, tokenOutSymbol)}`);
  console.log(`   • Actual: ${formatAmount(actualOut, tokenOutSymbol)}`);
  console.log(`   • Effective price: ${(amountIn / actualOut).toFixed(6)} ${tokenInSymbol}/${tokenOutSymbol}`);
  
  await displayPoolInfo(lpToken);
}

async function examplePriceImpact(
  lpToken: string
) {
  separator("📈 Example 6: Understanding Price Impact");
  
  console.log("\n💡 Key Learning: Larger trades have exponentially higher price impact");
  console.log("   Always consider slippage protection for large trades.\n");
  
  const [reserveIn, reserveOut] = await getReserves(lpToken);
  
  // Calculate impact for different trade sizes
  const tradeSizes = [
    { percent: 0.1, amount: Math.floor(reserveIn * 0.001) },   // 0.1% of pool
    { percent: 1, amount: Math.floor(reserveIn * 0.01) },      // 1% of pool
    { percent: 10, amount: Math.floor(reserveIn * 0.1) },      // 10% of pool
  ];
  
  console.log("📊 Price Impact Analysis:");
  console.log("┌──────────┬─────────────┬─────────────┬─────────────┐");
  console.log("│ % Pool   │ Input       │ Output      │ Impact      │");
  console.log("├──────────┼─────────────┼─────────────┼─────────────┤");
  
  for (const trade of tradeSizes) {
    const output = await calculateSwapOutput(trade.amount, reserveIn, reserveOut);
    const spotPrice = reserveOut / reserveIn;
    const executionPrice = output / trade.amount;
    const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100;
    
    console.log(
      `│ ${trade.percent.toString().padEnd(8)} │ ${formatAmount(trade.amount).padEnd(11)} │ ${formatAmount(output).padEnd(11)} │ ${priceImpact.toFixed(2).padStart(10)}% │`
    );
  }
  
  console.log("└──────────┴─────────────┴─────────────┴─────────────┘");
  
  console.log("\n⚠️  Notice how price impact increases non-linearly!");
}

async function exampleErrorHandling(
  bob: Account,
  lpToken: string,
  tokenIn: string,
  tokenOut: string
) {
  separator("⚠️  Example 7: Common Errors and How to Handle Them");
  
  console.log("\n💡 Key Learning: Always validate inputs and handle errors gracefully\n");
  
  // Example 1: Zero amount swap
  console.log("❌ Attempting to swap 0 tokens:");
  try {
    await executeSwap(bob, lpToken, tokenIn, tokenOut, 0);
  } catch (error: any) {
    console.log(`   Error caught: ${error.message || error}`);
    console.log("   ✓ This is expected - DEX rejects zero amounts");
  }
  
  // Example 2: Insufficient balance
  console.log("\n❌ Attempting to swap more than balance:");
  const balance = await getTokenBalance(bob.accountAddress.toString(), tokenIn);
  try {
    await executeSwap(bob, lpToken, tokenIn, tokenOut, balance * 2);
  } catch (error: any) {
    console.log(`   Error caught: Insufficient balance`);
    console.log("   ✓ This is expected - Can't swap more than you have");
  }
  
  // Example 3: Slippage protection
  console.log("\n✅ Using slippage protection:");
  const swapAmount = Math.floor(balance * 0.1); // 10% of balance
  const [reserveIn, reserveOut] = await getReserves(lpToken);
  const expectedOut = await calculateSwapOutput(swapAmount, reserveIn, reserveOut);
  const minAcceptable = Math.floor(expectedOut * 0.97); // 3% slippage tolerance
  
  console.log(`   • Expected output: ${formatAmount(expectedOut)}`);
  console.log(`   • Minimum acceptable: ${formatAmount(minAcceptable)} (3% slippage)`);
  console.log("   • This protects against front-running and price changes");
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Demo Runner
// ═══════════════════════════════════════════════════════════════════════════

async function runDexExample() {
  console.log("╔═══════════════════════════════════════════════════════════════════════╗");
  console.log("║                    DEX Example on Cedra Network                       ║");
  console.log("║                 Learn by Building Your Own DEX!                       ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════╝");
  
  console.log(`\n📍 Module Address: ${MODULE_ADDRESS}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`🔗 Node URL: ${NODE_URL}\n`);
  
  try {
    // Run all examples in sequence
    const { alice, bob, ethMetadata, btcMetadata, tokens } = await exampleSetupAndTokens();
    
    const lpETHBTC = await exampleCreatePair(alice, ethMetadata, btcMetadata);
    
    await exampleFirstLiquidity(alice, lpETHBTC, ethMetadata, btcMetadata, 
      100_000_000,  // 1 ETH
      50_000_000    // 0.5 BTC (implying 1 ETH = 0.5 BTC initial price)
    );
    
    await exampleAddMoreLiquidity(bob, lpETHBTC, ethMetadata, btcMetadata,
      50_000_000,   // 0.5 ETH desired
      30_000_000    // 0.3 BTC desired (more than needed)
    );
    
    await exampleBasicSwap(bob, lpETHBTC, ethMetadata, btcMetadata, 
      10_000_000,   // 0.1 ETH
      "ETH", "BTC"
    );
    
    await examplePriceImpact(lpETHBTC);
    
    await exampleErrorHandling(bob, lpETHBTC, ethMetadata, btcMetadata);
    
    // Final state
    separator("🎉 Final State");
    
    console.log("\n📊 Final Pool State:");
    await displayPoolInfo(lpETHBTC);
    
    console.log("\n👤 Final Balances - Alice:");
    await displayBalances(alice.accountAddress.toString(), tokens);
    
    console.log("\n👤 Final Balances - Bob:");
    await displayBalances(bob.accountAddress.toString(), tokens);
    
    console.log("\n✅ Congratulations! You've learned the basics of DEX development!");
    console.log("\n📚 Next Steps:");
    console.log("   1. Try modifying swap amounts and observe price impacts");
    console.log("   2. Implement multi-hop swaps for better routing");
    console.log("   3. Add advanced features like limit orders or yield farming");
    console.log("   4. Deploy your own DEX with custom tokenomics!");
    
  } catch (error) {
    console.error("\n❌ Example failed:", error);
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Ensure the DEX contract is deployed at the correct address");
    console.log("   2. Check network connectivity to Cedra testnet");
    console.log("   3. Verify test tokens module is properly initialized");
  }
}

// Run the example
runDexExample().catch(console.error);