import { MoveValue, LedgerVersionArg } from '../types/types.mjs';
import { AptosConfig } from '../api/aptosConfig.mjs';
import { InputViewFunctionData, InputViewFunctionJsonData } from '../transactions/types.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../utils/const.mjs';
import '../bcs/serializable/moveStructs.mjs';
import '../bcs/serializable/movePrimitives.mjs';
import '../bcs/deserializer.mjs';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../transactions/instances/transactionArgument.mjs';
import '../bcs/serializable/fixedBytes.mjs';
import '../core/accountAddress.mjs';
import '../publicKey-CJOcUwJK.mjs';
import '../core/crypto/signature.mjs';
import '../transactions/authenticator/account.mjs';
import '../core/crypto/ed25519.mjs';
import '../core/crypto/privateKey.mjs';
import '../core/crypto/multiEd25519.mjs';
import '../core/crypto/multiKey.mjs';
import '../core/crypto/singleKey.mjs';
import '../core/crypto/secp256k1.mjs';
import '../transactions/instances/rawTransaction.mjs';
import '../transactions/instances/chainId.mjs';
import '../transactions/instances/transactionPayload.mjs';
import '../transactions/instances/identifier.mjs';
import '../transactions/instances/moduleId.mjs';
import '../transactions/typeTag/index.mjs';
import '../transactions/instances/simpleTransaction.mjs';
import '../transactions/instances/multiAgentTransaction.mjs';

declare function view<T extends Array<MoveValue> = Array<MoveValue>>(args: {
    aptosConfig: AptosConfig;
    payload: InputViewFunctionData;
    options?: LedgerVersionArg;
}): Promise<T>;
declare function viewJson<T extends Array<MoveValue> = Array<MoveValue>>(args: {
    aptosConfig: AptosConfig;
    payload: InputViewFunctionJsonData;
    options?: LedgerVersionArg;
}): Promise<T>;

export { view, viewJson };
