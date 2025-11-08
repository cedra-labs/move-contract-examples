"use client";

import { Proposal } from "@/lib/cedra";
import {
  formatTimeRemaining,
  calculatePercentage,
  formatAddress,
  cn,
} from "@/lib/utils";
import { Clock, ThumbsUp, ThumbsDown, TrendingUp, User } from "lucide-react";
import { motion } from "framer-motion";

interface ProposalCardProps {
  proposal: Proposal;
  onClick?: () => void;
}

export default function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const totalVotes = proposal.yes_votes + proposal.no_votes;
  const yesPercentage = calculatePercentage(proposal.yes_votes, totalVotes);
  const noPercentage = calculatePercentage(proposal.no_votes, totalVotes);

  // eslint-disable-next-line react-hooks/purity
  const isActive = proposal.end_time > Math.floor(Date.now() / 1000);
  const timeRemaining = formatTimeRemaining(proposal.end_time);
  const isEndingSoon =
    // eslint-disable-next-line react-hooks/purity
    isActive && proposal.end_time - Math.floor(Date.now() / 1000) < 86400; // 24 hours

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      onClick={onClick}
      className={cn(
        "glass glass-hover glow-border rounded-3xl p-6 cursor-pointer card-lift relative overflow-hidden",
        isEndingSoon && "pulse-glow"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

      {/* Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2",
            isActive
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "bg-green-500" : "bg-red-500"
            )}
          />
          {isActive ? "Active" : "Ended"}
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="w-4 h-4" />
            <span>{timeRemaining}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(proposal.end_time * 1000).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Proposal ID and Creator */}
      <div className="space-y-1 mb-2">
        <div className="text-xs font-mono text-text-muted">#{proposal.id}</div>
        {proposal.creator && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <User className="w-3 h-3" />
            <span className="font-mono">{formatAddress(proposal.creator)}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <h3
        className={`text-xl font-bold mb-6 line-clamp-2 ${
          isActive ? "gradient-text" : "text-white"
        } `}
      >
        {proposal.description}
      </h3>

      {/* Vote Stats */}
      <div className="space-y-4">
        {/* Progress Bars */}
        <div className="space-y-3">
          {/* Yes Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-green-400">
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-semibold">Yes</span>
              </div>
              <span className="text-sm font-mono">
                {proposal.yes_votes} ({yesPercentage}%)
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${yesPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 shimmer"
              />
            </div>
          </div>

          {/* No Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-red-400">
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm font-semibold">No</span>
              </div>
              <span className="text-sm font-mono">
                {proposal.no_votes} ({noPercentage}%)
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${noPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 shimmer"
              />
            </div>
          </div>
        </div>

        {/* Total Votes */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Total Votes</span>
          </div>
          <span className="text-lg font-bold font-mono">{totalVotes}</span>
        </div>
      </div>

      {/* Ending Soon Warning */}
      {isEndingSoon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 px-4 py-2 bg-warning/20 border border-warning/30 rounded-xl text-sm text-warning flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          <span>Ending soon! Vote now</span>
        </motion.div>
      )}
    </motion.div>
  );
}
