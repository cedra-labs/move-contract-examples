// Activity type constants from contract
export const ACTIVITY_TYPES = {
  1: { type: 'dao_created', title: 'DAO Created', icon: '' },
  2: { type: 'member_joined', title: 'Member Joined', icon: '' },
  3: { type: 'member_left', title: 'Member Left', icon: '' },
  4: { type: 'proposal_created', title: 'Proposal Created', icon: '' },
  5: { type: 'proposal_voted', title: 'Proposal Voted', icon: '' },
  6: { type: 'proposal_executed', title: 'Proposal Executed', icon: '' },
  7: { type: 'stake', title: 'Tokens Staked', icon: '' },
  8: { type: 'unstake', title: 'Tokens Unstaked', icon: '' },
  9: { type: 'treasury_deposit', title: 'Treasury Deposit', icon: '' },
  10: { type: 'treasury_withdrawal', title: 'Treasury Withdrawal', icon: '' },
  11: { type: 'reward_claimed', title: 'Rewards Claimed', icon: '' },
  12: { type: 'launchpad_created', title: 'Launchpad Created', icon: '' },
  13: { type: 'launchpad_investment', title: 'Launchpad Investment', icon: '' },
} as const;

// Activity type enum for type safety
export enum ActivityTypeEnum {
  DAO_CREATED = 1,
  MEMBER_JOINED = 2,
  MEMBER_LEFT = 3,
  PROPOSAL_CREATED = 4,
  PROPOSAL_VOTED = 5,
  PROPOSAL_EXECUTED = 6,
  STAKE = 7,
  UNSTAKE = 8,
  TREASURY_DEPOSIT = 9,
  TREASURY_WITHDRAWAL = 10,
  REWARD_CLAIMED = 11,
  LAUNCHPAD_CREATED = 12,
  LAUNCHPAD_INVESTMENT = 13
}

// Type-safe activity type keys
export type ActivityTypeKey = keyof typeof ACTIVITY_TYPES;

// Activity display configuration
export const ACTIVITY_CONFIG = {
  // Default pagination settings
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  
  // Refresh intervals (in milliseconds)
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  FAST_REFRESH_INTERVAL: 5000,  // 5 seconds (for active users)
  
  // Activity colors for different types (hex)
  ACTIVITY_COLORS: {
    dao_created: '#10b981',        // green
    member_joined: '#3b82f6',      // blue
    member_left: '#f59e0b',        // amber
    proposal_created: '#8b5cf6',   // violet
    proposal_voted: '#06b6d4',     // cyan
    proposal_executed: '#10b981',  // green
    stake: '#14b8a6',              // teal
    unstake: '#f97316',            // orange
    treasury_deposit: '#059669',   // emerald
    treasury_withdrawal: '#dc2626', // red
    reward_claimed: '#d97706',     // amber
    launchpad_created: '#7c3aed',  // violet
    launchpad_investment: '#be185d' // pink
  },
  
  // Tailwind CSS classes for activities
  ACTIVITY_STYLES: {
    dao_created: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    member_joined: 'bg-green-500/20 text-green-300 border-green-500/30',
    member_left: 'bg-red-500/20 text-red-300 border-red-500/30',
    proposal_created: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    proposal_voted: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    proposal_executed: 'bg-green-500/20 text-green-300 border-green-500/30',
    stake: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    unstake: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    treasury_deposit: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    treasury_withdrawal: 'bg-red-500/20 text-red-300 border-red-500/30',
    reward_claimed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    launchpad_created: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    launchpad_investment: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  }
};

// Helper function to get activity info by type ID
export const getActivityInfo = (typeId: number) => {
  return ACTIVITY_TYPES[typeId as ActivityTypeKey] || {
    type: 'unknown',
    title: 'Unknown Activity',
    icon: ''
  };
};

// Helper function to get activity color
export const getActivityColor = (activityType: string) => {
  return ACTIVITY_CONFIG.ACTIVITY_COLORS[activityType as keyof typeof ACTIVITY_CONFIG.ACTIVITY_COLORS] || '#6b7280';
};

// Helper function to get activity styles (Tailwind classes)
export const getActivityStyles = (activityType: string) => {
  return ACTIVITY_CONFIG.ACTIVITY_STYLES[activityType as keyof typeof ACTIVITY_CONFIG.ACTIVITY_STYLES] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};