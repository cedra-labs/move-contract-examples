export interface DAO {
  id: string;
  name: string;
  description: string;
  image: string;
  background?: string;
  subname?: string;
  chain: string;
  tokenName?: string;
  tokenSymbol?: string;
  initialSupply?: string;
  minimumStake?: string;
  votingPeriod?: string;
  quorum?: string;
  threshold?: string;
  proposalThreshold?: string;
  adminRole?: string;
  councils?: string[];
  tvl: string;
  proposals: number;
  members: number;
  established: string;
  category: 'featured' | 'chain' | 'community';
  isFollowing?: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'draft';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  timeLeft: string;
  author: string;
  created: string;
}

export interface Member {
  id: string;
  address: string;
  shortAddress: string;
  votingPower: number;
  tokensHeld: number;
  joinDate: string;
  isActive: boolean;
}

export interface TreasuryAsset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  change: string;
  changePositive: boolean;
  color: string;
}