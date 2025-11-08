'use client';

import { Proposal } from '@/lib/cedra';
import { FileText, TrendingUp, Clock, Vote, CheckCircle } from 'lucide-react';

interface OverviewTabProps {
  proposals: Proposal[];
  loading: boolean;
}

export default function OverviewTab({ proposals, loading }: OverviewTabProps) {
  // Calculate stats
  const totalProposals = proposals.length;
  // eslint-disable-next-line react-hooks/purity
  const activeProposals = proposals.filter(p => p.end_time > Math.floor(Date.now() / 1000)).length;
  const totalVotes = proposals.reduce((sum, p) => sum + p.yes_votes + p.no_votes, 0);
  const endedProposals = totalProposals - activeProposals;

  // Recent activity (last 3 proposals)
  const recentProposals = [...proposals]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading overview...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Total Proposals</span>
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white">{totalProposals}</div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Active</span>
            <Clock className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-400">{activeProposals}</div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Ended</span>
            <CheckCircle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-white">{endedProposals}</div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Total Votes</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">{totalVotes}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Vote className="w-5 h-5 text-cyan-400" />
          Recent Activity
        </h3>

        {recentProposals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No proposals yet. Create the first one!
          </div>
        ) : (
          <div className="space-y-4">
            {recentProposals.map((proposal) => {
              const totalVotes = proposal.yes_votes + proposal.no_votes;
              const yesPercentage = totalVotes > 0 ? Math.round((proposal.yes_votes / totalVotes) * 100) : 0;
              // eslint-disable-next-line react-hooks/purity
              const isActive = proposal.end_time > Math.floor(Date.now() / 1000);

              return (
                <div
                  key={proposal.id}
                  className="p-4 bg-white/5 rounded-xl hover:bg-white/[0.06] transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">#{proposal.id}</span>
                        <div
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {isActive ? 'Active' : 'Ended'}
                        </div>
                      </div>
                      <p className="text-white font-medium line-clamp-1">
                        {proposal.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Votes</div>
                      <div className="text-lg font-bold text-white">{totalVotes}</div>
                    </div>
                  </div>

                  {/* Vote Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                        style={{ width: `${yesPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{yesPercentage}% Yes</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
