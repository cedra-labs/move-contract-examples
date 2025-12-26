import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import { AnyNumber } from '../../types/types.mjs';
import { U8, U64 } from '../../bcs/serializable/movePrimitives.mjs';
import { MoveString, MoveVector } from '../../bcs/serializable/moveStructs.mjs';
import { P as PublicKey } from '../../publicKey-CJOcUwJK.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../bcs/deserializer.mjs';
import './transactionArgument.mjs';
import '../../core/crypto/signature.mjs';
import '../../api/aptosConfig.mjs';
import '../../utils/const.mjs';

/**
 * Represents a challenge required for the account owner to sign in order to rotate the authentication key.
 * @group Implementation
 * @category Transactions
 */
declare class RotationProofChallenge extends Serializable {
    readonly accountAddress: AccountAddress;
    readonly moduleName: MoveString;
    readonly structName: MoveString;
    readonly originator: AccountAddress;
    readonly currentAuthKey: AccountAddress;
    readonly newPublicKey: MoveVector<U8>;
    readonly sequenceNumber: U64;
    /**
     * Initializes a new instance of the class with the specified parameters.
     * This constructor sets up the necessary attributes for managing account keys.
     *
     * @param args - The parameters required to create the instance.
     * @param args.sequenceNumber - The sequence number associated with the transaction.
     * @param args.originator - The account address of the originator.
     * @param args.currentAuthKey - The current authentication key of the account.
     * @param args.newPublicKey - The new public key to be set for the account.
     * @group Implementation
     * @category Transactions
     */
    constructor(args: {
        sequenceNumber: AnyNumber;
        originator: AccountAddress;
        currentAuthKey: AccountAddress;
        newPublicKey: PublicKey;
    });
    /**
     * Serializes the properties of the current instance for transmission or storage.
     * This function helps in converting the instance data into a format suitable for serialization.
     *
     * @param serializer - The serializer used to serialize the instance properties.
     * @param serializer.accountAddress - The account address to serialize.
     * @param serializer.moduleName - The module name to serialize.
     * @param serializer.structName - The struct name to serialize.
     * @param serializer.sequenceNumber - The sequence number to serialize.
     * @param serializer.originator - The originator to serialize.
     * @param serializer.currentAuthKey - The current authentication key to serialize.
     * @param serializer.newPublicKey - The new public key to serialize.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
}

export { RotationProofChallenge };
