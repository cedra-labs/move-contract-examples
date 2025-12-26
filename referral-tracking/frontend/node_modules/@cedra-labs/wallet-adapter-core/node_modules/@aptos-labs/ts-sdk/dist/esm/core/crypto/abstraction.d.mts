import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializer } from '../../bcs/serializer.mjs';
import { HexInput } from '../../types/types.mjs';
import { AccountAddress } from '../accountAddress.mjs';
import { b as AccountPublicKey, A as AuthenticationKey, V as VerifySignatureArgs, a as VerifySignatureAsyncArgs } from '../../publicKey-CJOcUwJK.mjs';
import { Signature } from './signature.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../hex.mjs';
import '../common.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import '../../api/aptosConfig.mjs';
import '../../utils/const.mjs';

declare class AbstractSignature extends Signature {
    readonly value: Uint8Array;
    constructor(value: HexInput);
    serialize(serializer: Serializer): void;
    static deserialize(deserializer: Deserializer): AbstractSignature;
}
declare class AbstractPublicKey extends AccountPublicKey {
    readonly accountAddress: AccountAddress;
    constructor(accountAddress: AccountAddress);
    authKey(): AuthenticationKey;
    verifySignature(args: VerifySignatureArgs): boolean;
    verifySignatureAsync(args: VerifySignatureAsyncArgs): Promise<boolean>;
    serialize(serializer: Serializer): void;
}

export { AbstractPublicKey, AbstractSignature };
