import {
  Account,
  Cedra,
  CedraConfig,
  Network,
  Ed25519PrivateKey,
  InputViewFunctionData,
  MoveValue,
} from "@cedra-labs/ts-sdk";

// Constants
const NETWORK = Network.DEVNET;
const NODE_URL = "https://testnet.cedra.dev/v1";
const FAUCET_URL = "https://faucet-api.cedra.dev";

// Module addresses - our deployed DEX
const MODULE_ADDRESS = "0xfb2b31a794c110bf17092e39a63e72a88ecb4d6521fd6e05aeab1a15d5402154";
const MODULES = {
  math_amm: `${MODULE_ADDRESS}::math_amm`,
  swap: `${MODULE_ADDRESS}::swap`,
  slippage: `${MODULE_ADDRESS}::slippage`,
  multihop: `${MODULE_ADDRESS}::multihop`,
  test_tokens: `${MODULE_ADDRESS}::test_tokens`
};

// Our test tokens - these are non-deletable and work with the DEX!
const ASSET_TYPES = {
  ETH: "TestETH", // Our test ETH token
  BTC: "TestBTC", // Our test BTC token
  CEDRA: "0x1::cedra_coin::CedraCoin" // Native CEDRA (not used in demo)
};

// Initialize SDK
const config = new CedraConfig({
  network: NETWORK,
  fullnode: NODE_URL,
  faucet: FAUCET_URL
});
const cedra = new Cedra(config);

// Helper functions
async function fundAccount(account: Account, amount: number = 100_000_000): Promise<void> {
  console.log(`💰 Funding account ${account.accountAddress.toString()}...`);
  try {
    await cedra.fundAccount({
      accountAddress: account.accountAddress,
      amount,
    });
    console.log("✅ Account funded successfully");
  } catch (error) {
    console.error("❌ Failed to fund account:", error);
  }
}

