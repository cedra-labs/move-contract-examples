import {
  CedraConnectAppleWallet,
  CedraConnectGoogleWallet,
} from "@cedra-labs/wallet-adapter-plugin";
import { Network } from "@cedra-labs/ts-sdk";
// import { DevTWallet, TWallet } from "@cedra-labs/cedra-wallet-adapter";
import { DappConfig, AdapterWallet } from "./WalletCore";

export function getSDKWallets(dappConfig?: DappConfig) {
  const sdkWallets: AdapterWallet[] = [];

  // Need to check window is defined for CedraConnect
  if (typeof window !== "undefined") {
    sdkWallets.push(
      new CedraConnectGoogleWallet({
        network: dappConfig?.network,
        dappId: dappConfig?.cedraConnectDappId,
        ...dappConfig?.cedraConnect,
      }),
      new CedraConnectAppleWallet({
        network: dappConfig?.network,
        dappId: dappConfig?.cedraConnectDappId,
        ...dappConfig?.cedraConnect,
      })
    );
  }

  // Push production wallet if env is production, otherwise use dev wallet
  if (dappConfig?.network === Network.MAINNET) {
    // TODO twallet uses @cedra-labs/wallet-standard at version 0.0.11 while adapter uses
    // a newer version (0.1.0) - this causes type mismatch. We should figure out how to handle it.
    // sdkWallets.push(new TWallet() as any);
  } else {
    // sdkWallets.push(new DevTWallet() as any);
  }

  // MSafe wallet removed

  // Add new SDK wallet plugins (ones that should be installed as packages) here:
  // Ex. sdkWallets.push(new YourSDKWallet(dappConfig))

  return sdkWallets;
}
