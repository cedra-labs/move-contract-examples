import { SerializedWalletRequest } from '../WalletRequest';
import { SerializedWalletResponse } from '../WalletResponse';
import { TypedMessage } from './common';
export declare class PromptConnectionRequestMessage implements TypedMessage {
    static readonly TYPE = "PromptConnectionRequest";
    readonly __messageType = "PromptConnectionRequest";
}
export declare class PromptConnectionResponseMessage implements TypedMessage {
    serializedRequest: SerializedWalletRequest;
    static readonly TYPE = "PromptConnectionResponse";
    readonly __messageType = "PromptConnectionResponse";
    constructor(serializedRequest: SerializedWalletRequest);
}
export declare class PromptApprovalResponseMessage implements TypedMessage {
    serializedValue: SerializedWalletResponse;
    static readonly TYPE = "PromptApprovalResponse";
    readonly __messageType = "PromptApprovalResponse";
    constructor(serializedValue: SerializedWalletResponse);
}
export declare class PromptUnauthorizedErrorMessage implements TypedMessage {
    static readonly TYPE = "PromptUnauthorizedError";
    readonly __messageType = "PromptUnauthorizedError";
}
export declare function urlEncodeWalletRequest(request: SerializedWalletRequest): string;
export declare function urlDecodeWalletRequest(encodedRequest: string): SerializedWalletRequest;
//# sourceMappingURL=prompt.d.ts.map