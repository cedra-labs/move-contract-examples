import { DeserializeFn, SerializeFn } from './helpers';
export interface WalletResponseWithArgs<TResponseArgs> {
    args: TResponseArgs;
}
export interface SerializedWalletResponse {
    data: Uint8Array;
}
export declare function serializeWalletResponse<TArgs>(args: TArgs, serializeFn: SerializeFn<TArgs>): SerializedWalletResponse;
export declare function deserializeWalletResponse<TArgs>({ data }: SerializedWalletResponse, deserializeFn: DeserializeFn<TArgs>): WalletResponseWithArgs<TArgs>;
//# sourceMappingURL=WalletResponse.d.ts.map