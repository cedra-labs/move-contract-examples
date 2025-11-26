import React, { useEffect, useState } from 'react';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { FaCheckCircle } from 'react-icons/fa';

interface ProposalDetailsProps {
  title?: string;
  description?: string;
  proposer?: string; // full address
  endsAt?: string;   // ISO date string or friendly text
  votingStart?: string; // ISO date string for voting start
  votingEnd?: string;   // ISO date string for voting end
  quorumCurrentPercent?: number;
  quorumRequiredPercent?: number;
  category?: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  status?: string;
  proposalId?: string;
  createdAt?: string;
  daoName?: string; // Actual DAO name
  onVote?: (voteType: number) => void;
  onStartVoting?: () => void;
  onFinalize?: () => void;
  canVote?: boolean;
  hasVoted?: boolean;
  canStartVoting?: boolean; // true if user is proposer or admin
  canFinalize?: boolean; // true if user can finalize proposals (admin or member with proposal creation rights)
  userAddress?: string;
  userIsAdmin?: boolean;
  userIsCouncil?: boolean;
  userIsMember?: boolean;
}



const toMonthYear = (value?: string) => {
  if (!value) return '';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return value; // assume already friendly
  return asDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const toDateTimeString = (value?: string) => {
  if (!value) return '';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return value; // assume already friendly
  return asDate.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'text-blue-400 bg-blue-500/20';
    case 'passed': return 'text-green-400 bg-green-500/20';
    case 'rejected': return 'text-red-400 bg-red-500/20';
    case 'executed': return 'text-purple-400 bg-purple-500/20';
    case 'cancelled': return 'text-gray-400 bg-gray-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
};



const VoteDistributionBar: React.FC<{ forVotes: number; againstVotes: number; abstainVotes: number; total: number }>
  = ({ forVotes, againstVotes, abstainVotes, total }) => {
  const forPct = total > 0 ? (forVotes / total) * 100 : 0;
  const againstPct = total > 0 ? (againstVotes / total) * 100 : 0;
  const abstainPct = total > 0 ? (abstainVotes / total) * 100 : 0;
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-400">
        <span>{forPct.toFixed(0)}% Yes</span>
        <span>{againstPct.toFixed(0)}% No</span>
        <span>{abstainPct.toFixed(0)}% Abstain</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden flex">
        <div className="bg-green-500 h-3" style={{ width: `${forPct}%` }} />
        <div className="bg-red-500 h-3" style={{ width: `${againstPct}%` }} />
        <div className="bg-yellow-500 h-3" style={{ width: `${abstainPct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-green-400">For {forVotes}</span>
        <span className="text-red-400">Against {againstVotes}</span>
        <span className="text-yellow-400">Abstain {abstainVotes}</span>
        <span className="text-gray-400">Total {total}</span>
      </div>
    </div>
  );
};

const DAOProposalDetails: React.FC<ProposalDetailsProps> = ({
  title = 'Send funds to Development Fund SubDAO',
  description = 'Send funds from the treasury to our Development Fund SubDAO in order to continue funding development.',
  proposer = '0xe2bd7f4b6a2aa345c7b149ea',
  endsAt = new Date('2025-08-01').toISOString(),
  votingStart,
  votingEnd,
  quorumCurrentPercent = 20.65,
  quorumRequiredPercent = 15,
  category = 'general',
  votesFor = 100,
  votesAgainst = 0,
  votesAbstain = 0,
  status = 'draft',
  proposalId = '00015',
  createdAt,
  daoName,
  onVote,
  onStartVoting,
  onFinalize,
  canVote = true,
  hasVoted = false,
  canStartVoting = true,
  canFinalize = false,
  userAddress,
  userIsAdmin,
  userIsCouncil,
  userIsMember
}) => {
  const total = votesFor + votesAgainst + votesAbstain;
  const [isVoting, setIsVoting] = useState(false);
  const [voters, setVoters] = useState<string[]>([]);

  // Fetch voters using ABI view when proposalId present
  useEffect(() => {
    const fetchVoters = async () => {
      try {
        if (!proposalId) return;
        const res = await cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::proposal::get_proposal_voters`,
            functionArguments: [/* dao address not needed if id scoped? use proposer dao? */],
          }
        } as any).catch(() => null);
      } catch {}
    };
  }, [proposalId]);

  const handleVoteClick = async (voteType: number) => {
    setIsVoting(true);
    try {
      await onVote?.(voteType);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Left sidebar info */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="professional-card rounded-xl p-4">
            <h4 className="text-sm text-gray-400 mb-2">Status</h4>
            <div className="text-sm text-gray-400 mb-4">
              {status === 'active'
                ? `This proposal is currently active for voting with a turnout of ${quorumCurrentPercent.toFixed(1)}%.`
                : status === 'executed'
                ? `This proposal is closed for voting with a turnout of ${quorumCurrentPercent.toFixed(1)}% and was executed.`
                : status === 'passed'
                ? `This proposal passed with a turnout of ${quorumCurrentPercent.toFixed(1)}% and is awaiting execution.`
                : `This proposal is ${status} with a turnout of ${quorumCurrentPercent.toFixed(1)}%.`
              }
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">DAO</span>
                <span className="text-white">{daoName || 'Unknown DAO'}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Creator</span>
                <span className="text-white">{proposer ? `${proposer.slice(0, 6)}...${proposer.slice(-4)}` : 'Unknown'}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`capitalize ${getStatusColor(status)} px-2 py-1 rounded text-xs`}>
                  {status}
                </span>
              </div>

              {/* User roles */}
              {(userIsAdmin || userIsCouncil || userIsMember) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {userIsAdmin && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>
                  )}
                  {userIsCouncil && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Council</span>
                  )}
                  {userIsMember && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">Member</span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Start</span>
                  <span className="text-white text-xs">{toDateTimeString(votingStart || createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">End</span>
                  <span className="text-white text-xs">{toDateTimeString(votingEnd || endsAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-4 space-y-6">
          {/* Header */}
          <div className="professional-card rounded-xl p-6">
            <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
            <p className="text-gray-300 mb-6">{description}</p>


          </div>
        </div>
      </div>

      {/* Vote Results - Full Width */}
      <div className="professional-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Ratio of votes</h3>
            <VoteDistributionBar 
              forVotes={votesFor}
              againstVotes={votesAgainst}
              abstainVotes={votesAbstain}
              total={total}
            />
            
            <div className="mt-6 space-y-4">
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{quorumCurrentPercent}% turnout</span>
                  <span className="text-white font-medium">{quorumRequiredPercent}% ✓</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min((quorumCurrentPercent / Math.max(quorumRequiredPercent, 0.001)) * 100, 100)}%`,
                      backgroundColor: '#facc16'
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Quorum</span>
                </div>
              </div>
            </div>

            {/* Start Voting button for draft proposals */}
            {status === 'draft' && canStartVoting && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <h4 className="text-blue-300 font-medium mb-2">Proposal is in Draft</h4>
                  <p className="text-sm text-blue-200/80 mb-3">
                    This proposal needs to be activated before voting can begin. 
                    {proposer === userAddress ? ' As the proposer, you can start voting.' : ' Only the proposer or an admin can start voting.'}
                  </p>
                </div>
                <button 
                  onClick={() => onStartVoting?.()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-all"
                >
                  Start Voting
                </button>
              </div>
            )}

            {/* Voting buttons for active proposals */}
            {status === 'active' && userAddress && !hasVoted && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-white font-medium mb-4">Cast your vote</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleVoteClick(1)}
                    disabled={isVoting}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVoting ? 'Voting...' : 'Vote Yes'}
                  </button>
                  <button
                    onClick={() => handleVoteClick(2)}
                    disabled={isVoting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVoting ? 'Voting...' : 'Vote No'}
                  </button>
                  <button
                    onClick={() => handleVoteClick(3)}
                    disabled={isVoting}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVoting ? 'Voting...' : 'Abstain'}
                  </button>
                </div>
              </div>
            )}

            {/* Draft status info for non-authorized users */}
            {status === 'draft' && !canStartVoting && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
                  <h4 className="text-gray-300 font-medium mb-2">Proposal is in Draft</h4>
                  <p className="text-sm text-gray-400">
                    Waiting for the proposer or an admin to start voting.
                  </p>
                </div>
              </div>
            )}

            {/* Finalization button for active proposals that have ended (Admin only) */}
            {status === 'active' && new Date() >= new Date(votingEnd || '') && userIsAdmin && onFinalize && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                  <h4 className="text-orange-300 font-medium mb-2">Voting Period Has Ended</h4>
                  <p className="text-sm text-orange-200/80 mb-3">
                    The voting period for this proposal has ended. The proposal needs to be finalized to determine the outcome based on votes and quorum. As an admin, you can finalize this proposal.
                  </p>
                </div>
                <button
                  onClick={() => onFinalize?.()}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-all"
                >
                  Finalize Proposal
                </button>
              </div>
            )}

            {/* Status message for non-admins when voting has ended */}
            {status === 'active' && new Date() >= new Date(votingEnd || '') && !userIsAdmin && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
                  <h4 className="text-gray-300 font-medium mb-2">Voting Ended</h4>
                  <p className="text-sm text-gray-400">
                    Awaiting finalization by admin
                  </p>
                </div>
              </div>
            )}

            {hasVoted && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-center py-4">
                  <FaCheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">You have voted on this proposal</p>
                </div>
              </div>
            )}
      </div>

      {/* Votes cast section - Full Width */}
      <div className="professional-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Votes cast</h3>
        <div className="text-center py-8 text-gray-400">
          <p>No individual votes to display</p>
        </div>
      </div>
    </div>
  );
};

export default DAOProposalDetails;