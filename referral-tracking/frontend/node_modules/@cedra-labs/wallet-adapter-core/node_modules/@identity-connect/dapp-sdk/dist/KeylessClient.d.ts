import { ConnectResponse, type DappInfo, GetConnectedAccountsResponse, SignAndSubmitTransactionRequest, SignAndSubmitTransactionResponse, SignMessageRequest, SignMessageResponse, SignTransactionRequest, SignTransactionResponse } from '@aptos-connect/wallet-api';
import { NetworkName } from '@identity-connect/api';
export interface ACKeylessClientConfig {
    dappImageURI?: string;
    dappName?: string;
    defaultNetworkName?: NetworkName;
    frontendBaseURL?: string;
    provider?: 'google' | 'apple';
}
export declare class ACKeylessClient {
    private readonly defaultNetworkName;
    readonly dappInfo: DappInfo;
    private readonly transport;
    constructor({ dappImageURI, dappName, defaultNetworkName, frontendBaseURL, provider, }?: ACKeylessClientConfig);
    isConnected(): Promise<boolean>;
    getConnectedAccounts(): Promise<GetConnectedAccountsResponse.Args>;
    disconnect(): Promise<void>;
    connect(): Promise<ConnectResponse.Args>;
    signMessage(args: SignMessageRequest.Args): Promise<SignMessageResponse.Args>;
    signTransaction(args: SignTransactionRequest.Args | SignTransactionRequest.ArgsWithTransaction): Promise<SignTransactionResponse.Args>;
    signAndSubmitTransaction(args: SignAndSubmitTransactionRequest.Args): Promise<SignAndSubmitTransactionResponse.Args>;
}
//# sourceMappingURL=KeylessClient.d.ts.map