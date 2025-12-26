import { useContext, createContext } from "react";
import {
  type AccountInfo,
  type NetworkInfo,
  type InputTransactionData,
  type CedraSignAndSubmitTransactionOutput,
} from "@cedra-labs/wallet-adapter-core";

export interface WalletInfo {
  name: string;
  icon: string;
  url: string;
  readyState: 'Installed' | 'NotDetected';
}

export interface WalletContextState {
  connected: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  network: NetworkInfo | null;
  connect(walletName: string): Promise<void>;
  disconnect(): Promise<void>;
  changeNetwork(networkName: string): Promise<void>;
  signMessage(message: string): Promise<string>;
  signAndSubmitTransaction(
    transaction: InputTransactionData,
  ): Promise<CedraSignAndSubmitTransactionOutput>;
  wallet: WalletInfo | null;
  wallets: WalletInfo[];
  notDetectedWallets: WalletInfo[];
}

export const WalletContext = createContext<WalletContextState | null>(null);

export function useWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a CedraWalletAdapterProvider");
  }
  return context;
}

