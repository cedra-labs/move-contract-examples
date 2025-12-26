import { AnyTransactionPayloadInstance, AptosConfig, InputGenerateTransactionPayloadData, TransactionPayload } from '@aptos-labs/ts-sdk';
import { JsonTransactionPayload } from '@identity-connect/wallet-api';
/**
 * Normalize payload input so that it's compatible with IC requests.
 * This variant is sync and will convert a payload generation input into a
 * `JsonTransactionPayload` when the ABI is not available
 */
export declare function normalizePayloadForIC(payload: TransactionPayload | InputGenerateTransactionPayloadData): AnyTransactionPayloadInstance | JsonTransactionPayload;
/**
 * Normalize payload input so that it's compatible with IC requests.
 * This variant is async and will generate a payload instance when an input is provided
 */
export declare function normalizePayloadForIC(payload: TransactionPayload | InputGenerateTransactionPayloadData, aptosConfig: AptosConfig): Promise<AnyTransactionPayloadInstance>;
//# sourceMappingURL=conversion.d.ts.map