import { Deserializer, Serializer } from '@aptos-labs/ts-sdk';
export interface DappInfo {
    domain: string;
    imageURI?: string;
    name: string;
}
export declare function serializeDappInfo(serializer: Serializer, value: DappInfo): void;
export declare function deserializeDappInfo(deserializer: Deserializer): DappInfo;
//# sourceMappingURL=DappInfo.d.ts.map