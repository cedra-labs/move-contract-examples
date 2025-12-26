import { WalletAccount, WalletWithFeatures, IdentifierRecord, Wallet, WalletsEventsListeners } from '@wallet-standard/core';
export * from '@wallet-standard/core';
import { SigningScheme, AccountAddressInput, PublicKey, Serializable, AccountAddress, Serializer, Deserializer, Network, InputGenerateTransactionPayloadData, Signature, AccountAuthenticator, AnyRawTransaction, TransactionPayload } from '@aptos-labs/ts-sdk';

interface AptosWalletAccount extends WalletAccount {
    readonly signingScheme: SigningScheme;
}

interface AccountInfoInput {
    address: AccountAddressInput;
    publicKey: PublicKey;
    ansName?: string;
}
declare class AccountInfo extends Serializable {
    readonly address: AccountAddress;
    readonly publicKey: PublicKey;
    readonly ansName?: string;
    constructor({ address, publicKey, ansName }: AccountInfoInput);
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): AccountInfo;
}

type ChainsId = `${string}:${string}`;
/** APTOS Devnet */
declare const APTOS_DEVNET_CHAIN = "aptos:devnet";
/** APTOS Testnet */
declare const APTOS_TESTNET_CHAIN = "aptos:testnet";
/** APTOS Localnet */
declare const APTOS_LOCALNET_CHAIN = "aptos:localnet";
/** APTOS Mainnet */
declare const APTOS_MAINNET_CHAIN = "aptos:mainnet";
declare const APTOS_CHAINS: readonly ["aptos:devnet", "aptos:testnet", "aptos:localnet", "aptos:mainnet"];
type AptosChain = typeof APTOS_DEVNET_CHAIN | typeof APTOS_TESTNET_CHAIN | typeof APTOS_LOCALNET_CHAIN | typeof APTOS_MAINNET_CHAIN;

type TransactionHash = `0x${string}`;
interface NetworkInfo {
    name: Network;
    chainId: number;
    url?: string;
}
declare enum UserResponseStatus {
    APPROVED = "Approved",
    REJECTED = "Rejected"
}
interface UserApproval<TResponseArgs> {
    status: UserResponseStatus.APPROVED;
    args: TResponseArgs;
}
interface UserRejection {
    status: UserResponseStatus.REJECTED;
}
type UserResponse<TResponseArgs> = UserApproval<TResponseArgs> | UserRejection;

/** Version of the feature. */
type AptosSignAndSubmitTransactionVersion = '1.1.0';
/** Name of the feature. */
declare const AptosSignAndSubmitTransactionNamespace = "aptos:signAndSubmitTransaction";
/**
 * A Wallet Standard feature for signing a transaction, and returning the
 * hash of the transaction.
 */
type AptosSignAndSubmitTransactionFeature = {
    /** Namespace for the feature. */
    [AptosSignAndSubmitTransactionNamespace]: {
        /** Version of the feature API. */
        version: AptosSignAndSubmitTransactionVersion;
        signAndSubmitTransaction: AptosSignAndSubmitTransactionMethod;
    };
};
type AptosSignAndSubmitTransactionMethod = (transaction: AptosSignAndSubmitTransactionInput) => Promise<UserResponse<AptosSignAndSubmitTransactionOutput>>;
interface AptosSignAndSubmitTransactionInput {
    gasUnitPrice?: number;
    maxGasAmount?: number;
    payload: InputGenerateTransactionPayloadData;
}
interface AptosSignAndSubmitTransactionOutput {
    hash: string;
}

/** Version of the feature. */
type AptosSignMessageVersion = '1.0.0';
/** Name of the feature. */
declare const AptosSignMessageNamespace = "aptos:signMessage";
type AptosSignMessageFeature = {
    /** Namespace for the feature. */
    [AptosSignMessageNamespace]: {
        /** Version of the feature API. */
        version: AptosSignMessageVersion;
        signMessage: AptosSignMessageMethod;
    };
};
type AptosSignMessageMethod = (input: AptosSignMessageInput) => Promise<UserResponse<AptosSignMessageOutput>>;
type AptosSignMessageInput = {
    address?: boolean;
    application?: boolean;
    chainId?: boolean;
    message: string;
    nonce: string;
};
type AptosSignMessageOutput = {
    address?: string;
    application?: string;
    chainId?: number;
    fullMessage: string;
    message: string;
    nonce: string;
    prefix: 'APTOS';
    signature: Signature;
};

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

