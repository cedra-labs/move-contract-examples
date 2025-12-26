import { NetworkInfo } from '../misc.mjs';
import '@aptos-labs/ts-sdk';

/** Version of the feature. */
type AptosOnNetworkChangeVersion = '1.0.0';
/** Name of the feature. */
declare const AptosOnNetworkChangeNamespace = "aptos:onNetworkChange";
type AptosOnNetworkChangeFeature = {
    /** Namespace for the feature. */
    [AptosOnNetworkChangeNamespace]: {
        /** Version of the feature API. */
        version: AptosOnNetworkChangeVersion;
        onNetworkChange: AptosOnNetworkChangeMethod;
    };
};
type AptosOnNetworkChangeMethod = (input: AptosOnNetworkChangeInput) => Promise<void>;
type AptosOnNetworkChangeInput = (newNetwork: NetworkInfo) => void;

export { AptosOnNetworkChangeFeature, AptosOnNetworkChangeInput, AptosOnNetworkChangeMethod, AptosOnNetworkChangeNamespace, AptosOnNetworkChangeVersion };
