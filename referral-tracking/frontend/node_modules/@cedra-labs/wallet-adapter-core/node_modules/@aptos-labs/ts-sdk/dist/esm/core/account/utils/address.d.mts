import { AccountAddress } from '../../accountAddress.mjs';
import '../../../bcs/serializer.mjs';
import '../../hex.mjs';
import '../../common.mjs';
import '../../../types/types.mjs';
import '../../../types/indexer.mjs';
import '../../../types/generated/operations.mjs';
import '../../../types/generated/types.mjs';
import '../../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../../bcs/deserializer.mjs';
import '../../../transactions/instances/transactionArgument.mjs';

/**
 * Creates an object address from creator address and seed
 *
 * @param creatorAddress The object creator account address
 * @param seed The seed in either Uint8Array | string type
 *
 * @returns The object account address
 * @group Implementation
 * @category Account (On-Chain Model)
 */
declare const createObjectAddress: (creatorAddress: AccountAddress, seed: Uint8Array | string) => AccountAddress;
/**
 * Creates a resource address from creator address and seed
 *
 * @param creatorAddress The creator account address
 * @param seed The seed in either Uint8Array | string type
 *
 * @returns The resource account address
 * @group Implementation
 * @category Account (On-Chain Model)
 */
declare const createResourceAddress: (creatorAddress: AccountAddress, seed: Uint8Array | string) => AccountAddress;
/**
 * Creates a token object address from creator address, collection name and token name
 *
 * @param creatorAddress The token creator account address
 * @param collectionName The collection name
 * @param tokenName The token name
 *
 * @returns The token account address
 * @group Implementation
 * @category Account (On-Chain Model)
 */
declare const createTokenAddress: (creatorAddress: AccountAddress, collectionName: string, tokenName: string) => AccountAddress;

export { createObjectAddress, createResourceAddress, createTokenAddress };
