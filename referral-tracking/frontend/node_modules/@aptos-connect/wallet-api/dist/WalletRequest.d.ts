import { DappInfo } from './shared';
import { DeserializeFn, SerializeFn } from './helpers';
export interface WalletRequest<RequestName extends string, Version extends number> {
    dappInfo: DappInfo;
    name: RequestName;
    version: Version;
}
export interface WalletRequestWithArgs<RequestName extends string, Version extends number, TArgs> extends WalletRequest<RequestName, Version> {
    args: TArgs;
}
export interface SerializedWalletRequest<RequestName extends string = string, Version extends number = number> {
    data: Uint8Array;
    name: RequestName;
    version: Version;
}
export declare function serializeWalletRequest<RequestName extends string, Version extends number>({ dappInfo, name, version, }: WalletRequest<RequestName, Version>): SerializedWalletRequest<RequestName, Version>;
export declare function deserializeWalletRequest<RequestName extends string, Version extends number>({ data, name, version, }: SerializedWalletRequest<RequestName, Version>): WalletRequest<RequestName, Version>;
export declare function serializeWalletRequestWithArgs<RequestName extends string, Version extends number, TArgs>({ args, dappInfo, name, version }: WalletRequestWithArgs<RequestName, Version, TArgs>, serializeArgsFn: SerializeFn<TArgs>): SerializedWalletRequest<RequestName, Version>;
export declare function deserializeWalletRequestWithArgs<RequestName extends string, Version extends number, TArgs>({ data, name, version }: SerializedWalletRequest<RequestName, Version>, deserializeArgsFn: DeserializeFn<TArgs>): WalletRequestWithArgs<RequestName, Version, TArgs>;
//# sourceMappingURL=WalletRequest.d.ts.map