export enum WalletReadyState {
  /**
   * Wallet can only be in one of two states - installed or not installed
   * Installed: wallets are detected by the browser event listeners and means they are installed on the user's browser.
   * NotDetected: wallets are not detected by the browser event listeners and means they are not installed on the user's browser.
   */
  Installed = "Installed",
  NotDetected = "NotDetected",
}

export enum NetworkName {
  Mainnet = "mainnet",
  Testnet = "testnet",
  Devnet = "devnet",
}

export const ChainIdToAnsSupportedNetworkMap: Record<string, string> = {
  "1": "mainnet", // mainnet
  "2": "testnet", // testnet
};

/** The base URL for all Cedra Connect wallets. */
export const CEDRA_CONNECT_BASE_URL = "https://cedraconnect.app";

/** The URL to the Cedra Connect account page if the user is signed in to Cedra Connect. */
export const CEDRA_CONNECT_ACCOUNT_URL =
  "https://cedraconnect.app/dashboard/main-account";