/** Version of the feature. */
type AptosGetNetworkVersion = '1.0.0';
/** Name of the feature. */
declare const AptosGetNetworkNamespace = "aptos:network";
type AptosGetNetworkFeature = {
    /** Namespace for the feature. */
    [AptosGetNetworkNamespace]: {
        /** Version of the feature API. */
        version: AptosGetNetworkVersion;
        network: AptosGetNetworkMethod;
    };
};
type AptosGetNetworkMethod = () => Promise<AptosGetNetworkOutput>;
type AptosGetNetworkOutput = NetworkInfo;

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

/** Name of the feature. */
declare const AptosSignTransactionNamespace = "aptos:signTransaction";
type AptosSignTransactionFeatureV1_0 = {
    [AptosSignTransactionNamespace]: {
        version: '1.0.0';
        signTransaction: AptosSignTransactionMethod;
    };
};
type AptosSignTransactionFeatureV1_1 = {
    [AptosSignTransactionNamespace]: {
        version: '1.1';
        signTransaction: AptosSignTransactionMethod & AptosSignTransactionMethodV1_1;
    };
};
/**
 * A Wallet Standard feature for signing an Aptos transaction, and returning the
 * account authenticator.
 */
type AptosSignTransactionFeature = AptosSignTransactionFeatureV1_0 | AptosSignTransactionFeatureV1_1;
type AptosSignTransactionOutput = AccountAuthenticator;
type AptosSignTransactionMethod = (transaction: AnyRawTransaction, asFeePayer?: boolean) => Promise<UserResponse<AptosSignTransactionOutput>>;
interface AccountInput {
    address: AccountAddress;
    publicKey?: PublicKey;
}
interface AptosSignTransactionInputV1_1 {
    expirationSecondsFromNow?: number;
    expirationTimestamp?: number;
    feePayer?: AccountInput;
    gasUnitPrice?: number;
    maxGasAmount?: number;
    network?: Network;
    payload: TransactionPayload | InputGenerateTransactionPayloadData;
    secondarySigners?: AccountInput[];
    sender?: AccountInput;
    sequenceNumber?: number | bigint;
    signerAddress?: AccountAddress;
}
interface AptosSignTransactionOutputV1_1 {
    authenticator: AccountAuthenticator;
    rawTransaction: AnyRawTransaction;
}
type AptosSignTransactionMethodV1_1 = (input: AptosSignTransactionInputV1_1) => Promise<UserResponse<AptosSignTransactionOutputV1_1>>;

/** Version of the feature. */
type AptosDisconnectVersion = '1.0.0';
/** Name of the feature. */
declare const AptosDisconnectNamespace = "aptos:disconnect";
type AptosDisconnectFeature = {
    /** Namespace for the feature. */
    [AptosDisconnectNamespace]: {
        /** Version of the feature API. */
        version: AptosDisconnectVersion;
        disconnect: AptosDisconnectMethod;
    };
};
type AptosDisconnectMethod = () => Promise<void>;

/** Version of the feature. */
type AptosOpenInMobileAppVersion = '1.0.0';
/** Name of the feature. */
declare const AptosOpenInMobileAppNamespace = "aptos:openInMobileApp";
type AptosOpenInMobileAppFeature = {
    /** Namespace for the feature. */
    [AptosOpenInMobileAppNamespace]: {
        /** Version of the feature API. */
        version: AptosOpenInMobileAppVersion;
        openInMobileApp: AptosOpenInMobileAppMethod;
    };
};
type AptosOpenInMobileAppMethod = () => void;

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

interface AptosWallet extends WalletWithAptosFeatures {
    /**
     * Website URL of the Wallet
     */
    readonly url: string;
}

