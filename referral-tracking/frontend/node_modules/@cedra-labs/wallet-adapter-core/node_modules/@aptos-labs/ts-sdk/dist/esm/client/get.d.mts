import { AptosConfig } from '../api/aptosConfig.mjs';
import { MimeType, AnyNumber, ClientConfig, AptosResponse } from '../types/types.mjs';
import { AptosApiType } from '../utils/const.mjs';
import '../utils/apiEndpoints.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Options for making a GET request, including configuration for the API client.
 * @group Implementation
 * @category Client
 */
type GetRequestOptions = {
    /**
     * The config for the API client
     * @group Implementation
     * @category Client
     */
    aptosConfig: AptosConfig;
    /**
     * The type of API endpoint to call e.g. fullnode, indexer, etc
     * @group Implementation
     * @category Client
     */
    type: AptosApiType;
    /**
     * The name of the API method
     * @group Implementation
     * @category Client
     */
    originMethod: string;
    /**
     * The URL path to the API method
     * @group Implementation
     * @category Client
     */
    path: string;
    /**
     * The content type of the request body
     * @group Implementation
     * @category Client
     */
    contentType?: MimeType;
    /**
     * The accepted content type of the response of the API
     * @group Implementation
     * @category Client
     */
    acceptType?: MimeType;
    /**
     * The query parameters for the request
     * @group Implementation
     * @category Client
     */
    params?: Record<string, string | AnyNumber | boolean | undefined>;
    /**
     * Specific client overrides for this request to override aptosConfig
     * @group Implementation
     * @category Client
     */
    overrides?: ClientConfig;
};
/**
 * Options for making a request to the Aptos API, excluding the "type" field.
 * @group Implementation
 * @category Client
 */
type GetAptosRequestOptions = Omit<GetRequestOptions, "type">;
/**
 * Executes a GET request to retrieve data based on the provided options.
 *
 * @param options - The options for the GET request.
 * @param options.aptosConfig - The configuration object for Aptos requests.
 * @param options.overrides - Optional overrides for the request configuration.
 * @param options.params - Query parameters to include in the request.
 * @param options.contentType - The content type of the request.
 * @param options.acceptType - The accepted response type.
 * @param options.path - The specific path for the request.
 * @param options.originMethod - The original method of the request.
 * @param options.type - The type of request being made.
 * @returns The response from the GET request.
 * @group Implementation
 * @category Client
 */
declare function get<Req extends {}, Res extends {}>(options: GetRequestOptions): Promise<AptosResponse<Req, Res>>;
/**
 * Retrieves data from the Aptos full node using the provided options.
 *
 * @param options - The options for the request to the Aptos full node.
 * @param options.aptosConfig - Configuration settings specific to the Aptos client and full node.
 * @param options.aptosConfig.clientConfig - The client configuration settings.
 * @param options.aptosConfig.fullnodeConfig - The full node configuration settings.
 * @param options.overrides - Additional overrides for the request.
 * @param options.type - The type of API request being made.
 *
 * @returns A promise that resolves with the response from the Aptos full node.
 * @group Implementation
 * @category Client
 */
declare function getAptosFullNode<Req extends {}, Res extends {}>(options: GetAptosRequestOptions): Promise<AptosResponse<Req, Res>>;
/**
 * Makes a GET request to the Aptos Pepper service to retrieve data.
 *
 * @param options - The options for the request.
 * @param options.param1 - Description of param1.
 * @param options.param2 - Description of param2.
 * @returns AptosResponse - The response from the Aptos Pepper service.
 * @group Implementation
 * @category Client
 */
declare function getAptosPepperService<Req extends {}, Res extends {}>(options: GetAptosRequestOptions): Promise<AptosResponse<Req, Res>>;
/**
 * This function is a helper for paginating using a function wrapping an API
 * @group Implementation
 * @category Client
 */
declare function paginateWithCursor<Req extends Record<string, any>, Res extends Array<{}>>(options: GetAptosRequestOptions): Promise<Res>;
declare function paginateWithObfuscatedCursor<Req extends Record<string, any>, Res extends Array<{}>>(options: GetAptosRequestOptions): Promise<Res>;
declare function getPageWithObfuscatedCursor<Req extends Record<string, any>, Res extends Array<{}>>(options: GetAptosRequestOptions): Promise<{
    response: AptosResponse<Req, Res>;
    cursor: string | undefined;
}>;

export { type GetAptosRequestOptions, type GetRequestOptions, get, getAptosFullNode, getAptosPepperService, getPageWithObfuscatedCursor, paginateWithCursor, paginateWithObfuscatedCursor };
