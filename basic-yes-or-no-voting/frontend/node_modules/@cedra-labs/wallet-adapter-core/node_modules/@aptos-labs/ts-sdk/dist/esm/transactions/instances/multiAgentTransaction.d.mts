import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import { RawTransaction } from './rawTransaction.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import './transactionArgument.mjs';
import './chainId.mjs';
import './transactionPayload.mjs';
import './identifier.mjs';
import './moduleId.mjs';
import '../typeTag/index.mjs';

/**
 * Represents a multi-agent transaction that can be serialized and deserialized.
 * This transaction includes a raw transaction, optional fee payer address, and multiple secondary signer addresses.
 *
 * @param rawTransaction The raw transaction to be executed.
 * @param secondarySignerAddresses An array of secondary signer addresses involved in the transaction.
 * @param feePayerAddress An optional account address that sponsors the transaction's gas fees.
 * @group Implementation
 * @category Transactions
 */
declare class MultiAgentTransaction extends Serializable {
    rawTransaction: RawTransaction;
    feePayerAddress?: AccountAddress | undefined;
    secondarySignerAddresses: AccountAddress[];
    /**
     * Represents a MultiAgentTransaction that can be submitted to the Aptos chain for execution.
     * This class encapsulates the raw transaction data, the secondary signer addresses, and an optional fee payer address.
     *
     * @param rawTransaction The raw transaction data.
     * @param secondarySignerAddresses An array of secondary signer addresses.
     * @param feePayerAddress An optional account address that sponsors the gas fees.
     * @group Implementation
     * @category Transactions
     */
    constructor(rawTransaction: RawTransaction, secondarySignerAddresses: AccountAddress[], feePayerAddress?: AccountAddress);
    /**
     * Serializes the transaction data, including the raw transaction, secondary signer addresses, and fee payer address.
     * This function is essential for preparing the transaction for transmission or storage in a serialized format.
     *
     * @param serializer - The serializer instance used to serialize the transaction data.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a MultiAgentTransaction from the provided deserializer.
     * This function allows you to reconstruct a MultiAgentTransaction object from its serialized form, including any secondary
     * signer addresses and the fee payer address if present.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): MultiAgentTransaction;
}

export { MultiAgentTransaction };
