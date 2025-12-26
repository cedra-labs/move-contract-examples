import { ConnectRequest, type DappInfo, SignAndSubmitTransactionRequest, SignAndSubmitTransactionResponse, SignInRequest, SignInResponse, SignMessageRequest, SignMessageResponse, SignTransactionRequest, SignTransactionResponse, UserApproval, UserDismissal } from '@aptos-connect/wallet-api';
import { AccountAddress, AccountAddressInput } from '@aptos-labs/ts-sdk';
import { NetworkName } from '@identity-connect/api';
export interface WithSignerAddress {
    signerAddress: AccountAddress;
}
export interface ACDappClientConfig {
    backendBaseURL?: string;
    dappId?: string;
    dappImageURI?: string;
    dappName?: string;
    defaultNetworkName?: NetworkName;
    frontendBaseURL?: string;
    provider?: 'google' | 'apple';
    tgWebAppURL?: string;
}
export declare class ACDappClient {
    private readonly defaultNetworkName;
    readonly dappInfo: DappInfo;
    private readonly transport;
    private readonly dappId?;
    private readonly pairingClient;
    constructor({ backendBaseURL, dappId, dappImageURI, dappName, defaultNetworkName, frontendBaseURL, provider, tgWebAppURL, }?: ACDappClientConfig);
    private getKeylessAccounts;
    private getIcAccounts;
    private isIcAccount;
    getConnectedAccounts(): Promise<import("@aptos-connect/wallet-api").AccountInfo[]>;
    disconnect(address: AccountAddressInput): Promise<void>;
    connect({ claimOptions, preferredWalletName, }?: Omit<ConnectRequest.Args, 'dappId' | 'dappEd25519PublicKeyB64'>): Promise<UserDismissal | UserApproval<{
        account: import("@aptos-connect/wallet-api").AccountInfo;
    }>>;
    signIn(args: SignInRequest.Args): Promise<UserDismissal | UserApproval<SignInResponse.ApprovalArgs>>;
    signMessage(args: SignMessageRequest.Args & WithSignerAddress): Promise<SignMessageResponse.Args>;
    signTransaction(args: (SignTransactionRequest.Args | SignTransactionRequest.ArgsWithTransaction) & WithSignerAddress): Promise<SignTransactionResponse.Args>;
    signAndSubmitTransaction(args: SignAndSubmitTransactionRequest.Args & WithSignerAddress): Promise<SignAndSubmitTransactionResponse.Args>;
}
//# sourceMappingURL=ACDappClient.d.ts.map