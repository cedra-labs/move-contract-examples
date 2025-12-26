import { AccountAddress, AccountAuthenticator, Deserializer, Serializer } from '@aptos-labs/ts-sdk';
export interface AccountAuthenticatorInput {
    address: AccountAddress;
    authenticator: AccountAuthenticator;
}
export declare function serializeAccountAuthenticatorInput(serializer: Serializer, value: AccountAuthenticatorInput): void;
export declare function deserializeAccountAuthenticatorInput(deserializer: Deserializer): AccountAuthenticatorInput;
//# sourceMappingURL=AccountAuthenticatorInput.d.ts.map