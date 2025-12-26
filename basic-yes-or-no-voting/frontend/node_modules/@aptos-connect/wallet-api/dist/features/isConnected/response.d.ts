import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface IsConnectedResponse extends WalletResponseWithArgs<IsConnectedResponse.Args> {
}
export declare namespace IsConnectedResponse {
    export type Args = boolean;
    type _Response = IsConnectedResponse;
    export function serialize(args: Args): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map