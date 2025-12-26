import { UserResponse, NetworkInfo } from '../misc.mjs';
import '@aptos-labs/ts-sdk';

/** Version of the feature. */
type AptosChangeNetworkVersion = '1.0.0';
/** Name of the feature. */
declare const AptosChangeNetworkNamespace = "aptos:changeNetwork";
type AptosChangeNetworkFeature = {
    /** Namespace for the feature. */
    [AptosChangeNetworkNamespace]: {
        /** Version of the feature API. */
        version: AptosChangeNetworkVersion;
        changeNetwork: AptosChangeNetworkMethod;
    };
};
type AptosChangeNetworkMethod = (input: AptosChangeNetworkInput) => Promise<UserResponse<AptosChangeNetworkOutput>>;
type AptosChangeNetworkInput = NetworkInfo;
interface AptosChangeNetworkOutput {
    success: boolean;
    reason?: string;
}

export { AptosChangeNetworkFeature, AptosChangeNetworkInput, AptosChangeNetworkMethod, AptosChangeNetworkNamespace, AptosChangeNetworkOutput, AptosChangeNetworkVersion };
