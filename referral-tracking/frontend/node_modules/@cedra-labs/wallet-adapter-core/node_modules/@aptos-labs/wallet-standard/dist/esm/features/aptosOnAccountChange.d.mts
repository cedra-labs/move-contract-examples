import { AccountInfo } from '../AccountInfo.mjs';
import '@aptos-labs/ts-sdk';

/** Version of the feature. */
type AptosOnAccountChangeVersion = '1.0.0';
/** Name of the feature. */
declare const AptosOnAccountChangeNamespace = "aptos:onAccountChange";
type AptosOnAccountChangeFeature = {
    /** Namespace for the feature. */
    [AptosOnAccountChangeNamespace]: {
        /** Version of the feature API. */
        version: AptosOnAccountChangeVersion;
        onAccountChange: AptosOnAccountChangeMethod;
    };
};
type AptosOnAccountChangeMethod = (input: AptosOnAccountChangeInput) => Promise<void>;
type AptosOnAccountChangeInput = (newAccount: AccountInfo) => void;

export { AptosOnAccountChangeFeature, AptosOnAccountChangeInput, AptosOnAccountChangeMethod, AptosOnAccountChangeNamespace, AptosOnAccountChangeVersion };
