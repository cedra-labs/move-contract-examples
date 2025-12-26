import { AccountAddressInput } from '../core/accountAddress.mjs';
import { InputGenerateTransactionOptions } from '../transactions/types.mjs';
import { AptosConfig } from '../api/aptosConfig.mjs';
import { SimpleTransaction } from '../transactions/instances/simpleTransaction.mjs';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../types/types.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';
import '../bcs/serializable/moveStructs.mjs';
import '../bcs/serializable/movePrimitives.mjs';
import '../bcs/serializable/fixedBytes.mjs';
import '../publicKey-CJOcUwJK.mjs';
import '../core/crypto/signature.mjs';
import '../transactions/authenticator/account.mjs';
import '../core/crypto/ed25519.mjs';
import '../core/crypto/privateKey.mjs';
import '../utils/const.mjs';
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
import '../transactions/instances/multiAgentTransaction.mjs';

declare function addAuthenticationFunctionTransaction(args: {
    aptosConfig: AptosConfig;
    sender: AccountAddressInput;
    authenticationFunction: string;
    options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction>;
declare function removeAuthenticationFunctionTransaction(args: {
    aptosConfig: AptosConfig;
    sender: AccountAddressInput;
    authenticationFunction: string;
    options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction>;
declare function removeDispatchableAuthenticatorTransaction(args: {
    aptosConfig: AptosConfig;
    sender: AccountAddressInput;
    options?: InputGenerateTransactionOptions;
}): Promise<SimpleTransaction>;

export { addAuthenticationFunctionTransaction, removeAuthenticationFunctionTransaction, removeDispatchableAuthenticatorTransaction };
