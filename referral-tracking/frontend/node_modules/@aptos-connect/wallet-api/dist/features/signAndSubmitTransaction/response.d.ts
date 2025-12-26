import { UserResponse } from '../../UserResponse';
import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface SignAndSubmitTransactionResponse extends WalletResponseWithArgs<SignAndSubmitTransactionResponse.Args> {
}
export declare namespace SignAndSubmitTransactionResponse {
    export interface ApprovalArgs {
        txnHash: string;
    }
    export type Args = UserResponse<ApprovalArgs>;
    type _Response = SignAndSubmitTransactionResponse;
    export function serialize(args: Args): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map