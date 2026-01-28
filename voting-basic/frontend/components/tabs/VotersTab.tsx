'use client';

import { Proposal } from '@/lib/cedra';
import { CheckCircle2, XCircle, TrendingUp, BarChart3, FileText } from 'lucide-react';
import { useState, useMemo } from 'react';

interface VotersTabProps {
  proposals: Proposal[];
  loading: boolean;
}

export default function VotersTab({ proposals, loading }: VotersTabProps) {
  //current time once on mount
  const [currentTime] = useState(() => Math.floor(Date.now() / 1000));

  //total stats from proposals
  const totalVotesCast = proposals.reduce((sum, p) => sum + p.yes_votes + p.no_votes, 0);
  const totalYesVotes = proposals.reduce((sum, p) => sum + p.yes_votes, 0);
  const totalNoVotes = proposals.reduce((sum, p) => sum + p.no_votes, 0);
  const totalProposals = proposals.length;
  const activeProposals = proposals.filter(p => p.end_time > currentTime).length;

  //voting engagement per proposal
  const proposalStats = useMemo(() => proposals.map(proposal => ({
    id: proposal.id,
    description: proposal.description,
    totalVotes: proposal.yes_votes + proposal.no_votes,
    yesVotes: proposal.yes_votes,
    noVotes: proposal.no_votes,
    yesPercentage: proposal.yes_votes + proposal.no_votes > 0
      ? Math.round((proposal.yes_votes / (proposal.yes_votes + proposal.no_votes)) * 100)
      : 0,
    noPercentage: proposal.yes_votes + proposal.no_votes > 0
      ? Math.round((proposal.no_votes / (proposal.yes_votes + proposal.no_votes)) * 100)
      : 0,
    isActive: proposal.end_time > currentTime,
  })).sort((a, b) => b.totalVotes - a.totalVotes), [proposals, currentTime]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading voting data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Total Proposals</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalProposals}</div>
          <div className="text-xs text-gray-500 mt-1">{activeProposals} active</div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400">Total Votes</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalVotesCast}</div>
          <div className="text-xs text-gray-500 mt-1">Across all proposals</div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-400">Yes Votes</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalYesVotes}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalVotesCast > 0 ? Math.round((totalYesVotes / totalVotesCast) * 100) : 0}% of total
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">No Votes</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalNoVotes}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalVotesCast > 0 ? Math.round((totalNoVotes / totalVotesCast) * 100) : 0}% of total
          </div>
        </div>
      </div>

      {/* Voting Analytics by Proposal */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Voting Analytics by Proposal</h3>
        </div>
      </div>

      {proposalStats.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No analytics data yet</h3>
          <p className="text-gray-400">
            Create proposals and start voting to see analytics here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposalStats.map((stat) => (
            <div key={stat.id} className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-semibold">Proposal #{stat.id}</h4>
                    {stat.isActive ? (
                      <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-xs text-emerald-400 font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/20 border border-gray-500/50 rounded-lg text-xs text-gray-400 font-medium">
                        Ended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {stat.description}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-white">{stat.totalVotes}</div>
                  <div className="text-xs text-gray-500">total votes</div>
                </div>
              </div>

              {/* Vote Breakdown */}
              <div className="space-y-3">
                {/* Yes Votes */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-400">Yes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{stat.yesVotes} votes</span>
                      <span className="text-emerald-400 font-semibold min-w-[45px] text-right">
                        {stat.yesPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{ width: `${stat.yesPercentage}%` }}
                    />
                  </div>
                </div>

                {/* No Votes */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-gray-400">No</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{stat.noVotes} votes</span>
                      <span className="text-red-400 font-semibold min-w-[45px] text-right">
                        {stat.noPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                      style={{ width: `${stat.noPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
