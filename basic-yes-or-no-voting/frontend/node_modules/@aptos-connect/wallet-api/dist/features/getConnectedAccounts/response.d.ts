import { type AccountInfo } from '../../shared';
import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface GetConnectedAccountsResponse extends WalletResponseWithArgs<GetConnectedAccountsResponse.Args> {
}
export declare namespace GetConnectedAccountsResponse {
    export type Args = AccountInfo[];
    type _Response = GetConnectedAccountsResponse;
    export function serialize(args: Args): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map