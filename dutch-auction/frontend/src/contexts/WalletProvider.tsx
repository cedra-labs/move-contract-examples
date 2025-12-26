import type {
  AvailableWallets,
  DappConfig,
  AccountInfo,
  AdapterWallet,
  NetworkInfo,
  InputTransactionData,
  CedraSignAndSubmitTransactionOutput,
  CedraSignMessageInput,
  CedraSignMessageOutput,
  AdapterNotDetectedWallet,
  Network,
} from "@cedra-labs/wallet-adapter-core";
import {
  WalletCore,
  WalletReadyState,
} from "@cedra-labs/wallet-adapter-core";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode, FC } from "react";
import { WalletContext, type WalletInfo } from "./useWallet";

export interface CedraWalletProviderProps {
  children: ReactNode;
  optInWallets?: ReadonlyArray<AvailableWallets>;
  autoConnect?:
    | boolean
    | ((core: WalletCore, adapter: AdapterWallet) => Promise<boolean>);
  dappConfig?: DappConfig;
  disableTelemetry?: boolean;
  onError?: (error: any) => void;
}

const initialState: {
  account: AccountInfo | null;
  network: NetworkInfo | null;
  connected: boolean;
  wallet: AdapterWallet | null;
} = {
  connected: false,
  account: null,
  network: null,
  wallet: null,
};

// Helper function to convert AdapterWallet to WalletInfo
const adapterWalletToWalletInfo = (adapter: AdapterWallet): WalletInfo => ({
  name: adapter.name,
  icon: adapter.icon,
  url: adapter.url,
  readyState:
    adapter.readyState === WalletReadyState.Installed
      ? "Installed"
      : "NotDetected",
});

// Helper function to convert AdapterNotDetectedWallet to WalletInfo
const adapterNotDetectedWalletToWalletInfo = (
  adapter: AdapterNotDetectedWallet,
): WalletInfo => ({
  name: adapter.name,
  icon: adapter.icon,
  url: adapter.url,
  readyState: "NotDetected",
});

