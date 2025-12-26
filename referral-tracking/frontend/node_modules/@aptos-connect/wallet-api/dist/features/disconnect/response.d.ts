import { SerializedWalletResponse, WalletResponseWithArgs } from '../../WalletResponse';
export interface DisconnectResponse extends WalletResponseWithArgs<DisconnectResponse.Args> {
}
export declare namespace DisconnectResponse {
    export type Args = {};
    type _Response = DisconnectResponse;
    export function serialize(args: Args): SerializedWalletResponse;
    export function deserialize(serializedResponse: SerializedWalletResponse): _Response;
    export {};
}
//# sourceMappingURL=response.d.ts.map