import { WalletWithFeatures, IdentifierRecord } from '@wallet-standard/core';
import { AptosSignAndSubmitTransactionFeature } from './aptosSignAndSubmitTransaction.mjs';
export { AptosSignAndSubmitTransactionInput, AptosSignAndSubmitTransactionMethod, AptosSignAndSubmitTransactionNamespace, AptosSignAndSubmitTransactionOutput, AptosSignAndSubmitTransactionVersion } from './aptosSignAndSubmitTransaction.mjs';
import { AptosSignMessageFeature } from './aptosSignMessage.mjs';
export { AptosSignMessageInput, AptosSignMessageMethod, AptosSignMessageNamespace, AptosSignMessageOutput, AptosSignMessageVersion } from './aptosSignMessage.mjs';
import { AptosGetAccountFeature } from './aptosGetAccount.mjs';
export { AptoGetsAccountOutput, AptosGetAccountMethod, AptosGetAccountNamespace, AptosGetAccountVersion } from './aptosGetAccount.mjs';
import { AptosConnectFeature } from './aptosConnect.mjs';
export { AptosConnectInput, AptosConnectMethod, AptosConnectNamespace, AptosConnectOutput, AptosConnectVersion } from './aptosConnect.mjs';
import { AptosGetNetworkFeature } from './aptosGetNetwork.mjs';
export { AptosGetNetworkMethod, AptosGetNetworkNamespace, AptosGetNetworkOutput, AptosGetNetworkVersion } from './aptosGetNetwork.mjs';
import { AptosOnAccountChangeFeature } from './aptosOnAccountChange.mjs';
export { AptosOnAccountChangeInput, AptosOnAccountChangeMethod, AptosOnAccountChangeNamespace, AptosOnAccountChangeVersion } from './aptosOnAccountChange.mjs';
import { AptosOnNetworkChangeFeature } from './aptosOnNetworkChange.mjs';
export { AptosOnNetworkChangeInput, AptosOnNetworkChangeMethod, AptosOnNetworkChangeNamespace, AptosOnNetworkChangeVersion } from './aptosOnNetworkChange.mjs';
import { AptosSignTransactionFeature } from './aptosSignTransaction.mjs';
export { AccountInput, AptosSignTransactionFeatureV1_0, AptosSignTransactionFeatureV1_1, AptosSignTransactionInputV1_1, AptosSignTransactionMethod, AptosSignTransactionMethodV1_1, AptosSignTransactionNamespace, AptosSignTransactionOutput, AptosSignTransactionOutputV1_1 } from './aptosSignTransaction.mjs';
import { AptosDisconnectFeature } from './aptosDisconnect.mjs';
export { AptosDisconnectMethod, AptosDisconnectNamespace, AptosDisconnectVersion } from './aptosDisconnect.mjs';
import { AptosOpenInMobileAppFeature } from './aptosOpenInMobileApp.mjs';
export { AptosOpenInMobileAppMethod, AptosOpenInMobileAppNamespace, AptosOpenInMobileAppVersion } from './aptosOpenInMobileApp.mjs';
import { AptosChangeNetworkFeature } from './aptosChangeNetwork.mjs';
export { AptosChangeNetworkInput, AptosChangeNetworkMethod, AptosChangeNetworkNamespace, AptosChangeNetworkOutput, AptosChangeNetworkVersion } from './aptosChangeNetwork.mjs';
import { AptosSignInFeature } from './aptosSignIn.mjs';
export { AptosSignInInput, AptosSignInMethod, AptosSignInNamespace, AptosSignInOutput, AptosSignInRequiredFields, AptosSignInVersion } from './aptosSignIn.mjs';
import '@aptos-labs/ts-sdk';
import '../misc.mjs';
import '../AccountInfo.mjs';

/**
 * Wallet Standard features that are unique to Aptos, and that all Aptos wallets are expected to implement.
 */
type AptosFeatures = AptosConnectFeature & AptosGetAccountFeature & AptosGetNetworkFeature & AptosOnAccountChangeFeature & AptosOnNetworkChangeFeature & AptosSignMessageFeature & AptosSignTransactionFeature & Partial<AptosChangeNetworkFeature> & Partial<AptosOpenInMobileAppFeature> & Partial<AptosSignAndSubmitTransactionFeature> & Partial<AptosSignInFeature> & AptosDisconnectFeature;
/**
 * Represents a wallet with all Aptos features.
 */
type WalletWithAptosFeatures = WalletWithFeatures<AptosFeatures>;
/**
 * Represents a wallet with the absolute minimum feature set required to function in the Aptos ecosystem.
 */
type WalletWithRequiredFeatures = WalletWithFeatures<MinimallyRequiredFeatures & IdentifierRecord<unknown>>;
/**
 * Represents the absolute minimum feature set required to function in the Aptos ecosystem.
 */
type MinimallyRequiredFeatures = AptosFeatures;

export { AptosChangeNetworkFeature, AptosConnectFeature, AptosDisconnectFeature, AptosFeatures, AptosGetAccountFeature, AptosGetNetworkFeature, AptosOnAccountChangeFeature, AptosOnNetworkChangeFeature, AptosOpenInMobileAppFeature, AptosSignAndSubmitTransactionFeature, AptosSignInFeature, AptosSignMessageFeature, AptosSignTransactionFeature, MinimallyRequiredFeatures, WalletWithAptosFeatures, WalletWithRequiredFeatures };
