import { Cedra, CedraConfig, Network } from "@cedra-labs/ts-sdk";
import { PLATFORM_ADDRESS, MODULE_ADDRESS } from "./constants";

// Re-export; backwards compatibility
export { PLATFORM_ADDRESS, MODULE_ADDRESS };

// Init Cedra clien- testnet
const config = new CedraConfig({ network: Network.TESTNET });
export const cedraClient = new Cedra(config);

// Proposal type matchnig Move contract
export interface Proposal {
  id: number;
  description: string;
  creator: string;
  yes_votes: number;
  no_votes: number;
  end_time: number;
}

// We view function to get proposal details
export async function getProposal(proposalId: number): Promise<Proposal | null> {
  try {
    const result = await cedraClient.view({
      payload: {
        function: `${MODULE_ADDRESS}::get_proposal` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [PLATFORM_ADDRESS, proposalId],
      },
    });

    // We handle both old (5 values) and new (6 values) contract versions(decided not to re-deploy 3rd times - you can try that to get creators account)
    if (result && result.length >= 5) {
      if (result.length === 6) {
        // NEW contract: [description, creator, yes_votes, no_votes, end_time, voter_count]
        return {
          id: proposalId,
          description: result[0] as string,
          creator: result[1] as string,
          yes_votes: Number(result[2]),
          no_votes: Number(result[3]),
          end_time: Number(result[4]),
        };
      } else {
        // OLD contract: [description, yes_votes, no_votes, end_time, voter_count]
        return {
          id: proposalId,
          description: result[0] as string,
          creator: "", // Not available in old contract
          yes_votes: Number(result[1]),
          no_votes: Number(result[2]),
          end_time: Number(result[3]),
        };
      }
    }

    return null;
  } catch (error: any) {
    // We silently handle errors when proposal doesn't exist
    if (error.message && (
      error.message.includes("MISSING_DATA") ||
      error.message.includes("VECTOR_OPERATION_ERROR") ||
      error.message.includes("invalid_input")
    )) {
      return null;
    }
    // We only log other unexpected errors
    console.error("Error fetching proposal:", error);
    return null;
  }
}

// We check if platform is initialized by checking if the resource exists
export async function checkPlatformInitialized(): Promise<boolean> {
  try {
    const resourceType = `${MODULE_ADDRESS}::VotingPlatform` as `${string}::${string}::${string}`;
    const resource = await cedraClient.getAccountResource({
      accountAddress: PLATFORM_ADDRESS,
      resourceType: resourceType,
    });

    // If we get the resource, platform is initialized
    return resource !== null && resource !== undefined;
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes("Resource not found")) {
      return false;
    }
    // For other errors, we can't determine - return false to be safe
    console.error("Error checking platform initialization:", error);
    return false;
  }
}

// Get all proposals (we'll fetch them by ID until we hit an error)
export async function getAllProposals(): Promise<Proposal[]> {
  const proposals: Proposal[] = [];
  let id = 0;

  // We try fetching proposals until we get null (no more proposals)
  while (true) {
    const proposal = await getProposal(id);
    if (!proposal) break;
    proposals.push(proposal);
    id++;
  }

  return proposals;
}

// After my 2nd redeply -  NEW: Get list of voter addresses for a proposal
export async function getProposalVoters(proposalId: number): Promise<string[]> {
  try {
    const result = await cedraClient.view({
      payload: {
        function: `${MODULE_ADDRESS}::get_proposal_voters` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [PLATFORM_ADDRESS, proposalId],
      },
    });

    // Result format: vector<address> (array of address strings)
    if (result && Array.isArray(result[0])) {
      return result[0] as string[];
    }

    return [];
  } catch (error) {
    console.error("Error fetching proposal voters:", error);
    return [];
  }
}

// Entreys function to initialize the platform
export async function initializePlatform(account: any) {
  try {
    const transaction = await cedraClient.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::initialize` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    const committedTx = await cedraClient.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await cedraClient.waitForTransaction({
      transactionHash: committedTx.hash,
    });

    return committedTx.hash;
  } catch (error) {
    console.error("Error initializing platform:", error);
    throw error;
  }
}

// Entry function to create a proposal
export async function createProposal(
  account: any,
  description: string,
  durationSeconds: number
) {
  try {
    const transaction = await cedraClient.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::create_proposal` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [
          PLATFORM_ADDRESS,
          Array.from(new TextEncoder().encode(description)),
          durationSeconds,
        ],
      },
    });

    const committedTx = await cedraClient.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await cedraClient.waitForTransaction({
      transactionHash: committedTx.hash,
    });

    return committedTx.hash;
  } catch (error: any) {
    console.error("Error creating proposal:", error);

    // helpful error messages
    if (error.message?.includes("MISSING_DATA") || error.message?.includes("borrow_global")) {
      throw new Error("Platform not properly initialized. Please contact the platform administrator.");
    }

    throw error;
  }
}

//function to vote yes
export async function voteYes(account: any, proposalId: number) {
  try {
    const transaction = await cedraClient.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::vote_yes` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [PLATFORM_ADDRESS, proposalId],
      },
    });

    const committedTx = await cedraClient.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await cedraClient.waitForTransaction({
      transactionHash: committedTx.hash,
    });

    return committedTx.hash;
  } catch (error) {
    console.error("Error voting yes:", error);
    throw error;
  }
}

//function to vote no
export async function voteNo(account: any, proposalId: number) {
  try {
    const transaction = await cedraClient.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::vote_no` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [PLATFORM_ADDRESS, proposalId],
      },
    });

    const committedTx = await cedraClient.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    await cedraClient.waitForTransaction({
      transactionHash: committedTx.hash,
    });

    return committedTx.hash;
  } catch (error) {
    console.error("Error voting no:", error);
    throw error;
  }
}
