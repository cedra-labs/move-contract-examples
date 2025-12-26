import { ChildProcessWithoutNullStreams } from 'child_process';

/**
 * Represents a local node for running a localnet environment.
 * This class provides methods to start, stop, and check the status of the localnet process.
 * It manages the lifecycle of the node process and ensures that it is operational before executing tests.
 * @group Implementation
 * @category CLI
 */
declare class LocalNode {
    readonly MAXIMUM_WAIT_TIME_SEC = 75;
    readonly READINESS_ENDPOINT = "http://127.0.0.1:8070/";
    showStdout: boolean;
    process: ChildProcessWithoutNullStreams | null;
    constructor(args?: {
        showStdout?: boolean;
    });
    /**
     * Kills the current process and all its descendant processes.
     *
     * @returns {Promise<void>} A promise that resolves to true if the process was successfully killed.
     * @throws {Error} If there is an error while attempting to kill the process.
     * @group Implementation
     * @category CLI
     */
    stop(): Promise<void>;
    /**
     * Runs a localnet and waits for the process to be up.
     * If the local node process is already running, it returns without starting the process.
     *
     * @returns {Promise<void>} A promise that resolves when the process is up.
     * @group Implementation
     * @category CLI
     */
    run(): Promise<void>;
    /**
     * Starts the localnet by running the Aptos node with the specified command-line arguments.
     *
     * @returns {void}
     *
     * @throws {Error} If there is an issue starting the localnet.
     * @group Implementation
     * @category CLI
     */
    start(): void;
    /**
     * Waits for the localnet process to be operational within a specified maximum wait time.
     * This function continuously checks if the process is up and will throw an error if it fails to start.
     *
     * @returns Promise<boolean> - Resolves to true if the process is up, otherwise throws an error.
     * @group Implementation
     * @category CLI
     */
    waitUntilProcessIsUp(): Promise<boolean>;
    /**
     * Checks if the localnet is up by querying the readiness endpoint.
     *
     * @returns Promise<boolean> - A promise that resolves to true if the localnet is up, otherwise false.
     * @group Implementation
     * @category CLI
     */
    checkIfProcessIsUp(): Promise<boolean>;
}

export { LocalNode };
