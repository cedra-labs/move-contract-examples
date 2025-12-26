import { WalletWithAptosFeatures } from './features/index.mjs';
import '@wallet-standard/core';
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

interface AptosWallet extends WalletWithAptosFeatures {
    /**
     * Website URL of the Wallet
     */
    readonly url: string;
}

export { AptosWallet };
