import { Signature } from '@aptos-labs/ts-sdk';
import { UserResponse } from '../../UserResponse';
import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface SignMessageResponse extends WalletResponseWithArgs<SignMessageResponse.Args> {
}
export declare namespace SignMessageResponse {
    export interface ApprovalArgs {
        fullMessage: string;
        signature: Signature;
    }
    export type Args = UserResponse<ApprovalArgs>;
    type _Response = SignMessageResponse;
    export function serialize(args: Args): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map