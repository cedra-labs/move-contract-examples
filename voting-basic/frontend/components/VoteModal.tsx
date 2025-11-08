"use client";

import { useState, useEffect } from "react";
import { Proposal, voteYes, voteNo, getProposalVoters } from "@/lib/cedra";
import { useWallet } from "@/contexts/WalletContext";
import { formatTimeRemaining, formatAddress } from "@/lib/utils";
import { X, ThumbsUp, ThumbsDown, Loader2, CheckCircle, AlertCircle, Users, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoteModalProps {
  proposal: Proposal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VoteModal({ proposal, isOpen, onClose, onSuccess }: VoteModalProps) {
  const { account, connected, address } = useWallet();
  const [isVoting, setIsVoting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voters, setVoters] = useState<string[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // We reset state when modal opens or proposal changes
  useEffect(() => {
    if (isOpen) {
      setTxHash(null);
      setError(null);
      setIsVoting(false);
      setHasVoted(false);
      fetchVoters();
    }
  }, [isOpen, proposal.id]);

  useEffect(() => {
    if (address && voters.length > 0) {
      const voted = voters.some(voter => voter.toLowerCase() === address.toLowerCase());
      setHasVoted(voted);
    } else {
      setHasVoted(false);
    }
  }, [voters, address]);

  const fetchVoters = async () => {
    setLoadingVoters(true);
    try {
      const voterList = await getProposalVoters(proposal.id);
      setVoters(voterList);
    } catch (err) {
      console.error("Error fetching voters:", err);
    } finally {
      setLoadingVoters(false);
    }
  };

  const handleVote = async (voteType: "yes" | "no") => {
    if (!account || !connected) {
      setError("Please connect your wallet first");
      return;
    }

    setIsVoting(true);
    setError(null);

    try {
      const hash = voteType === "yes"
        ? await voteYes(account, proposal.id)
        : await voteNo(account, proposal.id);

      setTxHash(hash);

      // Refresh voter list 
      await fetchVoters();

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Vote error:", err);
      setError(err.message || "Failed to submit vote. You may have already voted.");
    } finally {
      setIsVoting(false);
    }
  };

  const isActive = proposal.end_time > Math.floor(Date.now() / 1000);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass glow-border rounded-3xl p-8 max-w-lg w-full relative scale-in">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {txHash && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2 gradient-text">Vote Submitted!</h3>
                  <p className="text-text-secondary mb-4">Your vote has been recorded on-chain</p>
                  <a
                    href={`https://cedrascan.com/txn/${txHash}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                  >
                    View on Explorer
                  </a>
                </motion.div>
              )}

              {/* Voting Interface */}
              {!txHash && (
                <>
                  <h2 className="text-3xl font-bold mb-6 gradient-text-animated">Cast Your Vote</h2>

                  {/* Proposal Info */}
                  <div className="glass rounded-2xl p-6 mb-6">
                    <div className="text-xs font-mono text-text-muted mb-2">Proposal #{proposal.id}</div>
                    {proposal.creator && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-mono">{formatAddress(proposal.creator)}</span>
                      </div>
                    )}
                    <p className="text-lg font-semibold mb-4">{proposal.description}</p>
                    <div className="flex justify-between text-sm text-text-secondary">
                      <span>Time Remaining:</span>
                      <span className="font-semibold">{formatTimeRemaining(proposal.end_time)}</span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl mb-6 text-red-400"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </motion.div>
                  )}

                  {/* Already Voted partss */}
                  {hasVoted && !txHash && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl mb-6 text-blue-400"
                    >
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-semibold">You have already voted on this proposal</span>
                    </motion.div>
                  )}

                  {/* Vote Buttons */}
                  {!isActive ? (
                    <div className="text-center py-8 text-text-secondary">
                      <p>Voting has ended for this proposal</p>
                    </div>
                  ) : hasVoted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Already Voted</h3>
                      <p className="text-text-secondary">Your vote has been recorded for this proposal</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Vote Yes */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleVote("yes")}
                        disabled={isVoting || !connected || hasVoted}
                        className="glass glass-hover glow-border rounded-2xl p-6 flex flex-col items-center gap-3 btn-press disabled:opacity-50 disabled:cursor-not-allowed border-green-500/30 hover:bg-green-500/10"
                      >
                        {isVoting ? (
                          <Loader2 className="w-12 h-12 animate-spin text-green-400" />
                        ) : (
                          <ThumbsUp className="w-12 h-12 text-green-400" />
                        )}
                        <span className="text-lg font-bold text-green-400">Vote Yes</span>
                        <span className="text-sm text-text-secondary">{proposal.yes_votes} votes</span>
                      </motion.button>

                      {/* Vote No */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleVote("no")}
                        disabled={isVoting || !connected || hasVoted}
                        className="glass glass-hover glow-border rounded-2xl p-6 flex flex-col items-center gap-3 btn-press disabled:opacity-50 disabled:cursor-not-allowed border-red-500/30 hover:bg-red-500/10"
                      >
                        {isVoting ? (
                          <Loader2 className="w-12 h-12 animate-spin text-red-400" />
                        ) : (
                          <ThumbsDown className="w-12 h-12 text-red-400" />
                        )}
                        <span className="text-lg font-bold text-red-400">Vote No</span>
                        <span className="text-sm text-text-secondary">{proposal.no_votes} votes</span>
                      </motion.button>
                    </div>
                  )}

                  {/* Wallet Connection Message */}
                  {!connected && (
                    <p className="text-center text-sm text-text-muted mt-6">
                      Please connect your wallet to vote
                    </p>
                  )}

                  {/* Voter List */}
                  {voters.length > 0 && (
                    <div className="mt-6 glass rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-semibold text-lg">
                          Voters ({voters.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {voters.map((voter, index) => (
                          <motion.div
                            key={voter}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 p-3 glass-hover rounded-lg"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1 font-mono text-sm text-text-secondary truncate">
                              {voter}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading Voters */}
                  {loadingVoters && voters.length === 0 && (
                    <div className="mt-6 glass rounded-2xl p-6 flex items-center justify-center gap-3 text-text-secondary">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading voters...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