export const CedraWalletAdapterProvider: FC<CedraWalletProviderProps> = ({
  children,
  optInWallets,
  autoConnect = false,
  dappConfig,
  disableTelemetry = false,
  onError,
}: CedraWalletProviderProps) => {
  const didAttemptAutoConnectRef = useRef(false);

  const [{ account, network, connected, wallet }, setState] =
    useState(initialState);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [walletCore, setWalletCore] = useState<WalletCore>();

  const [wallets, setWallets] = useState<ReadonlyArray<AdapterWallet>>([]);
  const [notDetectedWallets, setNotDetectedWallets] = useState<
    ReadonlyArray<AdapterNotDetectedWallet>
  >([]);
  
  // Initialize WalletCore on first load
  useEffect(() => {
    const walletCore = new WalletCore(
      optInWallets,
      dappConfig,
      disableTelemetry,
    );
    setWalletCore(walletCore);
  }, []);

  // Update initial Wallets state once WalletCore has been initialized
  useEffect(() => {
    if (!walletCore) return;
    
    // Deduplicate wallets by name to prevent duplicates
    const uniqueWallets = Array.from(
      new Map(walletCore.wallets.map(w => [w.name, w])).values()
    );
    const uniqueNotDetected = Array.from(
      new Map(walletCore.notDetectedWallets.map(w => [w.name, w])).values()
    );
    
    setWallets(uniqueWallets);
    setNotDetectedWallets(uniqueNotDetected);
  }, [walletCore]);

  const connect = useCallback(async (walletName: string): Promise<void> => {
    try {
      setIsLoading(true);
      await walletCore?.connect(walletName);
      // Store wallet name for reference
      localStorage.setItem("CedraWalletName", walletName);
    } catch (error: any) {
      if (onError) onError(error);
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  }, [walletCore, onError]);

  // Auto-reconnect function - checks for existing connection and reconnects silently
  const attemptAutoReconnect = useCallback(async () => {
    if (didAttemptAutoConnectRef.current) {
      return;
    }

    if (!walletCore) {
      return;
    }

    let waitAttempts = 0;
    const maxWaitAttempts = 20;
    
    while (!walletCore.wallets.length && waitAttempts < maxWaitAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitAttempts++;
    }
    
    if (!walletCore.wallets.length) {
      setIsLoading(false);
      return;
    }

    if (!autoConnect) {
      setIsLoading(false);
      didAttemptAutoConnectRef.current = true;
      return;
    }

    didAttemptAutoConnectRef.current = true;

    try {
      const storedWalletName = localStorage.getItem("CedraWalletName");
      
      if (!storedWalletName) {
        setIsLoading(false);
        return;
      }

      const walletExists = walletCore.wallets.some(
        (w) => w.name === storedWalletName
      );
      
      if (!walletExists) {
        didAttemptAutoConnectRef.current = false;
        setIsLoading(false);
        return;
      }

      const walletAdapter = walletCore.wallets.find(
        (w) => w.name === storedWalletName
      );

      if (!walletAdapter) {
        setIsLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        await walletCore.connect(storedWalletName);
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsLoading(false);
        return;
      } catch (adapterError) {
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  }, [autoConnect, walletCore, wallets, connect]);

  useEffect(() => {
    attemptAutoReconnect();
  }, [attemptAutoReconnect]);

  const disconnect = async (): Promise<void> => {
    try {
      await walletCore?.disconnect();
      localStorage.removeItem("CedraWalletName");
    } catch (error) {
      if (onError) onError(error);
      return Promise.reject(error);
    }
  };

  const signAndSubmitTransaction = async (
    transaction: InputTransactionData,
  ): Promise<CedraSignAndSubmitTransactionOutput> => {
    try {
      if (!walletCore) {
        throw new Error("WalletCore is not initialized");
      }
      return await walletCore.signAndSubmitTransaction(transaction);
    } catch (error: any) {
      if (onError) onError(error);
      return Promise.reject(error);
    }
  };

  const signMessageInternal = async (
    message: CedraSignMessageInput,
  ): Promise<CedraSignMessageOutput> => {
    if (!walletCore) {
      throw new Error("WalletCore is not initialized");
    }
    try {
      return await walletCore?.signMessage(message);
    } catch (error: any) {
      if (onError) onError(error);
      return Promise.reject(error);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    const nonce = `CedraWallet-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const result = await signMessageInternal({ message, nonce });
    if (typeof result.signature === "string") {
      return result.signature;
    }
    return JSON.stringify(result.signature);
  };

  const changeNetwork = async (networkName: string): Promise<void> => {
    if (!walletCore) {
      throw new Error("WalletCore is not initialized");
    }
    try {
      const normalizedName = networkName.toLowerCase();
      const validNetworks = ["mainnet", "testnet", "devnet"];
      
      if (!validNetworks.includes(normalizedName)) {
        throw new Error(`Invalid network name: ${networkName}`);
      }
      
      await walletCore?.changeNetwork(normalizedName as Network);
    } catch (error: any) {
      if (onError) onError(error);
      return Promise.reject(error);
    }
  };

  const handleConnect = useCallback((): void => {
    setState((state) => {
      return {
        ...state,
        connected: true,
        account: walletCore?.account || null,
        network: walletCore?.network || null,
        wallet: walletCore?.wallet || null,
      };
    });
    setIsLoading(false);
  }, [walletCore]);

  const handleAccountChange = useCallback((): void => {
    if (!connected) return;
    if (!walletCore?.wallet) return;
    setState((state) => {
      return {
        ...state,
        account: walletCore?.account || null,
      };
    });
  }, [connected, walletCore]);

  const handleNetworkChange = useCallback((): void => {
    if (!connected) return;
    if (!walletCore?.wallet) return;
    setState((state) => {
      return {
        ...state,
        network: walletCore?.network || null,
      };
    });
  }, [connected, walletCore]);

  useEffect(() => {
    if (connected) {
      walletCore?.onAccountChange();
      walletCore?.onNetworkChange();
    }
  }, [connected, walletCore]);

  const handleDisconnect = useCallback((): void => {
    setState((state) => {
      return {
        ...state,
        connected: false,
        account: walletCore?.account || null,
        network: walletCore?.network || null,
        wallet: null,
      };
    });
  }, [walletCore]);

  const handleStandardWalletsAdded = useCallback((standardWallet: AdapterWallet): void => {
    setWallets((currentWallets) => {
      const existingIndex = currentWallets.findIndex(
        (wallet) => wallet.name === standardWallet.name,
      );
      
      if (existingIndex === -1) {
        const storedWalletName = localStorage.getItem("CedraWalletName");
        if (storedWalletName && standardWallet.name === storedWalletName) {
          didAttemptAutoConnectRef.current = false;
          setTimeout(() => {
            attemptAutoReconnect();
          }, 500);
        }
      }
      
      if (existingIndex !== -1) {
        return [
          ...currentWallets.slice(0, existingIndex),
          standardWallet,
          ...currentWallets.slice(existingIndex + 1),
        ];
      } else {
        const updated = [...currentWallets, standardWallet];
        return Array.from(
          new Map(updated.map(w => [w.name, w])).values()
        );
      }
    });
  }, [attemptAutoReconnect]);

  const handleStandardNotDetectedWalletsAdded = useCallback((
    notDetectedWallet: AdapterNotDetectedWallet,
  ): void => {
    setNotDetectedWallets((currentNotDetected) => {
      const existingIndex = currentNotDetected.findIndex(
        (wallet) => wallet.name === notDetectedWallet.name,
      );
      
      if (existingIndex !== -1) {
        return [
          ...currentNotDetected.slice(0, existingIndex),
          notDetectedWallet,
          ...currentNotDetected.slice(existingIndex + 1),
        ];
      } else {
        const updated = [...currentNotDetected, notDetectedWallet];
        return Array.from(
          new Map(updated.map(w => [w.name, w])).values()
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!walletCore) return;

    walletCore.on("connect", handleConnect);
    walletCore.on("accountChange", handleAccountChange);
    walletCore.on("networkChange", handleNetworkChange);
    walletCore.on("disconnect", handleDisconnect);
    walletCore.on("standardWalletsAdded", handleStandardWalletsAdded);
    walletCore.on(
      "standardNotDetectedWalletAdded",
      handleStandardNotDetectedWalletsAdded,
    );

    return () => {
      walletCore.off("connect", handleConnect);
      walletCore.off("accountChange", handleAccountChange);
      walletCore.off("networkChange", handleNetworkChange);
      walletCore.off("disconnect", handleDisconnect);
      walletCore.off("standardWalletsAdded", handleStandardWalletsAdded);
      walletCore.off(
        "standardNotDetectedWalletAdded",
        handleStandardNotDetectedWalletsAdded,
      );
    };
  }, [walletCore, handleConnect, handleAccountChange, handleNetworkChange, handleDisconnect, handleStandardWalletsAdded, handleStandardNotDetectedWalletsAdded]);

  const walletInfo: WalletInfo | null = wallet
    ? adapterWalletToWalletInfo(wallet)
    : null;
  
  const walletsInfo: WalletInfo[] = Array.from(
    new Map(
      wallets.map(w => [w.name, adapterWalletToWalletInfo(w)])
    ).values()
  );
  
  const notDetectedWalletsInfo: WalletInfo[] = Array.from(
    new Map(
      notDetectedWallets.map(w => [w.name, adapterNotDetectedWalletToWalletInfo(w)])
    ).values()
  );

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        signAndSubmitTransaction,
        signMessage,
        changeNetwork,
        account,
        network,
        connected,
        wallet: walletInfo,
        wallets: walletsInfo,
        notDetectedWallets: notDetectedWalletsInfo,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

