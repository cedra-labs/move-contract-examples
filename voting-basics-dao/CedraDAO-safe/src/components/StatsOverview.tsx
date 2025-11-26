import React, { useState, useEffect } from 'react';
import { Building2, FileText, Vote, Users, DollarSign, TrendingUp, Globe } from 'lucide-react';
import { usePlatformStats } from '../useServices/usePlatformStats';
import { NETWORK_CONFIG } from '../cedra_service/constants';

const StatsOverview: React.FC = () => {
  const { stats: platformStats, isLoading, error, lastUpdated } = usePlatformStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const stats = [
    {
      label: 'Total DAOs',
      value: isLoading ? '...' : formatNumber(platformStats.totalDAOs),
      change: '+New',
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Active Proposals',
      value: isLoading ? '...' : formatNumber(platformStats.activeProposals),
      change: '+Live',
      icon: FileText,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Total Votes',
      value: isLoading ? '...' : formatNumber(platformStats.totalVotes),
      change: '+Active',
      icon: Vote,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Community Members',
      value: isLoading ? '...' : formatNumber(platformStats.totalMembers),
      change: '+Growing',
      icon: Users,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10'
    }
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Live Feed</h2>
        <button className="text-[#e1fd6a] hover:text-[#e1fd6a]/80 transition-colors p-1.5 hover:bg-gray-800/50 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {/* Professional Stats Cards - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          return (
            <div
              key={index}
              className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/40 p-4"
            >
              <div className="text-xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-red-400 text-xs">Error loading stats</span>
        </div>
      )}
    </div>
  );
};

export default StatsOverview;