declare function isWalletWithRequiredFeatureSet<AdditionalFeatures extends Wallet['features']>(wallet: Wallet, additionalFeatures?: (keyof AdditionalFeatures)[]): wallet is WalletWithFeatures<MinimallyRequiredFeatures & AdditionalFeatures>;
/**
 * Helper function to get only Aptos wallets
 * @returns Aptos compatible wallets and `on` event to listen to wallets register event
 */
declare function getAptosWallets(): {
    aptosWallets: AptosWallet[];
    on: <E extends keyof WalletsEventsListeners>(event: E, listener: WalletsEventsListeners[E]) => () => void;
};

declare enum AptosWalletErrorCode {
    Unauthorized = 4100,
    Unsupported = 4200,
    InternalError = -30001
}
declare const AptosWalletErrors: Readonly<{
    4100: {
        status: string;
        message: string;
    };
    [-30001]: {
        status: string;
        message: string;
    };
    4200: {
        status: string;
        message: string;
    };
}>;
declare class AptosWalletError extends Error {
    readonly code: number;
    readonly status: string;
    constructor(code: number, message?: string);
}

export { APTOS_CHAINS, APTOS_DEVNET_CHAIN, APTOS_LOCALNET_CHAIN, APTOS_MAINNET_CHAIN, APTOS_TESTNET_CHAIN, AccountInfo, AccountInfoInput, AccountInput, AptoGetsAccountOutput, AptosChain, AptosChangeNetworkFeature, AptosChangeNetworkInput, AptosChangeNetworkMethod, AptosChangeNetworkNamespace, AptosChangeNetworkOutput, AptosChangeNetworkVersion, AptosConnectFeature, AptosConnectInput, AptosConnectMethod, AptosConnectNamespace, AptosConnectOutput, AptosConnectVersion, AptosDisconnectFeature, AptosDisconnectMethod, AptosDisconnectNamespace, AptosDisconnectVersion, AptosFeatures, AptosGetAccountFeature, AptosGetAccountMethod, AptosGetAccountNamespace, AptosGetAccountVersion, AptosGetNetworkFeature, AptosGetNetworkMethod, AptosGetNetworkNamespace, AptosGetNetworkOutput, AptosGetNetworkVersion, AptosOnAccountChangeFeature, AptosOnAccountChangeInput, AptosOnAccountChangeMethod, AptosOnAccountChangeNamespace, AptosOnAccountChangeVersion, AptosOnNetworkChangeFeature, AptosOnNetworkChangeInput, AptosOnNetworkChangeMethod, AptosOnNetworkChangeNamespace, AptosOnNetworkChangeVersion, AptosOpenInMobileAppFeature, AptosOpenInMobileAppMethod, AptosOpenInMobileAppNamespace, AptosOpenInMobileAppVersion, AptosSignAndSubmitTransactionFeature, AptosSignAndSubmitTransactionInput, AptosSignAndSubmitTransactionMethod, AptosSignAndSubmitTransactionNamespace, AptosSignAndSubmitTransactionOutput, AptosSignAndSubmitTransactionVersion, AptosSignInFeature, AptosSignInInput, AptosSignInMethod, AptosSignInNamespace, AptosSignInOutput, AptosSignInRequiredFields, AptosSignInVersion, AptosSignMessageFeature, AptosSignMessageInput, AptosSignMessageMethod, AptosSignMessageNamespace, AptosSignMessageOutput, AptosSignMessageVersion, AptosSignTransactionFeature, AptosSignTransactionFeatureV1_0, AptosSignTransactionFeatureV1_1, AptosSignTransactionInputV1_1, AptosSignTransactionMethod, AptosSignTransactionMethodV1_1, AptosSignTransactionNamespace, AptosSignTransactionOutput, AptosSignTransactionOutputV1_1, AptosWallet, AptosWalletAccount, AptosWalletError, AptosWalletErrorCode, AptosWalletErrors, ChainsId, MinimallyRequiredFeatures, NetworkInfo, TransactionHash, UserApproval, UserRejection, UserResponse, UserResponseStatus, WalletWithAptosFeatures, WalletWithRequiredFeatures, getAptosWallets, isWalletWithRequiredFeatureSet };
