import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCedraWallets, UserResponseStatus } from '@cedra-labs/wallet-standard';
import type { CedraWallet } from '@cedra-labs/wallet-standard';

interface AccountInfo {
  address: string;
  publicKey: Uint8Array;
}

interface NetworkInfo {
  name: string;
  chainId: number;
  url?: string;
}

interface CedraWalletContextState {
  wallets: CedraWallet[];
  wallet: CedraWallet | null;
  account: AccountInfo | null;
  network: NetworkInfo | null;
  connected: boolean;
  connecting: boolean;
  connect: (wallet: CedraWallet) => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: any) => Promise<any>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: any) => Promise<any>;
}

const CedraWalletContext = createContext<CedraWalletContextState | undefined>(undefined);

interface CedraWalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export const CedraWalletProvider: React.FC<CedraWalletProviderProps> = ({
  children,
  autoConnect = false
}) => {
  const [wallets, setWallets] = useState<CedraWallet[]>([]);
  const [wallet, setWallet] = useState<CedraWallet | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Initialize wallets
  useEffect(() => {
    const { cedraWallets, on } = getCedraWallets();
    setWallets(cedraWallets);

    // Listen for new wallets being registered
    const unsubscribe = on('register', () => {
      const { cedraWallets: updatedWallets } = getCedraWallets();
      setWallets(updatedWallets);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = async (selectedWallet: CedraWallet) => {
    setConnecting(true);
    try {
      console.log('🔌 Starting wallet connection...', selectedWallet.name);
      console.log('📋 Wallet features:', Object.keys(selectedWallet.features));

      // For wallets that don't implement Cedra standard yet, try getting account directly
      const accountFeature = selectedWallet.features['cedra:account'];
      if (accountFeature) {
        console.log(' Found cedra:account feature');
        try {
          const accountInfo = await accountFeature.account();
          console.log(' Account info from cedra:account:', accountInfo);

          if (accountInfo) {
            setWallet(selectedWallet);
            setAccount({
              address: accountInfo.address.toString(),
              publicKey: accountInfo.publicKey.toUint8Array()
            });
            setConnected(true);

            // Get network info
            const networkFeature = selectedWallet.features['cedra:network'];
            if (networkFeature) {
              const networkInfo = await networkFeature.network();
              setNetwork(networkInfo);
              console.log('🌐 Network info:', networkInfo);
            }

            console.log(' Wallet connected successfully via cedra:account');
            return;
          }
        } catch (err) {
          console.log(' cedra:account failed, trying cedra:connect:', err);
        }
      }

      // Try the connect feature
      const connectFeature = selectedWallet.features['cedra:connect'];
      if (!connectFeature) {
        throw new Error('Wallet does not support connect feature');
      }

      console.log('📞 Calling cedra:connect...');
      const result = await connectFeature.connect();
      console.log('📦 Connect result:', result);
      console.log('📦 Result status:', result?.status);
      console.log('📦 Result args:', 'args' in result ? result.args : 'No args');

      // Check if approved
      if (result.status === UserResponseStatus.APPROVED && 'args' in result) {
        setWallet(selectedWallet);

        // Handle address - could be string or AccountAddress object
        const address = typeof result.args.address === 'string'
          ? result.args.address
          : result.args.address.toString();

        // Handle publicKey - could be Uint8Array or object with toUint8Array method
        const publicKey = result.args.publicKey instanceof Uint8Array
          ? result.args.publicKey
          : result.args.publicKey.toUint8Array();

        setAccount({
          address,
          publicKey
        });
        setConnected(true);

        console.log(' Wallet connected successfully:', { address });

        // Get network info
        const networkFeature = selectedWallet.features['cedra:network'];
        if (networkFeature) {
          const networkInfo = await networkFeature.network();
          setNetwork(networkInfo);
          console.log('🌐 Network info:', networkInfo);
        }
      } else {
        console.log(' Connection was not approved or missing args');
        console.log('Status check - result:', result);
        throw new Error('Connection was rejected or failed');
      }
    } catch (error) {
      console.error(' Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!wallet) return;

    try {
      const disconnectFeature = wallet.features['cedra:disconnect'];
      if (disconnectFeature) {
        await disconnectFeature.disconnect();
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    } finally {
      setWallet(null);
      setAccount(null);
      setNetwork(null);
      setConnected(false);
    }
  };

  const signAndSubmitTransaction = async (transaction: any) => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    console.log('🔐 signAndSubmitTransaction called with:', {
      hasTransaction: !!transaction,
      transactionType: typeof transaction,
      transactionKeys: transaction ? Object.keys(transaction) : [],
      hasPayload: transaction && 'payload' in transaction,
      hasData: transaction && 'data' in transaction,
      payloadKeys: transaction?.payload ? Object.keys(transaction.payload) : [],
      dataKeys: transaction?.data ? Object.keys(transaction.data) : [],
    });

    // Check if this is a built transaction object or a payload
    const isBuiltTransaction = transaction && typeof transaction === 'object' &&
                               'rawTransaction' in transaction;
    const hasPayload = transaction && typeof transaction === 'object' &&
                      ('payload' in transaction || 'data' in transaction);
    const signAndSubmitFeature = (wallet.features as any)['cedra:signAndSubmitTransaction'];

    if ((hasPayload || isBuiltTransaction) && signAndSubmitFeature) {
      console.log(' Using cedra:signAndSubmitTransaction feature');

      let transactionToSend = transaction;

      // If it's a built transaction, wallet can use it directly
      if (isBuiltTransaction) {
        console.log('📦 Sending pre-built transaction to wallet');
      } else {
        // Normalize payload format
        transactionToSend = 'payload' in transaction
          ? transaction
          : { payload: transaction.data, ...transaction, data: undefined };
        console.log('📦 Sending payload for wallet to build');
      }

      console.log('📤 Sending transaction to wallet:', JSON.stringify(transactionToSend, null, 2).substring(0, 500));

      const result = await signAndSubmitFeature.signAndSubmitTransaction(transactionToSend);

      console.log('📥 Wallet response:', {
        status: result.status,
        hasArgs: 'args' in result,
        argsKeys: 'args' in result ? Object.keys(result.args) : [],
      });

      if (result.status !== UserResponseStatus.APPROVED) {
        throw new Error('Transaction signing was rejected');
      }

      // Type guard: if status is APPROVED, then it's UserApproval which has args
      if ('args' in result) {
        return result.args; // expected to contain hash/transactionHash
      }
      throw new Error('Transaction submission failed: missing args');
    }

    // Fallback: sign-only path
    const signFeature = wallet.features['cedra:signTransaction'];
    if (!signFeature) {
      throw new Error('Wallet does not support signing transactions');
    }

    const signResult = await signFeature.signTransaction(transaction);

    if (signResult.status !== UserResponseStatus.APPROVED) {
      throw new Error('Transaction signing was rejected');
    }

    // Type guard: if status is APPROVED, then it's UserApproval which has args
    if ('args' in signResult) {
      return signResult.args; // caller must submit
    }
    throw new Error('Transaction signing failed: missing args');
  };

  const signTransaction = async (transaction: any) => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    const signFeature = wallet.features['cedra:signTransaction'];
    if (!signFeature) {
      throw new Error('Wallet does not support signing transactions');
    }

    try {
      console.log('🔐 Calling wallet signTransaction with transaction:', {
        hasTransaction: !!transaction,
        transactionType: typeof transaction,
        transactionKeys: transaction ? Object.keys(transaction) : [],
      });

      const result = await signFeature.signTransaction(transaction);

      console.log('📋 Wallet signTransaction result:', {
        status: result.status,
        hasArgs: 'args' in result,
        resultKeys: result ? Object.keys(result) : [],
      });
      try {
        console.log('📦 Wallet result.args preview:', 'args' in result ? JSON.stringify(result.args) : 'No args');
      } catch {}

      if (result.status !== UserResponseStatus.APPROVED) {
        console.error(' Transaction rejected by wallet:', {
          status: result.status,
          result: result,
        });
        throw new Error(`Transaction signing was rejected. Status: ${result.status}`);
      }

      // Type guard: if status is APPROVED, then it's UserApproval which has args
      if ('args' in result) {
        return result.args;
      }
      throw new Error('Transaction signing failed: missing args');
    } catch (error: any) {
      console.error(' Error in signTransaction:', {
        error: error,
        message: error?.message,
        stack: error?.stack,
      });
      throw error;
    }
  };

  const signMessage = async (message: any) => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    const signFeature = wallet.features['cedra:signMessage'];
    if (!signFeature) {
      throw new Error('Wallet does not support signing messages');
    }

    const result = await signFeature.signMessage(message);

    if (result.status !== UserResponseStatus.APPROVED) {
      throw new Error('Message signing was rejected');
    }

    // Type guard: if status is APPROVED, then it's UserApproval which has args
    if ('args' in result) {
      return result.args;
    }
    throw new Error('Message signing failed: missing args');
  };

  const value: CedraWalletContextState = {
    wallets,
    wallet,
    account,
    network,
    connected,
    connecting,
    connect,
    disconnect,
    signAndSubmitTransaction,
    signTransaction,
    signMessage,
  };

  return (
    <CedraWalletContext.Provider value={value}>
      {children}
    </CedraWalletContext.Provider>
  );
};

export const useWallet = (): CedraWalletContextState => {
  const context = useContext(CedraWalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a CedraWalletProvider');
  }
  return context;
};
