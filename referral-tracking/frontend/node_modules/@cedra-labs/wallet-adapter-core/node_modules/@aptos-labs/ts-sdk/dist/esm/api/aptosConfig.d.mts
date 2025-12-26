import { Client, ClientConfig, FullNodeConfig, IndexerConfig, FaucetConfig, AptosSettings } from '../types/types.mjs';
import { Network } from '../utils/apiEndpoints.mjs';
import { AptosApiType } from '../utils/const.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Represents the configuration settings for an Aptos SDK client instance.
 * This class allows customization of various endpoints and client settings.
 *
 * @example
 * ```typescript
 * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
 *
 * async function runExample() {
 *     // Create a configuration for connecting to the Aptos testnet
 *     const config = new AptosConfig({ network: Network.TESTNET });
 *
 *     // Initialize the Aptos client with the configuration
 *     const aptos = new Aptos(config);
 *
 *     console.log("Aptos client initialized:", aptos);
 * }
 * runExample().catch(console.error);
 * ```
 * @group Client
 */
declare class AptosConfig {
    /**
     * The Network that this SDK is associated with. Defaults to DEVNET
     * @group Client
     */
    readonly network: Network;
    /**
     * The client instance the SDK uses. Defaults to `@aptos-labs/aptos-client
     * @group Client
     */
    readonly client: Client;
    /**
     * The optional hardcoded fullnode URL to send requests to instead of using the network
     * @group Client
     */
    readonly fullnode?: string;
    /**
     * The optional hardcoded faucet URL to send requests to instead of using the network
     * @group Client
     */
    readonly faucet?: string;
    /**
     * The optional hardcoded pepper service URL to send requests to instead of using the network
     * @group Client
     */
    readonly pepper?: string;
    /**
     * The optional hardcoded prover service URL to send requests to instead of using the network
     * @group Client
     */
    readonly prover?: string;
    /**
     * The optional hardcoded indexer URL to send requests to instead of using the network
     * @group Client
     */
    readonly indexer?: string;
    /**
     * Optional client configurations
     * @group Client
     */
    readonly clientConfig?: ClientConfig;
    /**
     * Optional specific Fullnode configurations
     * @group Client
     */
    readonly fullnodeConfig?: FullNodeConfig;
    /**
     * Optional specific Indexer configurations
     * @group Client
     */
    readonly indexerConfig?: IndexerConfig;
    /**
     * Optional specific Faucet configurations
     * @group Client
     */
    readonly faucetConfig?: FaucetConfig;
    /**
     * Initializes an instance of the Aptos client with the specified settings.
     * This allows users to configure various aspects of the client, such as network and endpoints.
     *
     * @param settings - Optional configuration settings for the Aptos client.
     * @param settings.network - The network to connect to, defaults to `Network.DEVNET`.
     * @param settings.fullnode - The fullnode endpoint to use for requests.
     * @param settings.faucet - The faucet endpoint for obtaining test tokens.
     * @param settings.pepper - The pepper used for transaction signing.
     * @param settings.prover - The prover endpoint for transaction verification.
     * @param settings.indexer - The indexer endpoint for querying blockchain data.
     * @param settings.client - Custom client settings, defaults to a standard Aptos client.
     * @param settings.clientConfig - Additional configuration for the client.
     * @param settings.fullnodeConfig - Additional configuration for the fullnode.
     * @param settings.indexerConfig - Additional configuration for the indexer.
     * @param settings.faucetConfig - Additional configuration for the faucet.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * async function runExample() {
     *     // Create a new Aptos client with default settings
     *     const config = new AptosConfig({ network: Network.TESTNET }); // Specify the network
     *     const aptos = new Aptos(config);
     *
     *     console.log("Aptos client initialized:", aptos);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Client
     */
    constructor(settings?: AptosSettings);
    /**
     * Returns the URL endpoint to send the request to based on the specified API type.
     * If a custom URL was provided in the configuration, that URL is returned. Otherwise, the URL endpoint is derived from the network.
     *
     * @param apiType - The type of Aptos API to get the URL for. This can be one of the following: FULLNODE, FAUCET, INDEXER, PEPPER, PROVER.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network, AptosApiType } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *   // Getting the request URL for the FULLNODE API
     *   const url = config.getRequestUrl(AptosApiType.FULLNODE);
     *   console.log("Request URL for FULLNODE:", url);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Client
     */
    getRequestUrl(apiType: AptosApiType): string;
    /**
     * Checks if the provided URL is a known pepper service endpoint.
     *
     * @param url - The URL to check against the known pepper service endpoints.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * async function runExample() {
     *     const url = "https://example.pepper.service"; // replace with a real pepper service URL
     *
     *     // Check if the URL is a known pepper service endpoint
     *     const isPepperService = config.isPepperServiceRequest(url);
     *
     *     console.log(`Is the URL a known pepper service? ${isPepperService}`);
     * }
     * runExample().catch(console.error);
     * ```
     * @group Client
     */
    isPepperServiceRequest(url: string): boolean;
    /**
     * Checks if the provided URL is a known prover service endpoint.
     *
     * @param url - The URL to check against known prover service endpoints.
     * @returns A boolean indicating whether the URL is a known prover service endpoint.
     *
     * @example
     * ```typescript
     * import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
     *
     * const config = new AptosConfig({ network: Network.TESTNET });
     * const aptos = new Aptos(config);
     *
     * // Check if the URL is a known prover service endpoint
     * const url = "https://prover.testnet.aptos.dev"; // replace with a real URL if needed
     * const isProver = config.isProverServiceRequest(url);
     *
     * console.log(`Is the URL a known prover service? ${isProver}`);
     * ```
     * @group Client
     */
    isProverServiceRequest(url: string): boolean;
}

export { AptosConfig };
