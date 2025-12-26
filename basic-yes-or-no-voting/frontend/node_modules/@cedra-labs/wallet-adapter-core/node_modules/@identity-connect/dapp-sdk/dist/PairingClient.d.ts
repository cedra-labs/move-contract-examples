import { AccountInfo } from '@aptos-connect/wallet-api';
import { FinalizedPairingData, NetworkName, SerializedDate, SigningRequestStatus, SigningRequestTypes } from '@identity-connect/api';
import { Ed25519KeyPair, Ed25519PublicKey, Ed25519SecretKey } from '@identity-connect/crypto';
import { type SignAndSubmitTransactionRequestArgs, type SignAndSubmitTransactionResponseArgs, SignMessageRequestArgs, type SignTransactionRequestArgs, type SignTransactionResponseArgs, type SignTransactionWithPayloadRequestArgs, type SignTransactionWithPayloadResponseArgs, type SignTransactionWithRawTxnRequestArgs, type SignTransactionWithRawTxnResponseArgs } from '@identity-connect/wallet-api';
import { AxiosInstance, CreateAxiosDefaults } from 'axios';
import { DappPairingData, DappStateAccessors } from './state';
import { CancelToken } from './types';
export interface SignRequestOptions {
    cancelToken?: CancelToken;
    networkName?: NetworkName;
}
export type OnDisconnectListener = (address: string) => void;
export type OnDisconnectListenerCleanup = () => void;
export interface ACPairingClientConfig {
    accessors?: DappStateAccessors;
    axiosConfig?: CreateAxiosDefaults;
    defaultNetworkName?: NetworkName;
}
export declare class ACPairingClient {
    protected readonly accessors: DappStateAccessors;
    private readonly defaultNetworkName;
    protected readonly axiosInstance: AxiosInstance;
    private readonly initPromise?;
    constructor({ accessors, axiosConfig, defaultNetworkName, }?: ACPairingClientConfig);
    private getPairing;
    private syncFirstPairing;
    private createSigningRequest;
    private getSigningRequest;
    protected deletePairing(pairingId: string, secretKey: Ed25519SecretKey, publicKey: Ed25519PublicKey): Promise<void>;
    cancelSigningRequest(pairing: DappPairingData, id: string): Promise<{
        apiVersion: string;
        createdAt: string;
        id: string;
        networkName: string | null;
        pairing: {
            registeredDapp: {
                dappSpecificWalletAllowed: boolean;
                description: string | null;
                externalWalletPairingsAllowed: boolean;
                feePayerAllowed: boolean;
                hostname: string;
                iconUrl: string | null;
                id: string;
                name: string;
            };
        };
        pairingId: string;
        requestEnvelope: {
            encryptedPrivateMessage: {
                nonceB64: string;
                securedB64: string;
            };
            messageSignature: string;
            serializedPublicMessage: string;
        };
        requestType: SigningRequestTypes;
        responseEnvelope?: {
            encryptedPrivateMessage: {
                nonceB64: string;
                securedB64: string;
            };
            messageSignature: string;
            serializedPublicMessage: string;
        } | undefined;
        status: SigningRequestStatus;
    }>;
    private signRequest;
    /**
     * Requests a connection to an account (internally known as pairing).
     * @returns either the address of the connected account, or undefined if the
     * connection was cancelled.
     */
    addPairing({ publicKey, secretKey }: Ed25519KeyPair, finalizedPairing: SerializedDate<FinalizedPairingData>): Promise<void>;
    disconnect(address: string): Promise<void>;
    signMessage(address: string, args: SignMessageRequestArgs, options?: SignRequestOptions): Promise<import("@identity-connect/wallet-api").FullMessageParams & import("@identity-connect/wallet-api").FullMessageResult & {
        signature: string;
    }>;
    signTransaction(address: string, args: SignTransactionWithPayloadRequestArgs, options?: SignRequestOptions): Promise<SignTransactionWithPayloadResponseArgs>;
    signTransaction(address: string, args: SignTransactionWithRawTxnRequestArgs, options?: SignRequestOptions): Promise<SignTransactionWithRawTxnResponseArgs>;
    signTransaction(address: string, args: SignTransactionRequestArgs, options?: SignRequestOptions): Promise<SignTransactionResponseArgs>;
    signAndSubmitTransaction(address: string, args: SignAndSubmitTransactionRequestArgs, options?: SignRequestOptions): Promise<SignAndSubmitTransactionResponseArgs>;
    getConnectedAccounts(): Promise<AccountInfo[]>;
    private readonly onDisconnectListeners;
    onDisconnect(listener: OnDisconnectListener): OnDisconnectListenerCleanup;
}
//# sourceMappingURL=PairingClient.d.ts.map