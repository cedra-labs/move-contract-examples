import { SerializedWalletRequest, SerializedWalletResponse } from '@aptos-connect/wallet-api';
export declare class PromptUnauthorizedError extends Error {
    constructor();
}
export declare function openPrompt(url: string | URL, size?: {
    height: number;
    width: number;
}): Window;
export declare function waitForPromptResponse(baseUrl: string, promptWindow: Window, request: SerializedWalletRequest): Promise<SerializedWalletResponse>;
//# sourceMappingURL=prompt.d.ts.map