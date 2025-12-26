import { AnyRawTransaction, AnyRawTransactionInstance } from '../types.mjs';
import { Serializable } from '../../bcs/serializer.mjs';
import '@aptos-labs/script-composer-pack';
import '../../api/aptosConfig.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '../../utils/const.mjs';
import '../../bcs/serializable/moveStructs.mjs';
import '../../bcs/serializable/movePrimitives.mjs';
import '../../bcs/deserializer.mjs';
import '../instances/transactionArgument.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
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
 * Derives the appropriate raw transaction type based on the provided transaction details.
 * This function helps in identifying whether the transaction is a FeePayerRawTransaction,
 * MultiAgentRawTransaction, or a standard RawTransaction.
 *
 * @param transaction - An object representing an Aptos transaction, which may include:
 *   - feePayerAddress - The address of the fee payer (optional).
 *   - secondarySignerAddresses - An array of secondary signer addresses (optional).
 *   - rawTransaction - The raw transaction data.
 *
 * @returns FeePayerRawTransaction | MultiAgentRawTransaction | RawTransaction
 * @group Implementation
 * @category Transactions
 */
declare function deriveTransactionType(transaction: AnyRawTransaction): AnyRawTransactionInstance;
/**
 * Generates the 'signing message' form of a message to be signed.
 * This function combines a domain separator with the byte representation of the message to create a signing message.
 *
 * @param bytes - The byte representation of the message to be signed and sent to the chain.
 * @param domainSeparator - A domain separator that starts with 'APTOS::'.
 *
 * @returns The Uint8Array of the signing message.
 * @group Implementation
 * @category Transactions
 */
declare function generateSigningMessage(bytes: Uint8Array, domainSeparator: string): Uint8Array;
/**
 * @deprecated
 * Use CryptoHashable instead by having your class implement it and call hash() to get the signing message.
 *
 * Generates the 'signing message' form of a serializable value by serializing it and using the constructor name as the domain
 * separator.
 *
 * @param serializable - An object that has a BCS serialized form.
 *
 * @returns The Uint8Array of the signing message.
 * @group Implementation
 * @category Transactions
 */
declare function generateSigningMessageForSerializable(serializable: Serializable): Uint8Array;
/**
 * Generates the 'signing message' form of a transaction by deriving the type of transaction and applying the appropriate domain
 * separator based on the presence of a fee payer or secondary signers.
 *
 * @param transaction - A transaction that is to be signed, which can include a fee payer address or secondary signer addresses.
 *
 * @returns The Uint8Array of the signing message.
 * @group Implementation
 * @category Transactions
 */
declare function generateSigningMessageForTransaction(transaction: AnyRawTransaction): Uint8Array;

export { deriveTransactionType, generateSigningMessage, generateSigningMessageForSerializable, generateSigningMessageForTransaction };
