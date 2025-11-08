"use client";

import { useState, useEffect } from "react";
import { getAllProposals, Proposal, checkPlatformInitialized, initializePlatform, createProposal } from "@/lib/cedra";
import { Vote, Loader2, Rocket, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import ConnectWallet from "@/components/ConnectWallet";
import VoteModal from "@/components/VoteModal";
import { useWallet } from "@/contexts/WalletContext";
import TabNavigation from "@/components/TabNavigation";
import OverviewTab from "@/components/tabs/OverviewTab";
import ProposalsTab from "@/components/tabs/ProposalsTab";
import VotersTab from "@/components/tabs/VotersTab";
import CreateTab from "@/components/tabs/CreateTab";

type TabType = 'overview' | 'proposals' | 'voters' | 'create';

export default function Home() {
  const { account, connected } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initSuccess, setInitSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    checkAndLoadData();
  }, []);

  const checkAndLoadData = async () => {
    setLoading(true);
    try {
      const initialized = await checkPlatformInitialized();
      setIsInitialized(initialized);

      if (initialized) {
        const data = await getAllProposals();
        setProposals(data);
      }
    } catch (error) {
      console.error("Error checking platform:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const data = await getAllProposals();
      setProposals(data);
    } catch (error) {
      console.error("Error loading proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!account || !connected) {
      setInitError("Please connect your wallet first");
      return;
    }

    setIsInitializing(true);
    setInitError(null);
    setInitSuccess(false);

    try {
      await initializePlatform(account);
      setInitSuccess(true);
      setIsInitialized(true);

      // Refresh data after initialization
      setTimeout(() => {
        checkAndLoadData();
      }, 2000);
    } catch (error: any) {
      console.error("Initialization error:", error);
      setInitError(error.message || "Failed to initialize platform");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleVoteSuccess = () => {
    loadProposals();
  };

  const handleCreateProposal = async (description: string, duration: number) => {
    if (!account || !connected) {
      throw new Error("Please connect your wallet first");
    }
    await createProposal(account, description, duration);
    await loadProposals();
  };

  const handleProposalSelect = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsVoteModalOpen(true);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
  };

  return (
    <div className="min-h-screen relative z-0">
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">WeDecide</h1>
                <p className="text-xs text-text-muted">Decentralized Governance</p>
              </div>
            </div>

            <div>
              <ConnectWallet />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-text-secondary">Loading platform...</p>
            </div>
          </div>
        )}

        {/* Initialization of Required State */}
        {!loading && !isInitialized && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl p-12 text-center"
            >
              <Rocket className="w-16 h-16 text-primary mx-auto mb-4" />
              <h4 className="text-2xl font-bold mb-2">Platform Not Initialized</h4>
              <p className="text-text-secondary mb-6">
                The voting platform needs to be initialized before proposals can be created.
                {!connected && " Please connect your wallet to initialize."}
              </p>

              {/* init Error */}
              {initError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl mb-6 max-w-md mx-auto text-red-400"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{initError}</span>
                </motion.div>
              )}

              {/* Success Message */}
              {initSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-xl mb-6 max-w-md mx-auto text-green-400"
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Platform initialized successfully!</span>
                </motion.div>
              )}

              {/* Wallet Warning */}
              {!connected && (
                <div className="flex items-center gap-3 p-4 bg-warning/20 border border-warning/30 rounded-xl mb-6 max-w-md mx-auto text-warning">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Connect your wallet to initialize the platform</span>
                </div>
              )}

              <motion.button
                onClick={handleInitialize}
                disabled={isInitializing || !connected}
                whileHover={!isInitializing && connected ? { scale: 1.05 } : {}}
                whileTap={!isInitializing && connected ? { scale: 0.95 } : {}}
                className="glass glass-hover glow-border px-8 py-4 rounded-2xl flex items-center gap-2 btn-press font-semibold mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Platform...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Initialize Platform
                  </>
                )}
              </motion.button>

              <p className="text-xs text-text-muted mt-4">
                This is a one-time operation that creates the voting platform resource on-chain.
              </p>
            </motion.div>
          </div>
        )}

        {/* Tab-Based Interface (When we have Initialized) */}
        {!loading && isInitialized && (
          <>
            <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === 'overview' && (
              <OverviewTab proposals={proposals} loading={false} />
            )}

            {activeTab === 'proposals' && (
              <ProposalsTab
                proposals={proposals}
                loading={false}
                onProposalClick={handleProposalSelect}
              />
            )}

            {activeTab === 'voters' && (
              <VotersTab proposals={proposals} loading={false} />
            )}

            {activeTab === 'create' && (
              <CreateTab
                onCreateProposal={handleCreateProposal}
                loading={false}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-text-muted">
            <p>Built on Cedra Blockchain • Powered by Move Smart Contracts</p>
            <p className="mt-2">Community-driven governance for the decentralized future</p>
          </div>
        </div>
      </footer>

      {/* Vote Modal */}
      {selectedProposal && (
        <VoteModal
          proposal={selectedProposal}
          isOpen={isVoteModalOpen}
          onClose={() => setIsVoteModalOpen(false)}
          onSuccess={handleVoteSuccess}
        />
      )}
    </div>
  );
}