async function mintTestAsset(
  account: Account,
  assetType: "ETH" | "BTC",
  amount: number
): Promise<void> {
  console.log(`🪙  Minting ${amount / 100_000_000} Test${assetType} to ${account.accountAddress.toString()}...`);

  const mintFunction = assetType === "ETH" ? "mint_eth" : "mint_btc";
  
  const transaction = await cedra.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${MODULES.test_tokens}::${mintFunction}`,
      typeArguments: [],
      functionArguments: [amount],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: account,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`✅ Minted ${amount / 100_000_000} Test${assetType}`);
}

async function getMetadataAddress(assetType: string): Promise<string> {
  try {
    if (assetType === ASSET_TYPES.CEDRA) {
      return "0x1";
    }

    // Use our test tokens
    let getMetadataFunction: string;
    if (assetType === ASSET_TYPES.ETH || assetType === "TestETH") {
      getMetadataFunction = "get_eth_metadata";
    } else if (assetType === ASSET_TYPES.BTC || assetType === "TestBTC") {
      getMetadataFunction = "get_btc_metadata";
    } else {
      throw new Error(`Unknown asset type: ${assetType}`);
    }

    const payload: InputViewFunctionData = {
      function: `${MODULES.test_tokens}::${getMetadataFunction}`,
      typeArguments: [],
      functionArguments: [],
    };
    const result = await cedra.view({ payload });
    
    // The result should be an object address
    if (result && result[0]) {
      const metadata = result[0];
      // Handle different response formats
      if (typeof metadata === 'string') {
        return metadata;
      } else if (metadata.inner) {
        return metadata.inner;
      }
    }
    
    throw new Error(`Invalid metadata response for ${assetType}`);
  } catch (error) {
    console.error(`Failed to get metadata for ${assetType}:`, error);
    throw new Error(`Cannot get metadata address for ${assetType}. Please check the test_tokens contract.`);
  }
}

async function getBalance(account: string, metadata: string): Promise<number> {
  try {
    const payload: InputViewFunctionData = {
      function: `0x1::primary_fungible_store::balance`,
      typeArguments: [],
      functionArguments: [account, metadata],
    };
    const result = await cedra.view({ payload });
    return Number(result[0] || 0);
  } catch (error) {
    // Fallback: try to get the store and then the balance
    try {
      const storePayload: InputViewFunctionData = {
        function: `0x1::primary_fungible_store::primary_store`,
        typeArguments: [],
        functionArguments: [account, metadata],
      };
      const storeResult = await cedra.view({ payload: storePayload });
      
      if (storeResult && storeResult[0]) {
        const store = await cedra.getAccountResource({
          accountAddress: storeResult[0] as string,
          resourceType: `0x1::fungible_asset::FungibleStore`,
        });
        return Number(store.balance || 0);
      }
    } catch {}
    
    return 0;
  }
}

// DEX-specific functions

async function createTradingPair(
  creator: Account,
  tokenX: string,
  tokenY: string
): Promise<string> {
  console.log(`🔄 Creating trading pair for ${tokenX}/${tokenY}...`);

  const xMetadata = await getMetadataAddress(tokenX);
  const yMetadata = await getMetadataAddress(tokenY);

  const transaction = await cedra.transaction.build.simple({
    sender: creator.accountAddress,
    data: {
      function: `${MODULES.swap}::create_pair`,
      typeArguments: [],
      functionArguments: [xMetadata, yMetadata],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: creator,
    transaction,
  });

  const result = await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`✅ Trading pair created! Tx: ${pendingTxn.hash}`);
  
  // Extract LP token address from events
  const events = result.events || [];
  for (const event of events) {
    if (event.type.includes("object::ObjectCore")) {
      return event.guid.id.addr;
    }
  }
  return "";
}

async function getReserves(lpMetadata: string): Promise<[number, number]> {
  try {
    const [reserves] = await cedra.view({
      payload: {
        function: `${MODULES.swap}::reserves`,
        typeArguments: [],
        functionArguments: [lpMetadata],
      }
    });
    const [x, y] = reserves as [string, string];
    return [Number(x), Number(y)];
  } catch (error) {
    console.error("Failed to get reserves:", error);
    return [0, 0];
  }
}

async function addLiquidity(
  provider: Account,
  lpMetadata: string,
  tokenX: string,
  tokenY: string,
  amountXDesired: number,
  amountYDesired: number,
  amountXMin: number,
  amountYMin: number
): Promise<void> {
  console.log(`💧 Adding liquidity to ${tokenX}/${tokenY} pair...`);

  const xMetadata = await getMetadataAddress(tokenX);
  const yMetadata = await getMetadataAddress(tokenY);

  const transaction = await cedra.transaction.build.simple({
    sender: provider.accountAddress,
    data: {
      function: `${MODULES.swap}::add_liquidity`,
      typeArguments: [],
      functionArguments: [
        lpMetadata,
        xMetadata,
        yMetadata,
        amountXDesired,
        amountYDesired,
        amountXMin,
        amountYMin
      ],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: provider,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`✅ Liquidity added successfully!`);
}

async function swap(
  user: Account,
  lpMetadata: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  minAmountOut: number
): Promise<void> {
  console.log(`🔄 Swapping ${amountIn / 100_000_000} ${tokenIn} for ${tokenOut}...`);

  const inMetadata = await getMetadataAddress(tokenIn);
  const outMetadata = await getMetadataAddress(tokenOut);

  const transaction = await cedra.transaction.build.simple({
    sender: user.accountAddress,
    data: {
      function: `${MODULES.swap}::swap_exact_input`,
      typeArguments: [],
      functionArguments: [
        lpMetadata,
        inMetadata,
        outMetadata,
        amountIn,
        minAmountOut
      ],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: user,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`✅ Swap completed successfully!`);
}

async function safeSwap(
  user: Account,
  lpMetadata: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  minAmountOut: number,
  maxSlippageBps: number
): Promise<void> {
  console.log(`🛡️  Safe swapping ${amountIn / 100_000_000} ${tokenIn} for ${tokenOut} with ${maxSlippageBps / 100}% max slippage...`);

  const inMetadata = await getMetadataAddress(tokenIn);
  const outMetadata = await getMetadataAddress(tokenOut);

  const transaction = await cedra.transaction.build.simple({
    sender: user.accountAddress,
    data: {
      function: `${MODULES.slippage}::safe_swap`,
      typeArguments: [],
      functionArguments: [
        lpMetadata,
        inMetadata,
        outMetadata,
        amountIn,
        minAmountOut,
        maxSlippageBps
      ],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: user,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`✅ Safe swap completed successfully!`);
}

async function multihopSwap(
  user: Account,
  lpMetadata1: string,
  lpMetadata2: string,
  tokenX: string,
  tokenY: string,
  tokenZ: string,
  amountIn: number,
  minAmountOut: number
): Promise<void> {
  console.log(`🔀 Multihop swap: ${amountIn / 100_000_000} ${tokenX} → ${tokenY} → ${tokenZ}...`);

  const xMetadata = await getMetadataAddress(tokenX);
  const yMetadata = await getMetadataAddress(tokenY);
  const zMetadata = await getMetadataAddress(tokenZ);

  const transaction = await cedra.transaction.build.simple({
    sender: user.accountAddress,
    data: {
      function: `${MODULES.multihop}::swap_exact_input_multihop`,
      typeArguments: [],
      functionArguments: [
        lpMetadata1,
        lpMetadata2,
        xMetadata,
        yMetadata,
        zMetadata,
        amountIn,
        minAmountOut
      ],
    },
  });

  const pendingTxn = await cedra.signAndSubmitTransaction({
    signer: user,
    transaction,
  });

  await cedra.waitForTransaction({ transactionHash: pendingTxn.hash });
  console.log(`✅ Multihop swap completed successfully!`);
}

async function getAmountOut(
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
    console.error("Failed to calculate amount out:", error);
    return 0;
  }
}

async function calculatePriceImpact(
  lpMetadata: string,
  amountIn: number
): Promise<number> {
  try {
    const [reserveIn, reserveOut] = await getReserves(lpMetadata);
    const [impact] = await cedra.view({
      payload: {
        function: `${MODULES.slippage}::calculate_price_impact`,
        typeArguments: [],
        functionArguments: [amountIn, reserveIn, reserveOut],
      }
    });
    return Number(impact);
  } catch (error) {
    console.error("Failed to calculate price impact:", error);
    return 0;
  }
}

// Helper function to format numbers
function formatAmount(amount: number, decimals: number = 8): string {
  return (amount / Math.pow(10, decimals)).toFixed(4);
}

// Helper function to print section separator
function printSection(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`🔹 ${title}`);
  console.log("=".repeat(60) + "\n");
}

// Helper function to print subsection
function printSubsection(title: string) {
  console.log(`\n► ${title}`);
  console.log("─".repeat(40));
}

// Helper function to display pool state
async function displayPoolState(lpMetadata: string, label: string) {
  const [ethReserve, btcReserve] = await getReserves(lpMetadata);
  const k = ethReserve * btcReserve;
  const price = btcReserve > 0 ? ethReserve / btcReserve : 0;
  
  console.log(`\n📊 ${label}:`);
  console.log(`├─ ETH Reserve: ${formatAmount(ethReserve)} ETH`);
  console.log(`├─ BTC Reserve: ${formatAmount(btcReserve)} BTC`);
  console.log(`├─ K Constant: ${formatAmount(k)}`);
  console.log(`└─ Price: 1 BTC = ${price.toFixed(4)} ETH`);
}

// Helper function to display balances
async function displayBalances(
  accounts: { name: string; address: string }[],
  ethMetadata: string,
  btcMetadata: string,
  label: string
) {
  console.log(`\n💰 ${label}:`);
  console.log("┌────────────┬──────────────┬──────────────┐");
  console.log("│ Account    │ ETH Balance  │ BTC Balance  │");
  console.log("├────────────┼──────────────┼──────────────┤");
  
  for (const account of accounts) {
    const ethBalance = await getBalance(account.address, ethMetadata);
    const btcBalance = await getBalance(account.address, btcMetadata);
    console.log(
      `│ ${account.name.padEnd(10)} │ ${formatAmount(ethBalance).padStart(12)} │ ${formatAmount(btcBalance).padStart(12)} │`
    );
  }
  console.log("└────────────┴──────────────┴──────────────┘");
}

// Main demo function
async function main() {
  console.log("\n🚀 DEX Showcase - Demonstrating AMM Functionality");
  console.log("━".repeat(60));
  console.log("This demo showcases a complete DEX implementation including:");
  console.log("• Constant Product AMM (x*y=k)");
  console.log("• Liquidity Provision");
  console.log("• Token Swaps with 0.3% Fee");
  console.log("• Slippage Protection");
  console.log("• Price Impact Calculations");
  console.log("━".repeat(60));

  printSection("SETUP PHASE");

  // Generate accounts
  const deployer = Account.generate();
  const alice = Account.generate();
  const bob = Account.generate();

  console.log("📝 Generated Accounts:");
  console.log(`├─ Deployer: ${deployer.accountAddress}`);
  console.log(`├─ Alice: ${alice.accountAddress}`);
  console.log(`└─ Bob: ${bob.accountAddress}`);

  // Fund accounts
  printSubsection("Funding Accounts");
  await fundAccount(deployer, 200_000_000);
  await fundAccount(alice, 200_000_000);
  await fundAccount(bob, 200_000_000);

  // Wait for funding
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mint test assets
  printSubsection("Minting Test Assets");
  console.log("Creating test tokens for demonstration...");
  await mintTestAsset(alice, "ETH", 1000_000_000); // 10 ETH
  await mintTestAsset(alice, "BTC", 500_000_000);  // 5 BTC
  await mintTestAsset(bob, "ETH", 500_000_000);    // 5 ETH
  await mintTestAsset(bob, "BTC", 200_000_000);    // 2 BTC

  // Wait for minting to complete
  console.log("\nWaiting for blockchain confirmation...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get metadata addresses
  console.log("\n► Getting Asset Metadata");
  console.log("────────────────────────────────────────");
  const ethMetadata = await getMetadataAddress(ASSET_TYPES.ETH);
  const btcMetadata = await getMetadataAddress(ASSET_TYPES.BTC);
  console.log(`ETH Metadata: ${ethMetadata}`);
  console.log(`BTC Metadata: ${btcMetadata}`);

  // Display initial balances
  await displayBalances(
    [
      { name: "Alice", address: alice.accountAddress.toString() },
      { name: "Bob", address: bob.accountAddress.toString() }
    ],
    ethMetadata,
    btcMetadata,
    "Initial Token Balances"
  );

  // Create trading pair
  printSection("LIQUIDITY POOL CREATION");
  
  console.log("Creating ETH/BTC trading pair...");
  console.log(`Using token addresses:`);
  console.log(`├─ ETH: ${ASSET_TYPES.ETH}`);
  console.log(`└─ BTC: ${ASSET_TYPES.BTC}`);
  
  const lpTokenAddress = await createTradingPair(deployer, ASSET_TYPES.ETH, ASSET_TYPES.BTC);
  console.log(`✅ LP Token created at: ${lpTokenAddress}`);

  // Show initial (empty) pool state
  await displayPoolState(lpTokenAddress, "Initial Pool State (Empty)");

  // Add initial liquidity
  printSubsection("Adding Initial Liquidity");
  
  console.log("\n📐 AMM Formula: x * y = k");
  console.log("When adding liquidity to empty pool:");
  console.log("• LP tokens minted = sqrt(amount_x * amount_y)");
  console.log("• Initial price is set by the ratio of tokens\n");
  
  const initialEthAmount = 500_000_000;  // 5 ETH
  const initialBtcAmount = 250_000_000;  // 2.5 BTC
  
  console.log(`Alice adds: ${formatAmount(initialEthAmount)} ETH + ${formatAmount(initialBtcAmount)} BTC`);
  
  await addLiquidity(
    alice,
    lpTokenAddress,
    ASSET_TYPES.ETH,
    ASSET_TYPES.BTC,
    initialEthAmount,
    initialBtcAmount,
    450_000_000,  // Min 4.5 ETH
    225_000_000   // Min 2.25 BTC
  );

  // Display pool state after initial liquidity
  await displayPoolState(lpTokenAddress, "Pool State After Initial Liquidity");
  
  // Calculate initial K constant
  const [ethReserve, btcReserve] = await getReserves(lpTokenAddress);
  const initialK = ethReserve * btcReserve;
  console.log(`\n🔢 Initial K constant: ${formatAmount(initialK)}`);
  console.log(`📈 Initial price: 1 ETH = ${(btcReserve / ethReserve).toFixed(4)} BTC`);

  // Perform basic swap
  printSection("TOKEN SWAPPING");
  
  printSubsection("Basic Swap Demonstration");
  
  console.log("\n📐 Swap Formula (with 0.3% fee):");
  console.log("• amount_in_with_fee = amount_in * 997 / 1000");
  console.log("• amount_out = (amount_in_with_fee * reserve_out) / (reserve_in + amount_in_with_fee)");
  console.log("• New K remains constant after swap\n");
  
  const swapAmount = 100_000_000; // 1 ETH
  console.log(`Bob wants to swap: ${formatAmount(swapAmount)} ETH for BTC`);
  
  // Calculate expected output
  const expectedOut = await getAmountOut(swapAmount, ethReserve, btcReserve);
  const effectivePrice = swapAmount / expectedOut;
  const spotPrice = ethReserve / btcReserve;
  
  console.log(`\n💱 Swap Calculation:`);
  console.log(`├─ Input: ${formatAmount(swapAmount)} ETH`);
  console.log(`├─ Fee (0.3%): ${formatAmount(swapAmount * 0.003)} ETH`);
  console.log(`├─ Expected Output: ${formatAmount(expectedOut)} BTC`);
  console.log(`├─ Effective Price: 1 BTC = ${effectivePrice.toFixed(4)} ETH`);
  console.log(`└─ Spot Price: 1 BTC = ${spotPrice.toFixed(4)} ETH`);

  // Show balances before swap
  console.log("\n📊 Bob's Balance Before Swap:");
  const bobEthBefore = await getBalance(bob.accountAddress.toString(), ethMetadata);
  const bobBtcBefore = await getBalance(bob.accountAddress.toString(), btcMetadata);
  console.log(`├─ ETH: ${formatAmount(bobEthBefore)}`);
  console.log(`└─ BTC: ${formatAmount(bobBtcBefore)}`);

  // Execute swap
  await swap(
    bob,
    lpTokenAddress,
    ASSET_TYPES.ETH,
    ASSET_TYPES.BTC,
    swapAmount,
    (expectedOut * 95) / 100  // 5% slippage tolerance
  );

  // Show balances after swap
  console.log("\n📊 Bob's Balance After Swap:");
  const bobEthAfter = await getBalance(bob.accountAddress.toString(), ethMetadata);
  const bobBtcAfter = await getBalance(bob.accountAddress.toString(), btcMetadata);
  console.log(`├─ ETH: ${formatAmount(bobEthAfter)} (${formatAmount(bobEthAfter - bobEthBefore)})`);
  console.log(`└─ BTC: ${formatAmount(bobBtcAfter)} (+${formatAmount(bobBtcAfter - bobBtcBefore)})`);

  // Display pool state after swap
  await displayPoolState(lpTokenAddress, "Pool State After Swap");
  
  // Verify K constant
  const [newEthReserve, newBtcReserve] = await getReserves(lpTokenAddress);
  const newK = newEthReserve * newBtcReserve;
  console.log(`\n🔢 K constant verification:`);
  console.log(`├─ K before: ${formatAmount(initialK)}`);
  console.log(`├─ K after: ${formatAmount(newK)}`);
  console.log(`└─ K preserved: ${Math.abs(newK - initialK) < 1000 ? "✅ Yes" : "❌ No"}`);

  // Price impact demonstration
  printSubsection("Price Impact Analysis");
  
  console.log("\n📈 Price impact increases with swap size:");
  const swapSizes = [50_000_000, 100_000_000, 200_000_000, 300_000_000]; // 0.5, 1, 2, 3 ETH
  
  for (const size of swapSizes) {
    const priceImpact = await calculatePriceImpact(lpTokenAddress, size);
    const output = await getAmountOut(size, newEthReserve, newBtcReserve);
    const avgPrice = size / output;
    console.log(`├─ ${formatAmount(size).padEnd(6)} ETH → Impact: ${(priceImpact / 100).toFixed(2).padStart(6)}% | Avg Price: ${avgPrice.toFixed(4)}`);
  }
  console.log(`└─ Larger swaps face higher slippage due to limited liquidity`);

  // Safe swap with slippage protection
  printSection("SLIPPAGE PROTECTION");
  
  printSubsection("Safe Swap with Maximum Slippage");
  
  console.log("\n🛡️ Slippage Protection:");
  console.log("• Protects traders from sandwich attacks");
  console.log("• Ensures minimum output is received");
  console.log("• Transaction reverts if slippage exceeds limit\n");
  
  const [currentEthReserve, currentBtcReserve] = await getReserves(lpTokenAddress);
  const safeSwapAmount = 50_000_000; // 0.5 ETH
  const safeExpectedOut = await getAmountOut(safeSwapAmount, currentEthReserve, currentBtcReserve);
  const maxSlippageBps = 200; // 2%
  
  console.log(`Safe Swap Parameters:`);
  console.log(`├─ Input Amount: ${formatAmount(safeSwapAmount)} ETH`);
  console.log(`├─ Expected Output: ${formatAmount(safeExpectedOut)} BTC`);
  console.log(`├─ Max Slippage: ${maxSlippageBps / 100}%`);
  console.log(`├─ Min Acceptable Output: ${formatAmount((safeExpectedOut * (10000 - maxSlippageBps)) / 10000)} BTC`);
  console.log(`└─ Actual Min Set: ${formatAmount((safeExpectedOut * 95) / 100)} BTC (5% tolerance)`);

  await safeSwap(
    bob,
    lpTokenAddress,
    ASSET_TYPES.ETH,
    ASSET_TYPES.BTC,
    safeSwapAmount,
    (safeExpectedOut * 95) / 100,  // Min output
    maxSlippageBps
  );

  // Display final state
  printSection("FINAL STATE SUMMARY");

  // Final balances
  await displayBalances(
    [
      { name: "Alice", address: alice.accountAddress.toString() },
      { name: "Bob", address: bob.accountAddress.toString() }
    ],
    ethMetadata,
    btcMetadata,
    "Final Token Balances"
  );

  // Final pool state
  await displayPoolState(lpTokenAddress, "Final Pool State");

  // Trading summary
  printSubsection("Trading Summary");
  
  const [finalEthReserve, finalBtcReserve] = await getReserves(lpTokenAddress);
  const finalK = finalEthReserve * finalBtcReserve;
  
  console.log("\n📊 Pool Evolution:");
  console.log(`├─ Initial Reserves: ${formatAmount(ethReserve)} ETH / ${formatAmount(btcReserve)} BTC`);
  console.log(`├─ Final Reserves: ${formatAmount(finalEthReserve)} ETH / ${formatAmount(finalBtcReserve)} BTC`);
  console.log(`├─ ETH Change: +${formatAmount(finalEthReserve - ethReserve)}`);
  console.log(`├─ BTC Change: ${formatAmount(finalBtcReserve - btcReserve)}`);
  console.log(`└─ K Constant: ${formatAmount(initialK)} → ${formatAmount(finalK)}`);
  
  console.log("\n💱 Price Evolution:");
  console.log(`├─ Initial Price: 1 ETH = ${(btcReserve / ethReserve).toFixed(4)} BTC`);
  console.log(`├─ Final Price: 1 ETH = ${(finalBtcReserve / finalEthReserve).toFixed(4)} BTC`);
  console.log(`└─ Price Change: ${(((finalBtcReserve / finalEthReserve) - (btcReserve / ethReserve)) / (btcReserve / ethReserve) * 100).toFixed(2)}%`);

  // Bob's trading performance
  const bobInitialEth = 500_000_000;
  const bobInitialBtc = 200_000_000;
  const bobFinalEth = await getBalance(bob.accountAddress.toString(), ethMetadata);
  const bobFinalBtc = await getBalance(bob.accountAddress.toString(), btcMetadata);
  
  console.log("\n📈 Bob's Trading Performance:");
  console.log(`├─ ETH: ${formatAmount(bobInitialEth)} → ${formatAmount(bobFinalEth)} (${formatAmount(bobFinalEth - bobInitialEth)})`);
  console.log(`├─ BTC: ${formatAmount(bobInitialBtc)} → ${formatAmount(bobFinalBtc)} (+${formatAmount(bobFinalBtc - bobInitialBtc)})`);
  console.log(`└─ Total Swapped: ${formatAmount(bobInitialEth - bobFinalEth)} ETH for ${formatAmount(bobFinalBtc - bobInitialBtc)} BTC`);

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEX Showcase Complete!");
  console.log("=".repeat(60));
}

// Run the demo
main().catch(console.error);