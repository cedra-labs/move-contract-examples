import { AccountInfo } from '../AccountInfo.mjs';
import { UserResponse, NetworkInfo } from '../misc.mjs';
import '@aptos-labs/ts-sdk';

/** Version of the feature. */
type AptosConnectVersion = '1.0.0';
/** Name of the feature. */
declare const AptosConnectNamespace = "aptos:connect";
type AptosConnectFeature = {
    /** Namespace for the feature. */
    [AptosConnectNamespace]: {
        /** Version of the feature API. */
        version: AptosConnectVersion;
        connect: AptosConnectMethod;
    };
};
type AptosConnectMethod = (...args: AptosConnectInput) => Promise<UserResponse<AptosConnectOutput>>;
type AptosConnectInput = [silent?: boolean, networkInfo?: NetworkInfo];
type AptosConnectOutput = AccountInfo;

export { AptosConnectFeature, AptosConnectInput, AptosConnectMethod, AptosConnectNamespace, AptosConnectOutput, AptosConnectVersion };
