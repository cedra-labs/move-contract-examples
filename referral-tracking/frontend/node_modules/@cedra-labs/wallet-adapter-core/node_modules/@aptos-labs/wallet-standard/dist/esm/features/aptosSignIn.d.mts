import { Signature } from '@aptos-labs/ts-sdk';
import { UserResponse } from '../misc.mjs';
import { AccountInfo } from '../AccountInfo.mjs';

/**
 * NOTE: This feature is currently experimental and is subject to change.
 *
 * Documentation: [Sign in with Aptos](https://github.com/aptos-foundation/AIPs/pull/556)
 */
/** Version of the feature. */
type AptosSignInVersion = '0.1.0';
/** Name of the feature. */
declare const AptosSignInNamespace = "aptos:signIn";
type AptosSignInFeature = {
    /** Namespace for the feature. */
    [AptosSignInNamespace]: {
        /** Version of the feature API. */
        version: AptosSignInVersion;
        signIn: AptosSignInMethod;
    };
};
type AptosSignInMethod = (input: AptosSignInInput) => Promise<UserResponse<AptosSignInOutput>>;
type AptosSignInInput = {
    address?: string;
    uri?: string;
    version?: string;
    statement?: string;
    nonce: string;
    chainId?: string;
    issuedAt?: string;
    expirationTime?: string;
    notBefore?: string;
    requestId?: string;
    resources?: string[];
};
type AptosSignInRequiredFields = {
    domain: string;
    address: string;
    uri: string;
    version: string;
    chainId: string;
};
type AptosSignInOutput = {
    account: AccountInfo;
    input: AptosSignInInput & AptosSignInRequiredFields;
    plainText: string;
    signingMessage: Uint8Array;
    signature: Signature;
    /**
     * The type of signing scheme used to sign the message.
     *
     * @example 'ed25519' | 'multi_ed25519' | 'single_key' | 'multi_key'
     */
    type: string;
};

export { AptosSignInFeature, AptosSignInInput, AptosSignInMethod, AptosSignInNamespace, AptosSignInOutput, AptosSignInRequiredFields, AptosSignInVersion };
