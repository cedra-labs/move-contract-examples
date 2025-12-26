import { AccountAddress, Deserializer, PublicKey, Serializer } from '@aptos-labs/ts-sdk';
export interface AccountInput {
    address: AccountAddress;
    publicKey?: PublicKey;
}
export declare function serializeAccountInput(serializer: Serializer, value: AccountInput): void;
export declare function deserializeAccountInput(deserializer: Deserializer): AccountInput;
//# sourceMappingURL=AccountInput.d.ts.map