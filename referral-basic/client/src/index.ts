import { Account, AccountAddress, Cedra, CedraConfig, Network, Ed25519PrivateKey } from "@cedra-labs/ts-sdk";

const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "_"; // Replace with your deployed contract address
const MODULE_NAME = "Referral";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "_"; // Set via environment variable or replace with your admin account private key
const ONE_CEDRA_IN_OCTAS = 100_000_000;

const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress) => {
  console.log(`Funding account ${accountAddress.toString()}...`);
  await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
  console.log(`Funding completed`);
};

const registerReferralCode = async (cedra: Cedra, user: Account, code: string) => {
  console.log(`\nRegistering referral code "${code}" for ${user.accountAddress.toString()}...`);
  const txn = await cedra.transaction.build.simple({
    sender: user.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::register_referral_code`,
      functionArguments: [code]
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: user, transaction: txn });
  console.log(`Referral code registered! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
};

const trackReferral = async (cedra: Cedra, referee: Account, referralCode: string) => {
  console.log(`\nTracking referral: ${referee.accountAddress.toString()} using code "${referralCode}"...`);
  const txn = await cedra.transaction.build.simple({
    sender: referee.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::track_referral`,
      functionArguments: [referralCode]
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: referee, transaction: txn });
  console.log(`Referral tracked! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
};

const claimRewards = async (cedra: Cedra, owner: Account) => {
  console.log(`\nClaiming rewards for ${owner.accountAddress.toString()}...`);
  const txn = await cedra.transaction.build.simple({
    sender: owner.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::claim_rewards`,
      functionArguments: []
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: owner, transaction: txn });
  console.log(`Rewards claimed! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
};

const getReferralCodeInfo = async (cedra: Cedra, code: string) => {
  const result = await cedra.view<[string, string, string, string]>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_referral_code_info`,
      functionArguments: [code]
    }
  });
  
  const [codeStr, ownerStr, totalReferralsStr, totalRewardsStr] = result;
  const totalReferrals = parseInt(totalReferralsStr, 10);
  const totalRewards = parseInt(totalRewardsStr, 10);
  
  return {
    code: codeStr,
    owner: ownerStr,
    totalReferrals,
    totalRewards
  };
};

const getCodeByOwner = async (cedra: Cedra, owner: string) => {
  const result = await cedra.view<[string, string, string]>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_code_by_owner`,
      functionArguments: [owner]
    }
  });
  
  const [codeStr, totalReferralsStr, totalRewardsStr] = result;
  const totalReferrals = parseInt(totalReferralsStr, 10);
  const totalRewards = parseInt(totalRewardsStr, 10);
  
  return {
    code: codeStr,
    totalReferrals,
    totalRewards
  };
};

const getUnclaimedRewards = async (cedra: Cedra, owner: string): Promise<number> => {
  const result = await cedra.view<string>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_unclaimed_rewards`,
      functionArguments: [owner]
    }
  });
  
  return parseInt(result, 10);
};

const codeExists = async (cedra: Cedra, code: string): Promise<boolean> => {
  const result = await cedra.view<boolean>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::code_exists`,
      functionArguments: [code]
    }
  });
  
  return result;
};

