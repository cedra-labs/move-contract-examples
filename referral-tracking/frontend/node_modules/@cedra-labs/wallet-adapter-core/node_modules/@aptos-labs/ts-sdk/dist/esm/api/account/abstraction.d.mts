import { AccountAddressInput, AccountAddress } from '../../core/accountAddress.mjs';
import { InputGenerateTransactionOptions } from '../../transactions/types.mjs';
import { AptosConfig } from '../aptosConfig.mjs';
import { SimpleTransaction } from '../../transactions/instances/simpleTransaction.mjs';
import '../../bcs/serializer.mjs';
import '../../core/hex.mjs';
import '../../core/common.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../../bcs/deserializer.mjs';
import '../../transactions/instances/transactionArgument.mjs';
import '../../bcs/serializable/moveStructs.mjs';
import '../../bcs/serializable/movePrimitives.mjs';
import '../../bcs/serializable/fixedBytes.mjs';
import '../../publicKey-CJOcUwJK.mjs';
import '../../core/crypto/signature.mjs';
import '../../transactions/authenticator/account.mjs';
import '../../core/crypto/ed25519.mjs';
import '../../core/crypto/privateKey.mjs';
import '../../utils/const.mjs';
import '../../core/crypto/multiEd25519.mjs';
import '../../core/crypto/multiKey.mjs';
import '../../core/crypto/singleKey.mjs';
import '../../core/crypto/secp256k1.mjs';
import '../../transactions/instances/rawTransaction.mjs';
import '../../transactions/instances/chainId.mjs';
import '../../transactions/instances/transactionPayload.mjs';
import '../../transactions/instances/identifier.mjs';
import '../../transactions/instances/moduleId.mjs';
import '../../transactions/typeTag/index.mjs';
import '../../transactions/instances/multiAgentTransaction.mjs';

