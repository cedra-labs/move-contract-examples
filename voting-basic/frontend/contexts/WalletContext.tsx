"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Account, Ed25519PrivateKey } from "@cedra-labs/ts-sdk";

interface WalletContextType {
  account: Account | null;
  address: string | null;
  connected: boolean;
  generateWallet: () => Promise<{ privateKey: string; address: string }>;
  restoreWallet: (privateKeyString: string) => Promise<{ address: string }>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  address: null,
  connected: false,
  generateWallet: async () => ({ privateKey: '', address: '' }),
  restoreWallet: async () => ({ address: '' }),
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const savedPrivateKey = localStorage.getItem("cedra_wallet_key");

    if (savedPrivateKey) {
      try {
        const privateKey = new Ed25519PrivateKey(savedPrivateKey);
        const acc = Account.fromPrivateKey({ privateKey });
        setAccount(acc);
        setAddress(acc.accountAddress.toString());
      } catch (error) {
        console.error("Error loading wallet:", error);
        localStorage.removeItem("cedra_wallet_key");
      }
    }
  }, []);

  const generateWallet = async () => {
    try {
      const privateKey = Ed25519PrivateKey.generate();
      const acc = Account.fromPrivateKey({ privateKey });
      localStorage.setItem("cedra_wallet_key", privateKey.toString());
      setAccount(acc);
      setAddress(acc.accountAddress.toString());

      return {
        privateKey: privateKey.toString(),
        address: acc.accountAddress.toString(),
      };
    } catch (error) {
      console.error("Error generating wallet:", error);
      throw error;
    }
  };

  const restoreWallet = async (privateKeyString: string) => {
    try {
      const privateKey = new Ed25519PrivateKey(privateKeyString);
      const acc = Account.fromPrivateKey({ privateKey });

      // Save to localStorage
      localStorage.setItem("cedra_wallet_key", privateKey.toString());

      setAccount(acc);
      setAddress(acc.accountAddress.toString());

      return {
        address: acc.accountAddress.toString(),
      };
    } catch (error) {
      console.error("Error restoring wallet:", error);
      throw error;
    }
  };

  const disconnect = () => {
    setAccount(null);
    setAddress(null);

    localStorage.removeItem("cedra_wallet_key");
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        address,
        connected: !!address,
        generateWallet,
        restoreWallet,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
