// User Status Service - Helper functions for displaying user roles and permissions

export interface UserStatus {
  statusString: string;
  isAdmin: boolean;
  isCouncil: boolean;
  isMember: boolean;
  canCreateProposals: boolean;
  canVote: boolean;
  canFinalize: boolean;
  votingPower: string;
}

export interface VotingEligibility {
  isMember: boolean;
  votingPower: string;
  hasStake: boolean;
  userRole: number;
}

// Role constants (matching Move contract)
export const USER_ROLES = {
  NOT_MEMBER: 0,
  MEMBER: 1,
  COUNCIL: 2,
  ADMIN: 3
} as const;

// Status display helpers
export const STATUS_DISPLAYS = {
  'Super Admin': { color: 'red', icon: '👑' },
  'Admin': { color: 'orange', icon: '🛡️' },
  'Council Member': { color: 'blue', icon: '🏛️' },
  'Member': { color: 'green', icon: '👤' },
  'Not a member': { color: 'gray', icon: '' }
} as const;

export function getRoleDisplayName(roleNumber: number): string {
  switch (roleNumber) {
    case USER_ROLES.ADMIN:
      return 'Admin';
    case USER_ROLES.COUNCIL:
      return 'Council Member';
    case USER_ROLES.MEMBER:
      return 'Member';
    default:
      return 'Not a member';
  }
}

export function getStatusDisplay(statusString: string) {
  return STATUS_DISPLAYS[statusString as keyof typeof STATUS_DISPLAYS] || STATUS_DISPLAYS['Not a member'];
}

// Helper to format voting power
export function formatVotingPower(votingPower: bigint | string | number): string {
  const power = typeof votingPower === 'bigint' ? votingPower : BigInt(votingPower);
  const powerStr = power.toString();
  
  if (power === 0n) {
    return '0';
  }
  
  // Convert from octas to tokens (divide by 10^8)
  const tokens = Number(power) / 100000000;
  
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else if (tokens >= 1) {
    return tokens.toFixed(2);
  } else {
    return tokens.toFixed(4);
  }
}

// RECOMMENDED FRONTEND USAGE:
/*
// 1. SIMPLE STATUS CHECK (recommended for proposal creation button)
const statusCode = await client.view({
  function: `${MODULE_ADDRESS}::proposal::get_user_status_code`,
  arguments: [daoAddress, userAddress]
});
// Returns: 0=Not member, 1=Member, 2=Council, 3=Admin

// 2. DIRECT CHECKS (most reliable)
const isAdmin = await client.view({
  function: `${MODULE_ADDRESS}::proposal::is_user_admin`,
  arguments: [daoAddress, userAddress]
});

const isMember = await client.view({
  function: `${MODULE_ADDRESS}::proposal::is_user_member`, 
  arguments: [daoAddress, userAddress]
});

const canCreateProposals = await client.view({
  function: `${MODULE_ADDRESS}::proposal::can_user_create_proposals`,
  arguments: [daoAddress, userAddress]
});

// 3. FRONTEND LOGIC FOR PROPOSAL CREATION BUTTON
function getProposalButtonText(statusCode, canCreate) {
  if (statusCode === 3) return "Create Proposal (Admin)";
  if (statusCode === 2) return "Create Proposal (Council)";
  if (statusCode === 1 && canCreate) return "Create Proposal (Member)";
  if (statusCode === 1) return "Need Higher Stake";
  return "Need to Join DAO";
}

// 4. STATUS DISPLAY
const statusText = getRoleDisplayName(statusCode[0]);
const statusDisplay = getStatusDisplay(statusText);
console.log(`${statusDisplay.icon} ${statusText}`);
*/