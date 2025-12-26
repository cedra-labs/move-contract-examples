import { SerializedWalletRequest } from '@aptos-connect/wallet-api';
export declare class WebWalletTransport {
    private readonly baseUrl;
    private readonly provider;
    private readonly tgWebAppUrl?;
    constructor(baseUrl: string, provider?: 'google' | 'apple', tgWebAppUrl?: string | undefined);
    sendPromptRequest(request: SerializedWalletRequest): Promise<import("@aptos-connect/wallet-api").SerializedWalletResponse>;
    sendRequest(request: SerializedWalletRequest): Promise<import("@aptos-connect/wallet-api").SerializedWalletResponse>;
}
//# sourceMappingURL=index.d.ts.map