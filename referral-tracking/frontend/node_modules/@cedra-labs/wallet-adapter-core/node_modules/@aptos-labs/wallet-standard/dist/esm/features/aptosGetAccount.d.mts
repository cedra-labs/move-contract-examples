import { AccountInfo } from '../AccountInfo.mjs';
import '@aptos-labs/ts-sdk';

/** Version of the feature. */
type AptosGetAccountVersion = '1.0.0';
/** Name of the feature. */
declare const AptosGetAccountNamespace = "aptos:account";
type AptosGetAccountFeature = {
    /** Namespace for the feature. */
    [AptosGetAccountNamespace]: {
        /** Version of the feature API. */
        version: AptosGetAccountVersion;
        account: AptosGetAccountMethod;
    };
};
type AptosGetAccountMethod = () => Promise<AptoGetsAccountOutput>;
type AptoGetsAccountOutput = AccountInfo;

export { AptoGetsAccountOutput, AptosGetAccountFeature, AptosGetAccountMethod, AptosGetAccountNamespace, AptosGetAccountVersion };
