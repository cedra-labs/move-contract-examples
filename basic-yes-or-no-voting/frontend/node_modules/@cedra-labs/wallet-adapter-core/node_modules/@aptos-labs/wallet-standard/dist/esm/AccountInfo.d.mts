import { AccountAddressInput, PublicKey, Serializable, AccountAddress, Serializer, Deserializer } from '@aptos-labs/ts-sdk';

interface AccountInfoInput {
    address: AccountAddressInput;
    publicKey: PublicKey;
    ansName?: string;
}
declare class AccountInfo extends Serializable {
    readonly address: AccountAddress;
    readonly publicKey: PublicKey;
    readonly ansName?: string;
    constructor({ address, publicKey, ansName }: AccountInfoInput);
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): AccountInfo;
}

export { AccountInfo, AccountInfoInput };
