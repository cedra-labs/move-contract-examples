import { AccountAddressInput } from '../../core/accountAddress.mjs';
import { AccountData, LedgerVersionArg, MoveModuleBytecode } from '../../types/types.mjs';
import { AptosConfig } from '../../api/aptosConfig.mjs';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../bcs/deserializer.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import '../../utils/const.mjs';

/**
 * Retrieves account information for a specified account address.
 *
 * @param args - The arguments for retrieving account information.
 * @param args.aptosConfig - The configuration object for Aptos.
 * @param args.accountAddress - The address of the account to retrieve information for.
 * @group Implementation
 */
declare function getInfo(args: {
    aptosConfig: AptosConfig;
    accountAddress: AccountAddressInput;
}): Promise<AccountData>;
/**
 * Queries for a move module given an account address and module name.
 * This function can help you retrieve the module's ABI and other relevant information.
 *
 * @param args - The arguments for retrieving the module.
 * @param args.aptosConfig - The configuration for the Aptos client.
 * @param args.accountAddress - The account address in hex-encoded 32 byte format.
 * @param args.moduleName - The name of the module to retrieve.
 * @param args.options - Optional parameters for the request.
 * @param args.options.ledgerVersion - Specifies the ledger version of transactions. By default, the latest version will be used.
 * @returns The move module.
 * @group Implementation
 */
declare function getModule(args: {
    aptosConfig: AptosConfig;
    accountAddress: AccountAddressInput;
    moduleName: string;
    options?: LedgerVersionArg;
}): Promise<MoveModuleBytecode>;

export { getInfo, getModule };
