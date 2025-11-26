import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { WalletCore, type AccountInfo, type NetworkInfo, type InputTransactionData } from '@cedra-labs/wallet-adapter-core';
import { Network } from '@cedra-labs/ts-sdk';

interface CedraWalletContextState {
  connect: (walletName: string) => Promise<void>;
  disconnect: () => Promise<void>;
  account: AccountInfo | null;
  network: NetworkInfo | null;
  connected: boolean;
  wallet: any | null;
  wallets: ReadonlyArray<any>;
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>;
  signTransaction: (args: { transactionOrPayload: any; asFeePayer?: boolean }) => Promise<any>;
  signMessage: (message: any) => Promise<any>;
}

const CedraWalletContext = createContext<CedraWalletContextState | undefined>(undefined);

interface CedraWalletAdapterProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  network?: Network;
}

export const CedraWalletAdapterProvider: React.FC<CedraWalletAdapterProviderProps> = ({
  children,
  autoConnect = false,
  network = Network.TESTNET,
}) => {
  const walletCore = useMemo(() => {
    console.log('🏗️ Initializing WalletCore with network:', network);
    const core = new WalletCore(
      [], // optInWallets - empty array means all wallets
      { network }, // dappConfig
      false // disableTelemetry
    );

    // Log wallets immediately after creation
    setTimeout(() => {
      console.log('💼 WalletCore initialized with wallets:', {
        totalWallets: core.wallets.length,
        walletNames: core.wallets.map(w => w.name),
        notDetected: core.notDetectedWallets.length
      });
    }, 1000); // Give time for async wallet detection

    return core;
  }, [network]);

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [connected, setConnected] = useState(false);

  // Set up event listeners
  useEffect(() => {
    console.log('🎧 Setting up WalletCore event listeners');

    const handleConnect = (connectedAccount: AccountInfo | null) => {
      console.log(' WalletCore connect event:', connectedAccount);
      setAccount(connectedAccount);
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log(' WalletCore disconnect event');
      setAccount(null);
      setNetworkInfo(null);
      setConnected(false);
    };

    const handleAccountChange = (changedAccount: AccountInfo | null) => {
      console.log(' WalletCore account change event:', changedAccount);
      setAccount(changedAccount);
    };

    const handleNetworkChange = (changedNetwork: NetworkInfo | null) => {
      console.log('🌐 WalletCore network change event:', changedNetwork);
      setNetworkInfo(changedNetwork);
    };

    walletCore.on('connect', handleConnect);
    walletCore.on('disconnect', handleDisconnect);
    walletCore.on('accountChange', handleAccountChange);
    walletCore.on('networkChange', handleNetworkChange);

    // Log available wallets
    console.log('💼 Available wallets:', walletCore.wallets.map(w => w.name));

    return () => {
      walletCore.off('connect', handleConnect);
      walletCore.off('disconnect', handleDisconnect);
      walletCore.off('accountChange', handleAccountChange);
      walletCore.off('networkChange', handleNetworkChange);
    };
  }, [walletCore]);

  const connect = useCallback(async (walletName: string) => {
    console.log('🔌 Connecting to wallet:', walletName);
    try {
      await walletCore.connect(walletName);
      // Account and network will be set via event listeners
    } catch (error) {
      console.error(' Failed to connect wallet:', error);
      throw error;
    }
  }, [walletCore]);

  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting wallet');
    try {
      await walletCore.disconnect();
    } catch (error) {
      console.error(' Failed to disconnect wallet:', error);
      throw error;
    }
  }, [walletCore]);

  const signAndSubmitTransaction = useCallback(async (transaction: InputTransactionData) => {
    console.log('📝 Signing and submitting transaction via WalletCore');
    try {
      const result = await walletCore.signAndSubmitTransaction(transaction);
      console.log(' Transaction result:', result);
      return result;
    } catch (error) {
      console.error(' Failed to sign and submit transaction:', error);
      throw error;
    }
  }, [walletCore]);

  const signTransaction = useCallback(async (args: { transactionOrPayload: any; asFeePayer?: boolean }) => {
    console.log('📝 Signing transaction via WalletCore');
    try {
      const result = await walletCore.signTransaction(args);
      console.log(' Transaction signed:', result);
      return result;
    } catch (error) {
      console.error(' Failed to sign transaction:', error);
      throw error;
    }
  }, [walletCore]);

  const signMessage = useCallback(async (message: any) => {
    console.log('📝 Signing message via WalletCore');
    try {
      const result = await walletCore.signMessage(message);
      console.log(' Message signed:', result);
      return result;
    } catch (error) {
      console.error(' Failed to sign message:', error);
      throw error;
    }
  }, [walletCore]);

  const value = useMemo(() => ({
    connect,
    disconnect,
    account,
    network: networkInfo,
    connected,
    wallet: walletCore.wallet,
    wallets: walletCore.wallets,
    signAndSubmitTransaction,
    signTransaction,
    signMessage,
  }), [connect, disconnect, account, networkInfo, connected, walletCore, signAndSubmitTransaction, signTransaction, signMessage]);

  return (
    <CedraWalletContext.Provider value={value}>
      {children}
    </CedraWalletContext.Provider>
  );
};

export const useWallet = (): CedraWalletContextState => {
  const context = useContext(CedraWalletContext);
  if (!context) {
    throw new Error('useWallet must be used within CedraWalletAdapterProvider');
  }
  return context;
};
