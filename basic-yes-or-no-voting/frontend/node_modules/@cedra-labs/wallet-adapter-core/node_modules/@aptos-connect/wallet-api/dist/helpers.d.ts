import { Deserializer, Network, Serializer } from '@aptos-labs/ts-sdk';
export type SerializeFn<T> = (serializer: Serializer, value: T) => void;
export type DeserializeFn<T> = (deserializer: Deserializer) => T;
export declare function chainIdToNetwork(chainId: number): Network;
export declare function isSupportedNetwork(network: string): network is Network;
//# sourceMappingURL=helpers.d.ts.map