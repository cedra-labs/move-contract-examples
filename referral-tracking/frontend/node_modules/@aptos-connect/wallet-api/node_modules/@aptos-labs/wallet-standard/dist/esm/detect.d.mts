import { Wallet, WalletWithFeatures, WalletsEventsListeners } from '@wallet-standard/core';
import { MinimallyRequiredFeatures } from './features/index.mjs';
import { AptosWallet } from './wallet.mjs';
import './features/aptosSignAndSubmitTransaction.mjs';
import '@aptos-labs/ts-sdk';
import './misc.mjs';
import './features/aptosSignMessage.mjs';
import './features/aptosGetAccount.mjs';
import './AccountInfo.mjs';
import './features/aptosConnect.mjs';
import './features/aptosGetNetwork.mjs';
import './features/aptosOnAccountChange.mjs';
import './features/aptosOnNetworkChange.mjs';
import './features/aptosSignTransaction.mjs';
import './features/aptosDisconnect.mjs';
import './features/aptosOpenInMobileApp.mjs';
import './features/aptosChangeNetwork.mjs';
import './features/aptosSignIn.mjs';

declare function isWalletWithRequiredFeatureSet<AdditionalFeatures extends Wallet['features']>(wallet: Wallet, additionalFeatures?: (keyof AdditionalFeatures)[]): wallet is WalletWithFeatures<MinimallyRequiredFeatures & AdditionalFeatures>;
/**
 * Helper function to get only Aptos wallets
 * @returns Aptos compatible wallets and `on` event to listen to wallets register event
 */
declare function getAptosWallets(): {
    aptosWallets: AptosWallet[];
    on: <E extends keyof WalletsEventsListeners>(event: E, listener: WalletsEventsListeners[E]) => () => void;
};

export { getAptosWallets, isWalletWithRequiredFeatureSet };