declare class AccountAbstraction {
    readonly config: AptosConfig;
    constructor(config: AptosConfig);
    /**
     * Adds a dispatchable authentication function to the account.
     *
     * @example
     * ```ts
     * const txn = await aptos.abstraction.addAuthenticationFunctionTransaction({
     *   accountAddress: alice.accountAddress,
     *   authenticationFunction: `${alice.accountAddress}::any_authenticator::authenticate`,
     * });
     *
     * const txn =  await aptos.signAndSubmitTransaction({ signer: alice, transaction});
     * await aptos.waitForTransaction({ transactionHash: txn.hash });
     * ```
     *
     * @param args.accountAddress - The account to add the authentication function to.
     * @param args.authenticationFunction - The authentication function info to add.
     * @param args.options - The options for the transaction.
     * @returns A transaction to add the authentication function to the account.
     */
    addAuthenticationFunctionTransaction(args: {
        accountAddress: AccountAddressInput;
        authenticationFunction: string;
        options?: InputGenerateTransactionOptions;
    }): Promise<SimpleTransaction>;
    /**
     * Removes a dispatchable authentication function from the account.
     *
     * @example
     * ```ts
     * const txn = await aptos.abstraction.removeAuthenticationFunctionTransaction({
     *   accountAddress: alice.accountAddress,
     *   authenticationFunction: `${alice.accountAddress}::any_authenticator::authenticate`,
     * });
     *
     * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
     * await aptos.waitForTransaction({ transactionHash: txn.hash });
     * ```
     *
     * @param args.accountAddress - The account to remove the authentication function from.
     * @param args.authenticationFunction - The authentication function info to remove.
     * @param args.options - The options for the transaction.
     * @returns A transaction to remove the authentication function from the account.
     */
    removeAuthenticationFunctionTransaction(args: {
        accountAddress: AccountAddressInput;
        authenticationFunction: string;
        options?: InputGenerateTransactionOptions;
    }): Promise<SimpleTransaction>;
    /**
     * Removes a dispatchable authenticator from the account.
     *
     * @example
     * ```ts
     * const txn = await aptos.abstraction.removeDispatchableAuthenticatorTransaction({
     *   accountAddress: alice.accountAddress,
     * });
     *
     * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
     * await aptos.waitForTransaction({ transactionHash: txn.hash });
     * ```
     *
     * @param args.accountAddress - The account to remove the authenticator from.
     * @param args.options - The options for the transaction.
     * @returns A transaction to remove the authenticator from the account.
     */
    removeDispatchableAuthenticatorTransaction(args: {
        accountAddress: AccountAddressInput;
        options?: InputGenerateTransactionOptions;
    }): Promise<SimpleTransaction>;
    /**
     * Gets the dispatchable authentication function for the account.
     *
     * @example
     * ```ts
     * const functionInfos = await aptos.abstraction.getAuthenticationFunction({
     *   accountAddress: alice.accountAddress,
     * });
     *
     * if (functionInfos) {
     *   console.log(`Account ${alice.accountAddress.toString()} is using account abstraction!`);
     * } else {
     *   console.log(`Account ${alice.accountAddress.toString()} is not using account abstraction.`);
     * }
     * ```
     *
     * @param args.accountAddress - The account to get the dispatchable authentication function for.
     * @returns The dispatchable authentication function for the account.
     */
    getAuthenticationFunction(args: {
        accountAddress: AccountAddressInput;
    }): Promise<{
        moduleAddress: AccountAddress;
        moduleName: string;
        functionName: string;
    }[] | undefined>;
    /**
     * Will return true if the account is abstracted, otherwise false.
     *
     * @example
     * ```ts
     * const isAccountAbstractionEnabled = await aptos.abstraction.isAccountAbstractionEnabled({
     *   accountAddress: alice.accountAddress,
     *   authenticationFunction: `${alice.accountAddress}::any_authenticator::authenticate`,
     * });
     * if (isAccountAbstractionEnabled) {
     *   console.log(`Account ${alice.accountAddress.toString()} is using account abstraction!`);
     * } else {
     *   console.log(`Account ${alice.accountAddress.toString()} is not using account abstraction.`);
     * }
     * ```
     *
     * @param args.accountAddress - The account to check.
     * @returns Whether the account is abstracted.
     */
    isAccountAbstractionEnabled: (args: {
        accountAddress: AccountAddressInput;
        authenticationFunction: string;
    }) => Promise<boolean>;
    /**
     * Creates a transaction to enable account abstraction with the given authentication function.
     *
     * @example
     * ```ts
     * const txn = await aptos.abstraction.enableAccountAbstractionTransaction({
     *   accountAddress: alice.accountAddress,
     *   authenticationFunction: `{alice.accountAddress}::any_authenticator::authenticate`,
     * });
     *
     * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
     * await aptos.waitForTransaction({ transactionHash: txn.hash });
     * ```
     *
     * @param args.accountAddress - The account to enable account abstraction for.
     * @param args.authenticationFunction - The authentication function info to use.
     * @param args.options - The options for the transaction.
     * @returns A transaction to enable account abstraction for the account.
     */
    enableAccountAbstractionTransaction: (args: {
        accountAddress: AccountAddressInput;
        authenticationFunction: string;
        options?: InputGenerateTransactionOptions;
    }) => Promise<SimpleTransaction>;
    /**
     * Creates a transaction to disable account abstraction. If an authentication function is provided, it will specify to
     * remove the authentication function.
     *
     * @example
     * ```ts
     * const txn = await aptos.abstraction.disableAccountAbstractionTransaction({
     *   accountAddress: alice.accountAddress,
     *   authenticationFunction: `${alice.accountAddress}::any_authenticator::authenticate`,
     * });
     *
     * const txn = await aptos.signAndSubmitTransaction({ signer: alice, transaction: txn });
     * await aptos.waitForTransaction({ transactionHash: txn.hash });
     * ```
     *
     * @param args.accountAddress - The account to disable account abstraction for.
     * @param args.authenticationFunction - The authentication function info to remove.
     * @param args.options - The options for the transaction.
     * @returns A transaction to disable account abstraction for the account.
     */
    disableAccountAbstractionTransaction: (args: {
        accountAddress: AccountAddressInput;
        authenticationFunction?: string;
        options?: InputGenerateTransactionOptions;
    }) => Promise<SimpleTransaction>;
}

export { AccountAbstraction };
