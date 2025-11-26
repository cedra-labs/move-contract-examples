// Debug script to check stake requirements
import { Cedra, CedraConfig} from "@cedra-labs/ts-sdk";


const MODULE_ADDRESS = "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8";

const config = new CedraConfig({
  network: Network.CUSTOM,
  fullnode: "https://testnet.cedra.dev/v1",
  // GraphQL indexer endpoint
  indexer: "https://cloud.hasura.io/public/graphiql?endpoint=https://graphql.cedra.dev/v1/graphql",
});

const Cedra = new Cedra(config);

async function checkStakeRequirements(daoAddress, userAddress) {
  console.log("=== DEBUGGING STAKE REQUIREMENTS ===");
  console.log(`DAO Address: ${daoAddress}`);
  console.log(`User Address: ${userAddress}`);
  console.log(`Module Address: ${MODULE_ADDRESS}`);
  
  try {
    // Check DAO basic info
    console.log("\n0. Checking DAO basic info...");
    const daoInfo = await Cedra.getAccountResource({
      accountAddress: daoAddress,
      resourceType: `${MODULE_ADDRESS}::dao_core::DAOInfo`
    });
    console.log(" DAO Info found:", daoInfo);
    console.log("DAO Creator:", daoInfo.data.creator);
  } catch (error) {
    console.log(" DAO Info not found:", error.message);
  }
  
  // Check what resources actually exist at this address
  console.log("\n0.1. Checking all resources at DAO address...");
  try {
    const accountResources = await Cedra.getAccountResources({
      accountAddress: daoAddress
    });
    console.log(" Found resources:");
    accountResources.forEach(resource => {
      if (resource.type.includes(MODULE_ADDRESS)) {
        console.log(`  - ${resource.type}`);
      }
    });
    if (accountResources.filter(r => r.type.includes(MODULE_ADDRESS)).length === 0) {
      console.log("  No DAO-related resources found! This DAO may not be properly initialized.");
    }
  } catch (error) {
    console.log(" Error getting account resources:", error.message);
  }
  
  try {
    // Check if membership config exists
    console.log("\n1. Checking membership config exists...");
    try {
      const membershipConfig = await Cedra.getAccountResource({
        accountAddress: daoAddress,
        resourceType: `${MODULE_ADDRESS}::membership::MembershipConfig`
      });
      console.log(" MembershipConfig found:", membershipConfig);
    } catch (error) {
      console.log(" MembershipConfig NOT found:", error.message);
    }
    
    // Test each view function individually
    console.log("\n2. Testing view functions...");
    
    const functions = [
      ["get_min_stake", "Minimum stake to join"],
      ["get_min_proposal_stake", "Minimum stake to propose"],
    ];
    
    for (const [func, desc] of functions) {
      try {
        const result = await Cedra.view({
          payload: {
            function: `${MODULE_ADDRESS}::membership::${func}`,
            functionArguments: [daoAddress]
          }
        });
        console.log(` ${desc}: ${result[0]} octas (${Number(result[0]) / 1e8} MOVE)`);
      } catch (error) {
        console.log(` ${desc} failed:`, error.message);
      }
    }
    
    // Test staking functions
    console.log("\n3. Testing staking functions...");
    
    const stakingFunctions = [
      ["get_dao_staked_balance", "DAO staked balance"],
      ["get_staked_balance", "Global staked balance"],
      ["is_dao_staker", "Is DAO staker"],
      ["get_dao_stake_direct", "DAO stake direct"]
    ];
    
    for (const [func, desc] of stakingFunctions) {
      try {
        const result = await Cedra.view({
          payload: {
            function: `${MODULE_ADDRESS}::staking::${func}`,
            functionArguments: [daoAddress, userAddress]
          }
        });
        console.log(` ${desc}: ${result[0]} octas (${Number(result[0]) / 1e8} MOVE)`);
      } catch (error) {
        console.log(` ${desc} failed:`, error.message);
      }
    }
    
    // Also test without DAO address for global functions
    console.log("\n3.1. Testing global staking functions...");
    try {
      const globalStake = await Cedra.view({
        payload: {
          function: `${MODULE_ADDRESS}::staking::get_staked_balance`,
          functionArguments: [userAddress]
        }
      });
      console.log(` Global staked balance: ${globalStake[0]} octas (${Number(globalStake[0]) / 1e8} MOVE)`);
    } catch (error) {
      console.log(` Global staked balance failed:`, error.message);
    }
    
    // Check if user has a staker profile at all
    console.log("\n3.2. Checking if user has staker profile...");
    try {
      const isStaker = await Cedra.view({
        payload: {
          function: `${MODULE_ADDRESS}::staking::is_staker`,
          functionArguments: [userAddress]
        }
      });
      console.log(` Is staker (has profile): ${isStaker[0]}`);
      
      if (!isStaker[0]) {
        console.log(" User has no staking profile - they have never staked anything!");
      }
    } catch (error) {
      console.log(` Staker profile check failed:`, error.message);
    }
    
    // Check wallet balance
    console.log("\n3.3. Checking wallet MOVE balance...");
    try {
      const balance = await Cedra.view({
        payload: {
          function: `0x1::coin::balance`,
          typeArguments: ["0x1::Cedra_coin::CedraCoin"],
          functionArguments: [userAddress]
        }
      });
      console.log(` Wallet MOVE balance: ${balance[0]} octas (${Number(balance[0]) / 1e8} MOVE)`);
    } catch (error) {
      console.log(` Wallet balance check failed:`, error.message);
    }
    
    // Test admin functions
    console.log("\n4. Testing admin functions...");
    try {
      const isAdmin = await Cedra.view({
        payload: {
          function: `${MODULE_ADDRESS}::admin::is_admin`,
          functionArguments: [daoAddress, userAddress]
        }
      });
      console.log(` Is Admin: ${isAdmin[0]}`);
    } catch (error) {
      console.log(` Admin check failed:`, error.message);
    }
    
    // Test membership functions
    console.log("\n5. Testing membership functions...");
    const membershipFunctions = [
      ["is_member", "Is member"],
      ["can_create_proposal", "Can create proposal"]
    ];
    
    for (const [func, desc] of membershipFunctions) {
      try {
        const result = await Cedra.view({
          payload: {
            function: `${MODULE_ADDRESS}::membership::${func}`,
            functionArguments: [daoAddress, userAddress]
          }
        });
        console.log(` ${desc}: ${result[0]}`);
      } catch (error) {
        console.log(` ${desc} failed:`, error.message);
      }
    }
    
    // Test proposal functions  
    console.log("\n6. Testing proposal functions...");
    try {
      const canCreateProposals = await Cedra.view({
        payload: {
          function: `${MODULE_ADDRESS}::proposal::can_user_create_proposals`,
          functionArguments: [daoAddress, userAddress]
        }
      });
      console.log(` Can create proposals (proposal module): ${canCreateProposals[0]}`);
    } catch (error) {
      console.log(` Proposal creation check failed:`, error.message);
    }
    
  } catch (error) {
    console.error("Error checking stake requirements:", error);
  }
}

// Get DAO address and user address from command line or use defaults
const daoAddress = process.argv[2] || "0xb4fcb0a96b5c8c4b7ffde9cd14e1a43a78b6ed23b7b9d3d9c7b8fbecc91e8543";
const userAddress = process.argv[3] || "0x04d9e20b2fae2db3b3df45609b8f2ad01ae7b74db1e98f6fce21ddc6c6dcdd3d";

console.log("\n🔍 PLEASE VERIFY THESE ADDRESSES:");
console.log("1. Check your wallet - is this your address?", userAddress);
console.log("2. Check your app - is this the DAO you're trying to use?", daoAddress);
console.log("3. If either is wrong, run: node debug_stake_requirements.js [DAO_ADDRESS] [YOUR_ADDRESS]");
console.log("");

checkStakeRequirements(daoAddress, userAddress);