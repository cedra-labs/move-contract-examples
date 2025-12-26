import { AccountAddress } from '../core/accountAddress.mjs';
import { Network } from '../utils/apiEndpoints.mjs';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../types/types.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/deserializer.mjs';
import '../transactions/instances/transactionArgument.mjs';

/**
 * Class representing a Move package management utility for the Aptos blockchain.
 * This class provides methods to initialize directories, compile packages, run tests, publish modules, create objects, upgrade
 * packages, build transaction payloads, and run scripts.
 * @group Implementation
 * @category CLI
 */
declare class Move {
    /**
     * Initialize the current directory for Aptos by configuring the necessary settings.
     * Configuration will be pushed into .aptos/config.yaml.
     *
     * @param args - The arguments for initialization.
     * @param args.network - Optional Network type argument to use for default settings; defaults to local.
     * @param args.profile - Optional Profile to use from the config file; defaults to 'default'. This will override associated
     * settings such as the REST URL, the Faucet URL, and the private key arguments.
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     * @returns stdout
     * @group Implementation
     * @category CLI
     */
    init(args: {
        network?: Network;
        profile?: string;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    /**
     * Compile a Move package located at the specified directory path.
     * This function helps in preparing the Move package for deployment or further processing.
     *
     * @param args - The arguments for compiling the package.
     * @param args.packageDirectoryPath - Path to a Move package (the folder with a Move.toml file).
     * @param args.namedAddresses - Named addresses for the move binary. Ex. { alice: 0x1234, bob: 0x5678 }
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     * @returns stdout
     * @group Implementation
     * @category CLI
     */
    compile(args: {
        packageDirectoryPath: string;
        namedAddresses: Record<string, AccountAddress>;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    /**
     * Run Move unit tests for a specified package.
     *
     * @param args - The arguments for running the tests.
     * @param args.packageDirectoryPath - The path to a Move package (the folder containing a Move.toml file).
     * @param args.namedAddresses - Named addresses for the move binary. Ex. { alice: 0x1234, bob: 0x5678 }
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     * @returns The stdout output from running the tests.
     * @group Implementation
     * @category CLI
     */
    test(args: {
        packageDirectoryPath: string;
        namedAddresses: Record<string, AccountAddress>;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    /**
     * Publishes the modules to the publisher account on the Aptos blockchain.
     *
     * @param args - The arguments for publishing the modules.
     * @param args.packageDirectoryPath - The path to a move package (the folder with a Move.toml file).
     * @param args.namedAddresses - Named addresses for the move binary. Ex. { alice: 0x1234, bob: 0x5678 }
     * @param args.profile - Optional profile to use from the config file.
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     * @returns stdout
     * @group Implementation
     * @category CLI
     */
    publish(args: {
        packageDirectoryPath: string;
        namedAddresses: Record<string, AccountAddress>;
        profile?: string;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    /**
     * Create a new object and publish the Move package to it on the Aptos blockchain.
     *
     * @param args - The arguments for creating the object and publishing the package.
     * @param args.packageDirectoryPath - Path to a Move package (the folder with a Move.toml file).
     * @param args.addressName - Address name for the Move package.
     * @param args.namedAddresses - Named addresses for the Move binary.
     * @param args.profile - Optional profile to use from the config file.
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     * @returns The object address.
     *
     * A complete example in CLI:
     * aptos move create-object-and-publish-package \
     * --package-dir path_to_directory_that_has_move.toml \
     * --address-name launchpad_addr \
     * --named-addresses "launchpad_addr=0x123,initial_creator_addr=0x456" \
     * --profile my_profile \
     * --assume-yes
     * @group Implementation
     * @category CLI
     */
    createObjectAndPublishPackage(args: {
        packageDirectoryPath: string;
        addressName: string;
        namedAddresses: Record<string, AccountAddress>;
        profile?: string;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        objectAddress: string;
    }>;
    /**
     * Upgrade a Move package previously published to an object on the Aptos blockchain.
     * The caller must be the object owner to execute this function.
     *
     * @param args - The arguments for upgrading the object package.
     * @param args.packageDirectoryPath - Path to a Move package (the folder with a Move.toml file).
     * @param args.objectAddress - Address of the object that the Move package published to. Ex. 0x1000
     * @param args.namedAddresses - Named addresses for the move binary. Ex. { alice: 0x1234, bob: 0x5678 }
     * @param args.profile - Optional profile to use from the config file.
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     * @returns stdout
     * @group Implementation
     * @category CLI
     */
    upgradeObjectPackage(args: {
        packageDirectoryPath: string;
        objectAddress: string;
        namedAddresses: Record<string, AccountAddress>;
        profile?: string;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    /**
     * Build a publication transaction payload and store it in a JSON output file.
     *
     * @param args - The arguments for building the publishing payload.
     * @param args.packageDirectoryPath - Path to a move package (the folder with a Move.toml file).
     * @param args.outputFile - Output file to write the publication transaction to.
     * @param args.namedAddresses - Named addresses for the move binary. Ex. { alice: 0x1234, bob: 0x5678 }
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]   *
     * @returns stdout
     * @group Implementation
     * @category CLI
     */
    buildPublishPayload(args: {
        packageDirectoryPath: string;
        outputFile: string;
        namedAddresses: Record<string, AccountAddress>;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    /**
     * Runs a Move script using the provided compiled script path and optional parameters. Ensure that the script is compiled
     * before executing this function.
     *
     * @param args - The arguments for running the script.
     * @param args.compiledScriptPath - Path to a compiled Move script bytecode file.
     * Ex. "build/my_package/bytecode_scripts/my_move_script.mv"
     * @param args.profile - Optional profile to use from the config file.
     * @param args.extraArguments - Optional extra arguments to include in the form of an array of strings.
     * Ex. ["--assume-yes","--gas-unit-price=10"]
     *
     * @returns The standard output from running the script.
     * @group Implementation
     * @category CLI
     */
    runScript(args: {
        compiledScriptPath: string;
        profile?: string;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
    }>;
    gasProfile(args: {
        network: string;
        transactionId: string;
        extraArguments?: Array<string>;
        showStdout?: boolean;
    }): Promise<{
        output: string;
        result?: any;
    }>;
    /**
     * Run a command with the specified arguments and return the output.
     *
     * @param args - An array of strings representing the command-line arguments to be passed to the command.
     * @param showStdout - Show the standard output generated by the command.
     * @returns The standard output generated by the command.
     * @group Implementation
     * @category CLI
     */
    private runCommand;
    /**
     * Convert named addresses from a Map into an array separated by a comma.
     *
     * @param namedAddresses - A Map where the key is a string representing the name and the value is an AccountAddress.
     * Ex. {'alice' => '0x123', 'bob' => '0x456'}
     * @returns An array of named addresses formatted as strings separated by a comma. Ex. "alice=0x123,bob=0x456"
     * @group Implementation
     * @category CLI
     */
    private prepareNamedAddresses;
    /**
     * Parse named addresses from a Record type into a Map.
     *
     * This function transforms a collection of named addresses into a more accessible format by mapping each name to its
     * corresponding address.
     *
     * @param namedAddresses - A record containing named addresses where the key is the name and the value is the AccountAddress.
     * @returns A Map where each key is a name and each value is the corresponding address.
     * @group Implementation
     * @category CLI
     */
    private parseNamedAddresses;
    /**
     * Extracts the object address from the provided output string.
     *
     * @param output - The output string containing the object address.
     * @returns The extracted object address.
     * @throws Error if the object address cannot be extracted from the output.
     * @group Implementation
     * @category CLI
     */
    private extractAddressFromOutput;
}

export { Move };