const hasReferralCode = async (cedra: Cedra, owner: string): Promise<boolean> => {
  const result = await cedra.view<boolean>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::has_referral_code`,
      functionArguments: [owner]
    }
  });
  
  return result;
};

const displayReferralCodeInfo = async (cedra: Cedra, code: string) => {
  console.log(`\n📋 Referral Code "${code}" Information:`);
  try {
    const info = await getReferralCodeInfo(cedra, code);
    console.log(`   Code: ${info.code}`);
    console.log(`   Owner: ${info.owner}`);
    console.log(`   Total Referrals: ${info.totalReferrals}`);
    console.log(`   Total Rewards: ${info.totalRewards}`);
    return info;
  } catch (error) {
    console.log(`   ❌ Code not found`);
    return null;
  }
};

const displayOwnerCodeInfo = async (cedra: Cedra, owner: string) => {
  console.log(`\n📋 Owner ${owner} Referral Code Information:`);
  try {
    const info = await getCodeByOwner(cedra, owner);
    console.log(`   Code: ${info.code}`);
    console.log(`   Total Referrals: ${info.totalReferrals}`);
    console.log(`   Total Rewards: ${info.totalRewards}`);
    const unclaimed = await getUnclaimedRewards(cedra, owner);
    console.log(`   Unclaimed Rewards: ${unclaimed}`);
    return info;
  } catch (error) {
    console.log(`   ❌ No referral code found for this owner`);
    return null;
  }
};

const example = async () => {
  console.log("Starting Referral Basic Demo");
  console.log("=".repeat(60));

  // Configure network endpoints
  const fullnode = "https://testnet.cedra.dev/v1";
  const config = new CedraConfig({ network: NETWORK, fullnode });
  const cedra = new Cedra(config);

  // Use provided private key or generate a new account for testing
  let referrer1: Account;
  if (ADMIN_PRIVATE_KEY === "_" || ADMIN_PRIVATE_KEY.length < 64) {
    console.log("⚠️  No admin private key provided. Generating new accounts for testing...");
    referrer1 = Account.generate();
    console.log("Generated Referrer 1 Address: ", referrer1.accountAddress.toString());
    console.log("⚠️  Save the private key securely if you want to use this account!");
  } else {
    const privateKey = new Ed25519PrivateKey(ADMIN_PRIVATE_KEY);
    referrer1 = Account.fromPrivateKey({ privateKey });
  }
  
  const referrer2 = Account.generate();
  const referee1 = Account.generate();
  const referee2 = Account.generate();
  const referee3 = Account.generate();

  console.log("\nReferrer 1 Address: ", referrer1.accountAddress.toString());
  console.log("Referrer 2 Address: ", referrer2.accountAddress.toString());
  console.log("Referee 1 Address: ", referee1.accountAddress.toString());
  console.log("Referee 2 Address: ", referee2.accountAddress.toString());
  console.log("Referee 3 Address: ", referee3.accountAddress.toString());

  // Fund accounts
  console.log("\n💰 Funding accounts...");
  await fundAccount(cedra, referrer1.accountAddress);
  await fundAccount(cedra, referrer2.accountAddress);
  await fundAccount(cedra, referee1.accountAddress);
  await fundAccount(cedra, referee2.accountAddress);
  await fundAccount(cedra, referee3.accountAddress);

  try {
    // Step 1: Register referral codes
    console.log("\n" + "=".repeat(60));
    console.log("STEP 1: Registering Referral Codes");
    console.log("=".repeat(60));
    await registerReferralCode(cedra, referrer1, "REF1");
    await registerReferralCode(cedra, referrer2, "REF2");
    await displayReferralCodeInfo(cedra, "REF1");
    await displayReferralCodeInfo(cedra, "REF2");
    
    // Step 2: Track referrals
    console.log("\n" + "=".repeat(60));
    console.log("STEP 2: Tracking Referrals");
    console.log("=".repeat(60));
    await trackReferral(cedra, referee1, "REF1");
    await trackReferral(cedra, referee2, "REF1");
    await trackReferral(cedra, referee3, "REF2");
    await displayReferralCodeInfo(cedra, "REF1");
    await displayReferralCodeInfo(cedra, "REF2");
    
    // Step 3: Check unclaimed rewards
    console.log("\n" + "=".repeat(60));
    console.log("STEP 3: Checking Unclaimed Rewards");
    console.log("=".repeat(60));
    const unclaimed1 = await getUnclaimedRewards(cedra, referrer1.accountAddress.toString());
    const unclaimed2 = await getUnclaimedRewards(cedra, referrer2.accountAddress.toString());
    console.log(`Referrer 1 unclaimed rewards: ${unclaimed1}`);
    console.log(`Referrer 2 unclaimed rewards: ${unclaimed2}`);
    
    // Step 4: Claim rewards
    console.log("\n" + "=".repeat(60));
    console.log("STEP 4: Claiming Rewards");
    console.log("=".repeat(60));
    await claimRewards(cedra, referrer1);
    await claimRewards(cedra, referrer2);
    
    // Step 5: Verify anti-gaming measures
    console.log("\n" + "=".repeat(60));
    console.log("STEP 5: Testing Anti-Gaming Measures");
    console.log("=".repeat(60));
    
    // Try to register duplicate code (should fail)
    console.log("\nAttempting to register duplicate code...");
    try {
      await registerReferralCode(cedra, referee1, "REF1");
      console.log("❌ ERROR: Duplicate code registration should have failed!");
    } catch (error) {
      console.log("✅ Correctly prevented duplicate code registration");
    }
    
    // Try self-referral (should fail)
    console.log("\nAttempting self-referral...");
    try {
      await trackReferral(cedra, referrer1, "REF1");
      console.log("❌ ERROR: Self-referral should have failed!");
    } catch (error) {
      console.log("✅ Correctly prevented self-referral");
    }
    
    // Try duplicate referral (should fail)
    console.log("\nAttempting duplicate referral...");
    try {
      await trackReferral(cedra, referee1, "REF2");
      console.log("❌ ERROR: Duplicate referral should have failed!");
    } catch (error) {
      console.log("✅ Correctly prevented duplicate referral");
    }
    
    // Display final state
    console.log("\n" + "=".repeat(60));
    console.log("FINAL STATE");
    console.log("=".repeat(60));
    await displayOwnerCodeInfo(cedra, referrer1.accountAddress.toString());
    await displayOwnerCodeInfo(cedra, referrer2.accountAddress.toString());
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Referral demo completed successfully!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("Error during operation:", error);
  }
};

example().catch(console.error);

