"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, AlertTriangle, Eye, EyeOff, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PrivateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  privateKey: string;
}

export default function PrivateKeyModal({ isOpen, onClose, privateKey }: PrivateKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowKey(false);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy private key:", err);
    }
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
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto"
          >
            <div className="glass glow-border rounded-3xl p-8 max-w-lg w-full relative scale-in">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                  <Key className="w-6 h-6 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold gradient-text-animated">Private Key</h2>
              </div>

              {/* Security Warning UX */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl mb-6"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm text-red-300">
                    <p className="font-semibold">⚠️ Security Warning</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Never share your private key with anyone</li>
                      <li>• Anyone with this key has full access to your wallet</li>
                      <li>• Store it in a secure location offline</li>
                      <li>• We cannot recover your key if you lose it</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Private Key show */}
              <div className="space-y-4">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-text-secondary">
                      Your Private Key
                    </label>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label={showKey ? "Hide private key" : "Show private key"}
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <div className="font-mono text-sm bg-black/30 p-4 rounded-lg break-all border border-white/10">
                      {showKey ? (
                        <span className="text-cyan-300">{privateKey}</span>
                      ) : (
                        <span className="text-gray-600 select-none">
                          ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Copy */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopy}
                  className="w-full glass glass-hover glow-border rounded-2xl p-4 flex items-center justify-center gap-3 btn-press"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-green-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 text-cyan-400" />
                      <span className="font-semibold">Copy Private Key</span>
                    </>
                  )}
                </motion.button>

                {/* Additional Warning */}
                <p className="text-xs text-center text-text-muted">
                  Make sure you&apos;re in a private location before revealing your key
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
