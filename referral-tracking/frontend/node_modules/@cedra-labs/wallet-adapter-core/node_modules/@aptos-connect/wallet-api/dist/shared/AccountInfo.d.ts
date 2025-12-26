import { AccountAddress, Deserializer, PublicKey, Serializer } from '@aptos-labs/ts-sdk';
export interface AccountInfo {
    address: AccountAddress;
    name?: string;
    publicKey: PublicKey;
}
export declare function serializeAccountInfo(serializer: Serializer, value: AccountInfo): void;
export declare function deserializeAccountInfo(deserializer: Deserializer): AccountInfo;
//# sourceMappingURL=AccountInfo.d.ts.map