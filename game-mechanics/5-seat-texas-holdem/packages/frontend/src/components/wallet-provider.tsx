/* eslint-disable react-refresh/only-export-components */
"use client";
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import type { PropsWithChildren } from "react";
import { WalletCore } from "@cedra-labs/wallet-adapter-core";
import type { AccountInfo, NetworkInfo } from "@cedra-labs/wallet-adapter-core";
import { Network } from "@cedra-labs/ts-sdk";
import type { CedraWallet } from "@cedra-labs/wallet-standard";

interface WalletState {
    connected: boolean;
    connecting: boolean;
    account: AccountInfo | null;
    network: NetworkInfo | null;
    wallet: CedraWallet | null;
    wallets: CedraWallet[];
    connect: (walletName: string) => Promise<void>;
    disconnect: () => Promise<void>;
    signAndSubmitTransaction: (payload: { data: unknown }) => Promise<{ hash: string }>;
}

const WalletContext = createContext<WalletState | null>(null);

let walletCoreInstance: WalletCore | null = null;

function getWalletCore(): WalletCore {
    if (!walletCoreInstance) {
        walletCoreInstance = new WalletCore([], {
            network: Network.TESTNET,
        });
    }
    return walletCoreInstance;
}

export function WalletProvider({ children }: PropsWithChildren) {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [account, setAccount] = useState<AccountInfo | null>(null);
    const [network, setNetwork] = useState<NetworkInfo | null>(null);
    const [wallet, setWallet] = useState<CedraWallet | null>(null);
    const [wallets, setWallets] = useState<CedraWallet[]>([]);

    useEffect(() => {
        const walletCore = getWalletCore();

        const updateWallets = () => {
            setWallets([...walletCore.wallets] as CedraWallet[]);
        };

        const handleConnect = (acc: AccountInfo | null) => {
            setConnected(true);
            setConnecting(false);
            setAccount(acc);
        };

        const handleDisconnect = () => {
            setConnected(false);
            setConnecting(false);
            setAccount(null);
            setWallet(null);
        };

        const handleNetworkChange = (net: NetworkInfo | null) => setNetwork(net);
        const handleAccountChange = (acc: AccountInfo | null) => setAccount(acc);
        const handleWalletsAdded = () => updateWallets();

        walletCore.on("connect", handleConnect);
        walletCore.on("disconnect", handleDisconnect);
        walletCore.on("networkChange", handleNetworkChange);
        walletCore.on("accountChange", handleAccountChange);
        walletCore.on("standardWalletsAdded", handleWalletsAdded);

        updateWallets();

        return () => {
            walletCore.off("connect", handleConnect);
            walletCore.off("disconnect", handleDisconnect);
            walletCore.off("networkChange", handleNetworkChange);
            walletCore.off("accountChange", handleAccountChange);
            walletCore.off("standardWalletsAdded", handleWalletsAdded);
        };
    }, []);

    const connect = useCallback(async (walletName: string) => {
        const walletCore = getWalletCore();
        setConnecting(true);
        try {
            await walletCore.connect(walletName);
            setWallet(walletCore.wallet as CedraWallet | null);
            setNetwork(walletCore.network);
        } catch (error) {
            setConnecting(false);
            throw error;
        }
    }, []);

    const disconnect = useCallback(async () => {
        const walletCore = getWalletCore();
        try {
            await walletCore.disconnect();
        } catch (error) {
            console.error("Disconnect error:", error);
        }
    }, []);

    const signAndSubmitTransaction = useCallback(async (payload: { data: unknown }) => {
        const walletCore = getWalletCore();
        if (!walletCore.account) throw new Error("Wallet not connected");
        const response = await walletCore.signAndSubmitTransaction(payload as Parameters<typeof walletCore.signAndSubmitTransaction>[0]);
        return { hash: response.hash };
    }, []);

    return (
        <WalletContext.Provider value={{
            connected, connecting, account, network, wallet, wallets,
            connect, disconnect, signAndSubmitTransaction
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet(): WalletState {
    const context = useContext(WalletContext);
    if (!context) throw new Error("useWallet must be used within a WalletProvider");
    return context;
}
