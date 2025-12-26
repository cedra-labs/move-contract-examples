import { ACPairingClient, ACPairingClientConfig } from './PairingClient';
export interface ICDappClientConfig extends ACPairingClientConfig {
    frontendBaseURL?: string;
}
export declare class ICDappClient extends ACPairingClient {
    private readonly dappId;
    private readonly frontendBaseURL;
    constructor(dappId: string, { frontendBaseURL, ...pairingClientConfig }?: ICDappClientConfig);
    private createPairingRequest;
    /**
     * Requests a connection to an account (internally known as pairing).
     * @returns either the address of the connected account, or undefined if the
     * connection was cancelled.
     */
    connect(): Promise<string | undefined>;
    offboard(address: string): Promise<boolean>;
}
//# sourceMappingURL=ICDappClient.d.ts.map