import { Deserializer } from '../../bcs/deserializer.mjs';
import { Serializable, Serializer } from '../../bcs/serializer.mjs';
import { ChainId } from './chainId.mjs';
import { AccountAddress } from '../../core/accountAddress.mjs';
import { TransactionPayload } from './transactionPayload.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import './transactionArgument.mjs';
import './identifier.mjs';
import './moduleId.mjs';
import '../typeTag/index.mjs';

/**
 * Represents a raw transaction that can be serialized and deserialized.
 * Raw transactions contain the metadata and payloads that can be submitted to the Aptos chain for execution.
 * They must be signed before the Aptos chain can execute them.
 * @group Implementation
 * @category Transactions
 */
declare class RawTransaction extends Serializable {
    readonly sender: AccountAddress;
    readonly sequence_number: bigint;
    readonly payload: TransactionPayload;
    readonly max_gas_amount: bigint;
    readonly gas_unit_price: bigint;
    readonly expiration_timestamp_secs: bigint;
    readonly chain_id: ChainId;
    /**
     * RawTransactions contain the metadata and payloads that can be submitted to Aptos chain for execution.
     * RawTransactions must be signed before Aptos chain can execute them.
     *
     * @param sender The sender Account Address
     * @param sequence_number Sequence number of this transaction. This must match the sequence number stored in
     *   the sender's account at the time the transaction executes.
     * @param payload Instructions for the Aptos Blockchain, including publishing a module,
     *   execute an entry function or execute a script payload.
     * @param max_gas_amount Maximum total gas to spend for this transaction. The account must have more
     *   than this gas or the transaction will be discarded during validation.
     * @param gas_unit_price Price to be paid per gas unit.
     * @param expiration_timestamp_secs The blockchain timestamp at which the blockchain would discard this transaction.
     * @param chain_id The chain ID of the blockchain that this transaction is intended to be run on.
     * @group Implementation
     * @category Transactions
     */
    constructor(sender: AccountAddress, sequence_number: bigint, payload: TransactionPayload, max_gas_amount: bigint, gas_unit_price: bigint, expiration_timestamp_secs: bigint, chain_id: ChainId);
    /**
     * Serializes the transaction data, including the fee payer transaction type, raw transaction, secondary signer addresses,
     * and fee payer address.
     * This function is essential for preparing the transaction for transmission or storage in a serialized format.
     *
     * @param serializer - The serializer instance used to serialize the transaction data.
     * @group Implementation
     * @category Transactions
     */
    serialize(serializer: Serializer): void;
    /**
     * Deserialize a Raw Transaction With Data.
     * This function retrieves the appropriate raw transaction based on the variant index provided by the deserializer.
     *
     * @param deserializer - An instance of the Deserializer used to read the serialized data.
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): RawTransaction;
}
/**
 * Represents a raw transaction with associated data that can be serialized and deserialized.
 *
 * @extends Serializable
 * @group Implementation
 * @category Transactions
 */
declare abstract class RawTransactionWithData extends Serializable {
    /**
     * Serialize a Raw Transaction With Data
     * @group Implementation
     * @category Transactions
     */
    abstract serialize(serializer: Serializer): void;
    /**
     * Deserialize a Raw Transaction With Data
     * @group Implementation
     * @category Transactions
     */
    static deserialize(deserializer: Deserializer): RawTransactionWithData;
}
/**
 * Represents a multi-agent transaction that can be serialized and deserialized.
 *
 * @extends RawTransactionWithData
 * @group Implementation
 * @category Transactions
 */
declare class MultiAgentRawTransaction extends RawTransactionWithData {
    /**
     * The raw transaction
     * @group Implementation
     * @category Transactions
     */
    readonly raw_txn: RawTransaction;
    /**
     * The secondary signers on this transaction
     * @group Implementation
     * @category Transactions
     */
    readonly secondary_signer_addresses: Array<AccountAddress>;
    constructor(raw_txn: RawTransaction, secondary_signer_addresses: Array<AccountAddress>);
    serialize(serializer: Serializer): void;
    /**
     * Deserializes a Fee Payer Raw Transaction from the provided deserializer.
     * This function allows you to reconstruct a Fee Payer Raw Transaction object, which includes the raw transaction data,
     * secondary signer addresses, and the fee payer address.
     *
     * @param deserializer - The deserializer used to read the raw transaction data.
     * @returns A FeePayerRawTransaction object constructed from the deserialized data.
     * @group Implementation
     * @category Transactions
     */
    static load(deserializer: Deserializer): MultiAgentRawTransaction;
}
/**
 * Represents a Fee Payer Transaction that can be serialized and deserialized.
 * @group Implementation
 * @category Transactions
 */
declare class FeePayerRawTransaction extends RawTransactionWithData {
    /**
     * The raw transaction
     * @group Implementation
     * @category Transactions
     */
    readonly raw_txn: RawTransaction;
    /**
     * The secondary signers on this transaction - optional and can be empty
     * @group Implementation
     * @category Transactions
     */
    readonly secondary_signer_addresses: Array<AccountAddress>;
    /**
     * The fee payer account address
     * @group Implementation
     * @category Transactions
     */
    readonly fee_payer_address: AccountAddress;
    constructor(raw_txn: RawTransaction, secondary_signer_addresses: Array<AccountAddress>, fee_payer_address: AccountAddress);
    serialize(serializer: Serializer): void;
    static load(deserializer: Deserializer): FeePayerRawTransaction;
}

export { FeePayerRawTransaction, MultiAgentRawTransaction, RawTransaction, RawTransactionWithData };
