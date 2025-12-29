import { Account, AccountAddress, Cedra, CedraConfig, Network, Ed25519PrivateKey } from "@cedra-labs/ts-sdk";

const NETWORK = Network.TESTNET;
const MODULE_ADDRESS = "0xbb069da2302ce3a4e75d57238b230a62fd7f272870fcee2c005067d970068805"; // Replace with your deployed contract address
const MODULE_NAME = "Voting";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "_"; // Set via environment variable or replace with your admin account private key
const ONE_CEDRA_IN_OCTAS = 100_000_000;

const fundAccount = async (cedra: Cedra, accountAddress: AccountAddress) => {
  console.log(`Funding account ${accountAddress.toString()}...`);
  await cedra.faucet.fundAccount({ accountAddress, amount: ONE_CEDRA_IN_OCTAS });
  console.log(`Funding completed`);
};

const createProposal = async (cedra: Cedra, admin: Account, description: string) => {
  console.log(`\nCreating proposal: "${description}"`);
  const txn = await cedra.transaction.build.simple({
    sender: admin.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_proposal`,
      functionArguments: [description]
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: admin, transaction: txn });
  console.log(`Proposal created! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
  return 0; // First proposal has ID 0
};

const vote = async (cedra: Cedra, voter: Account, proposalId: number, voteYes: boolean) => {
  const voteType = voteYes ? "YES" : "NO";
  console.log(`\nVoting ${voteType} on proposal ${proposalId}`);
  const txn = await cedra.transaction.build.simple({
    sender: voter.accountAddress,
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::vote`,
      functionArguments: [proposalId, voteYes]
    }
  });
  
  const res = await cedra.signAndSubmitTransaction({ signer: voter, transaction: txn });
  console.log(`Vote submitted! Transaction: ${res.hash}`);
  await cedra.waitForTransaction({ transactionHash: res.hash });
};

const checkResults = async (cedra: Cedra, proposalId: number) => {
  console.log(`\nChecking results for proposal ${proposalId}...`);
  const result = await cedra.view<[string, string, string]>({
    payload: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::check_results`,
      functionArguments: [proposalId]
    }
  });
  
  const [yesStr, noStr, description] = result;
  const yesVotes = parseInt(yesStr, 10);
  const noVotes = parseInt(noStr, 10);
  
  console.log(`\n📊 Proposal Results:`);
  console.log(`   Description: ${description}`);
  console.log(`   Yes votes: ${yesVotes}`);
  console.log(`   No votes: ${noVotes}`);
  console.log(`   Total votes: ${yesVotes + noVotes}`);
  console.log(`   Result: ${yesVotes > noVotes ? "✅ PASSED" : yesVotes < noVotes ? "❌ REJECTED" : "🤝 TIED"}`);
  
  return { yesVotes, noVotes, description };
};

const example = async () => {
  console.log("Starting Voting Basic Demo");

  const config = new CedraConfig({ network: NETWORK });
  const cedra = new Cedra(config);

  // Use provided private key or generate a new account for testing
  let admin: Account;
  if (ADMIN_PRIVATE_KEY === "_" || ADMIN_PRIVATE_KEY.length < 64) {
    console.log("⚠️  No admin private key provided. Generating a new account for testing...");
    console.log("⚠️  Note: This account won't have permissions if the contract is already deployed.");
    admin = Account.generate();
    console.log("Generated Admin Address: ", admin.accountAddress.toString());
    console.log("Generated Private Key: ", admin.privateKey.toString());
    console.log("⚠️  Save this private key if you want to use this account!");
  } else {
    const privateKey = new Ed25519PrivateKey(ADMIN_PRIVATE_KEY);
    admin = Account.fromPrivateKey({ privateKey });
  }
  const voter1 = Account.generate();
  const voter2 = Account.generate();
  
  console.log("\nAdmin Address: ", admin.accountAddress.toString());
  console.log("Voter 1 Address: ", voter1.accountAddress.toString());
  console.log("Voter 2 Address: ", voter2.accountAddress.toString());
  
  // Fund accounts
  console.log("\nFunding accounts...");
  await fundAccount(cedra, admin.accountAddress);
  await fundAccount(cedra, voter1.accountAddress);
  await fundAccount(cedra, voter2.accountAddress);

  try {
    // Step 1: Create a proposal
    const proposalId = await createProposal(cedra, admin, "Should we add new features?");
    
    // Step 2: Vote on the proposal
    await vote(cedra, voter1, proposalId, true);  // Vote YES
    await vote(cedra, voter2, proposalId, false); // Vote NO
    
    // Step 3: Check results
    await checkResults(cedra, proposalId);
    
    console.log("\n" + "=".repeat(60));
    console.log("Voting demo completed successfully!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("Error during operation:", error);
  }
};

example().catch(console.error);

