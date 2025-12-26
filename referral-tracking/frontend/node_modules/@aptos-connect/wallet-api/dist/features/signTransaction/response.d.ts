import { AccountAuthenticator, RawTransaction } from '@aptos-labs/ts-sdk';
import { UserResponse } from '../../UserResponse';
import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface SignTransactionResponse extends WalletResponseWithArgs<SignTransactionResponse.Args> {
}
export declare namespace SignTransactionResponse {
    export interface ApprovalArgs {
        authenticator: AccountAuthenticator;
        rawTransaction?: RawTransaction;
    }
    export type Args = UserResponse<ApprovalArgs>;
    type _Response = SignTransactionResponse;
    export function serialize(args: Args): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map