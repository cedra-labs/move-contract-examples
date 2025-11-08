"use client";

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { formatAddress } from "@/lib/utils";
import { Wallet, LogOut, Copy, Check, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WalletModal from "./WalletModal";
import PrivateKeyModal from "./PrivateKeyModal";

export default function ConnectWallet() {
  const { address, connected, generateWallet, restoreWallet, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrivateKeyModalOpen, setIsPrivateKeyModalOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState<string>("");

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const handleGenerateWallet = async () => {
    const result = await generateWallet();
    return result;
  };

  const handleViewPrivateKey = () => {
    //We retrieve private key from localStorage
    const savedPrivateKey = localStorage.getItem("cedra_wallet_key");
    if (savedPrivateKey) {
      setPrivateKey(savedPrivateKey);
      setIsPrivateKeyModalOpen(true);
    }
  };

  return (
    <>
      {connected && address ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass glass-hover glow-border px-6 py-3 rounded-2xl flex items-center gap-3"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-glow"></div>
          <button
            onClick={handleCopyAddress}
            className="font-mono text-sm hover:text-cyan-400 transition-colors flex items-center gap-2"
            title="Click to copy full address"
          >
            {formatAddress(address)}
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="w-4 h-4 text-green-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Copy className="w-3.5 h-3.5 opacity-50" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={handleViewPrivateKey}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="View private key"
            aria-label="View private key"
          >
            <Key className="w-4 h-4 text-yellow-400" />
          </button>
          <button
            onClick={disconnect}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="glass glass-hover glow-border px-8 py-3 rounded-2xl flex items-center gap-3 btn-press font-semibold"
        >
          <Wallet className="w-5 h-5" />
          <span>Connect Wallet</span>
        </motion.button>
      )}

      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerateWallet={handleGenerateWallet}
        onRestoreWallet={restoreWallet}
      />

      <PrivateKeyModal
        isOpen={isPrivateKeyModalOpen}
        onClose={() => setIsPrivateKeyModalOpen(false)}
        privateKey={privateKey}
      />
    </>
  );
}
