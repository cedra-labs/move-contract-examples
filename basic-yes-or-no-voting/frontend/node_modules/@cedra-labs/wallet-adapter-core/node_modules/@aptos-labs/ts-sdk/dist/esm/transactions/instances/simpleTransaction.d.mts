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
 * Represents a simple transaction type that can be submitted to the Aptos chain for execution.
 *
 * This transaction type is designed for a single signer and includes metadata such as the Raw Transaction
 * and an optional sponsor Account Address to cover gas fees.
 *
 * @param rawTransaction - The Raw Transaction.
 * @param feePayerAddress - The optional sponsor Account Address.
 * @group Implementation
 * @category Transactions
 */
declare class SimpleTransaction extends Serializable {
    rawTransaction: RawTransaction;
    feePayerAddress?: AccountAddress | undefined;
    readonly secondarySignerAddresses: undefined;
    /**
     * SimpleTransaction represents a transaction signed by a single account that
     * can be submitted to the Aptos chain for execution.
     *
     * @param rawTransaction The Raw Transaction.
     * @param feePayerAddress The optional sponsor Account Address to pay the gas fees.
     * @group Implementation
     * @category Transactions
     */
    constructor(rawTransaction: RawTransaction, feePayerAddress?: AccountAddress);
    /**
     * Serializes the transaction data using the provided serializer.
     * This function ensures that the raw transaction and fee payer address are properly serialized for further processing.
     *
     * @param serializer - The serializer instance used to serialize the transaction data.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a SimpleTransaction from the given deserializer.
     * This function helps in reconstructing a SimpleTransaction object from its serialized form.
     *
     * @param deserializer - The deserializer instance used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): SimpleTransaction;
}

export { SimpleTransaction };
