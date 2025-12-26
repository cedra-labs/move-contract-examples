import { AptosConfig } from '../../api/aptosConfig.mjs';
import { InputBatchedFunctionData } from '../types.mjs';
import { CallArgument } from '@aptos-labs/script-composer-pack';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '../../utils/const.mjs';
import '../../bcs/serializable/moveStructs.mjs';
import '../../bcs/serializable/movePrimitives.mjs';
import '../../bcs/deserializer.mjs';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../instances/transactionArgument.mjs';
import '../../bcs/serializable/fixedBytes.mjs';
import '../../core/accountAddress.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/crypto/signature.mjs';
import '../authenticator/account.mjs';
import '../../core/crypto/ed25519.mjs';
import '../../core/crypto/privateKey.mjs';
import '../../core/crypto/multiEd25519.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import '../instances/rawTransaction.mjs';
import '../instances/chainId.mjs';
import '../instances/transactionPayload.mjs';
import '../instances/identifier.mjs';
import '../instances/moduleId.mjs';
import '../typeTag/index.mjs';
import '../instances/simpleTransaction.mjs';
import '../instances/multiAgentTransaction.mjs';

/**
 * A wrapper class around TransactionComposer, which is a WASM library compiled
 * from aptos-core/aptos-move/script-composer.
 * This class allows the SDK caller to build a transaction that invokes multiple Move functions
 * and allow for arguments to be passed around.
 * */
declare class AptosScriptComposer {
    private config;
    private builder?;
    private static transactionComposer?;
    constructor(aptosConfig: AptosConfig);
    init(): Promise<void>;
    addBatchedCalls(input: InputBatchedFunctionData): Promise<CallArgument[]>;
    build(): Uint8Array;
}

export { AptosScriptComposer };
