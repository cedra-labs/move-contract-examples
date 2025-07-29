import { Account } from "@cedra-labs/ts-sdk";
import { cedra, MODULES } from "./config";
import { TOKEN_DECIMALS, TOKENS, DEFAULT_SLIPPAGE_PERCENT } from "./constants";

// ═══════════════════════════════════════════════════════════════════════════
// Display Utilities
// ═══════════════════════════════════════════════════════════════════════════

// Format token amounts for display
export function formatAmount(amount: number, symbol: string = ""): string {
  const formatted = (amount / Math.pow(10, TOKEN_DECIMALS)).toFixed(4);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Display a separator line
export function separator(title?: string): void {
  if (title) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  ${title}`);
    console.log(`${"═".repeat(70)}`);
  } else {
    console.log(`${"─".repeat(70)}`);
  }
}

// Display token balances in a nice format
export async function displayBalances(
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
export async function displayPoolInfo(lpToken: string): Promise<void> {
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

// ═══════════════════════════════════════════════════════════════════════════
// Account & Token Operations
// ═══════════════════════════════════════════════════════════════════════════

// Fund account with test tokens
export async function fundAccount(account: Account): Promise<void> {
  console.log(`\n💳 Funding account ${account.accountAddress.toString().slice(0, 6)}...`);
  await cedra.fundAccount({
    accountAddress: account.accountAddress,
    amount: 1_000_000_000, // 10 CEDRA
  });
  console.log("   ✓ Account funded with 10 CEDRA");
}

// Get token metadata address (for test tokens)
export async function getTokenMetadata(tokenType: keyof typeof TOKENS): Promise<string> {
  const functionName = tokenType === TOKENS.ETH ? "get_eth_metadata" :
                      tokenType === TOKENS.BTC ? "get_btc_metadata" :
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
export async function mintTestTokens(
  account: Account,
  tokenType: keyof typeof TOKENS,
  amount: number
): Promise<void> {
  console.log(`\n🪙  Minting ${formatAmount(amount)} test${tokenType}...`);
  
  const functionName = tokenType === TOKENS.ETH ? "mint_eth" :
                      tokenType === TOKENS.BTC ? "mint_btc" :
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
export async function getTokenBalance(
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

// ═══════════════════════════════════════════════════════════════════════════
// Pool Operations
// ═══════════════════════════════════════════════════════════════════════════

// Create a new trading pair
export async function createTradingPair(
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
export async function getReserves(lpMetadata: string): Promise<[number, number]> {
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
export async function addLiquidity(
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
  
  // If min amounts not specified, use default slippage tolerance
  const slippageFactor = 1 - (DEFAULT_SLIPPAGE_PERCENT / 100);
  const actualMinX = minAmountX ?? Math.floor(amountX * slippageFactor);
  const actualMinY = minAmountY ?? Math.floor(amountY * slippageFactor);
  
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

// ═══════════════════════════════════════════════════════════════════════════
// Swap Operations
// ═══════════════════════════════════════════════════════════════════════════

// Execute a token swap
export async function executeSwap(
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
export async function calculateSwapOutput(
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