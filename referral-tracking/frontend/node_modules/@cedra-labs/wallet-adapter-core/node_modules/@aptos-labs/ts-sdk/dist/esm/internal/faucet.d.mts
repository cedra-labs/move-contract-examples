import { AptosConfig } from '../api/aptosConfig.mjs';
import { AccountAddressInput } from '../core/accountAddress.mjs';
import { WaitForTransactionOptions, UserTransactionResponse } from '../types/types.mjs';
import '../utils/apiEndpoints.mjs';
import '../utils/const.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';

/**
 * This file contains the underlying implementations for exposed API surface in
 * the {@link api/faucet}. By moving the methods out into a separate file,
 * other namespaces and processes can access these methods without depending on the entire
 * faucet namespace and without having a dependency cycle error.
 * @group Implementation
 */

/**
 * Funds an account with a specified amount of tokens from the Aptos faucet.
 * This function is useful for quickly providing a new or existing account with tokens to facilitate transactions.
 *
 * Note that only devnet has a publicly accessible faucet. For testnet, you must use
 * the minting page at https://aptos.dev/network/faucet.
 *
 * @param args - The arguments for funding the account.
 * @param args.aptosConfig - The configuration settings for connecting to the Aptos network.
 * @param args.accountAddress - The address of the account to be funded.
 * @param args.amount - The amount of tokens to fund the account with.
 * @param args.options - Optional parameters for the transaction.
 * @param args.options.timeoutSecs - The maximum time to wait for the transaction to complete, in seconds.
 * @param args.options.checkSuccess - A flag indicating whether to check if the transaction was successful.
 *
 * @throws Error if the transaction does not return a user transaction type.
 * @group Implementation
 */
declare function fundAccount(args: {
    aptosConfig: AptosConfig;
    accountAddress: AccountAddressInput;
    amount: number;
    options?: WaitForTransactionOptions;
}): Promise<UserTransactionResponse>;

export { fundAccount };
