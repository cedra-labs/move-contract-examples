import { Account } from "@cedra-labs/ts-sdk";
import { NETWORK, MODULE_ADDRESS, NODE_URL } from "./config";
import { TOKENS, TOKEN_DECIMALS, MAX_SLIPPAGE_PERCENT } from "./constants";
import {
  separator,
  formatAmount,
  displayBalances,
  displayPoolInfo,
  fundAccount,
  getTokenMetadata,
  mintTestTokens,
  getTokenBalance,
  createTradingPair,
  getReserves,
  addLiquidity,
  executeSwap,
  calculateSwapOutput
} from "./dex";

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
  const ethMetadata = await getTokenMetadata(TOKENS.ETH);
  const btcMetadata = await getTokenMetadata(TOKENS.BTC);
  const usdcMetadata = await getTokenMetadata(TOKENS.USDC);
  
  console.log(`   • ${TOKENS.ETH}: ${ethMetadata}`);
  console.log(`   • ${TOKENS.BTC}: ${btcMetadata}`);
  console.log(`   • ${TOKENS.USDC}: ${usdcMetadata}`);
  
  // Mint tokens
  await mintTestTokens(alice, TOKENS.ETH, 1000_000_000); // 10 ETH
  await mintTestTokens(alice, TOKENS.BTC, 500_000_000);  // 5 BTC
  await mintTestTokens(alice, TOKENS.USDC, 10000_000_000); // 100 USDC
  
  await mintTestTokens(bob, TOKENS.ETH, 500_000_000);   // 5 ETH
  await mintTestTokens(bob, TOKENS.BTC, 250_000_000);   // 2.5 BTC
  await mintTestTokens(bob, TOKENS.USDC, 5000_000_000); // 50 USDC
  
  // Display balances
  const tokens = [
    { symbol: TOKENS.ETH, metadata: ethMetadata, decimals: TOKEN_DECIMALS },
    { symbol: TOKENS.BTC, metadata: btcMetadata, decimals: TOKEN_DECIMALS },
    { symbol: TOKENS.USDC, metadata: usdcMetadata, decimals: TOKEN_DECIMALS }
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

async function examplePriceImpact(lpToken: string) {
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
  const slippageFactor = 1 - (MAX_SLIPPAGE_PERCENT / 100);
  const minAcceptable = Math.floor(expectedOut * slippageFactor);
  
  console.log(`   • Expected output: ${formatAmount(expectedOut)}`);
  console.log(`   • Minimum acceptable: ${formatAmount(minAcceptable)} (${MAX_SLIPPAGE_PERCENT}% slippage)`);
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
      TOKENS.ETH, TOKENS.BTC
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