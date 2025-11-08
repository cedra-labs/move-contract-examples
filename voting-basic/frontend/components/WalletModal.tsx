"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Wallet,
  Sparkles,
  Download,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateWallet: () => Promise<{ privateKey: string; address: string }>;
  onRestoreWallet: (privateKey: string) => Promise<{ address: string }>;
}

export default function WalletModal({
  isOpen,
  onClose,
  onGenerateWallet,
  onRestoreWallet,
}: WalletModalProps) {
  const [generatedWallet, setGeneratedWallet] = useState<{
    privateKey: string;
    address: string;
  } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRestoreInput, setShowRestoreInput] = useState(false);
  const [restorePrivateKey, setRestorePrivateKey] = useState("");

  // Reset state when modal is closed 
  useEffect(() => {
    if (!isOpen) {
      setGeneratedWallet(null);
      setShowPrivateKey(true);
      setCopied(null);
      setError(null);
      setShowRestoreInput(false);
      setRestorePrivateKey("");
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const wallet = await onGenerateWallet();
      setGeneratedWallet(wallet);
      setShowPrivateKey(true); 
      toast.success("Wallet generated successfully!");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to generate wallet";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = async () => {
    if (!restorePrivateKey.trim()) {
      setError("Please enter a private key");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const result = await onRestoreWallet(restorePrivateKey.trim());
      toast.success("Wallet restored successfully!");
      handleDone();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to restore wallet";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDone = () => {
    setGeneratedWallet(null);
    setShowPrivateKey(true);
    setCopied(null);
    setError(null);
    setShowRestoreInput(false);
    setRestorePrivateKey("");
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDone}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        />

        {/* Modal  */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg glass border border-white/10 rounded-3xl p-8 shadow-2xl pointer-events-auto"
          >
            {/* Close  */}
            <button
              onClick={handleDone}
              className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {!generatedWallet ? (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 mb-4">
                    <Wallet className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {showRestoreInput ? "Restore Wallet" : "Connect Wallet"}
                  </h2>
                  <p className="text-gray-400">
                    {showRestoreInput
                      ? "Import your existing wallet"
                      : "Create a new wallet or restore existing one"}
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                {!showRestoreInput ? (
                  <div className="space-y-4">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full p-6 glass-light border-2 border-white/10 hover:border-cyan-500/50 rounded-2xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                            Generate Random Wallet
                          </h3>
                          <p className="text-sm text-gray-400">
                            Create a new wallet with a private key
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Restore  */}
                    <button
                      onClick={() => setShowRestoreInput(true)}
                      disabled={isGenerating}
                      className="w-full p-6 glass-light border-2 border-white/10 hover:border-purple-500/50 rounded-2xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Download className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                            Restore Existing Wallet
                          </h3>
                          <p className="text-sm text-gray-400">
                            Import wallet using your private key
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-3">
                        Enter Your Private Key
                      </label>
                      <textarea
                        value={restorePrivateKey}
                        onChange={(e) => setRestorePrivateKey(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                        rows={4}
                        disabled={isGenerating}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRestoreInput(false);
                          setRestorePrivateKey("");
                          setError(null);
                        }}
                        disabled={isGenerating}
                        className="flex-1 px-6 py-3 glass-light border border-white/10 hover:border-white/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleRestore}
                        disabled={isGenerating || !restorePrivateKey.trim()}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? "Restoring..." : "Restore Wallet"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Generated Wallet View */
              generatedWallet && (
                <div>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 mb-4">
                      <Sparkles className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Wallet Generated!
                    </h2>
                    <p className="text-gray-400">
                      Save your wallet information securely
                    </p>
                  </div>

                    {/* Address */}
                  <div className="space-y-4 mb-8">
                    <div className="p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-400">
                          Wallet Address
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(generatedWallet.address, "address")
                          }
                          className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {copied === "address" ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-white font-mono text-sm break-all">
                        {generatedWallet.address}
                      </p>
                    </div>

                    {/* Private Key */}
                    <div className="p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-400">
                          Private Key
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {showPrivateKey ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                Show
                              </>
                            )}
                          </button>
                          {showPrivateKey && (
                            <button
                              onClick={() =>
                                handleCopy(generatedWallet.privateKey, "key")
                              }
                              className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              {copied === "key" ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-white font-mono text-sm break-all">
                        {showPrivateKey
                          ? generatedWallet.privateKey
                          : "••••••••••••••••••••••••••••••••"}
                      </p>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-400">
                        <p className="font-semibold mb-1">Important!</p>
                        <p className="text-amber-400/80">
                          Save your private key securely. You&apos;ll need it to
                          restore your wallet. Never share it with anyone.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Done Button */}
                  <button
                    onClick={handleDone}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    I&apos;ve Saved My Wallet Info
                  </button>
                </div>
              )
            )}
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
