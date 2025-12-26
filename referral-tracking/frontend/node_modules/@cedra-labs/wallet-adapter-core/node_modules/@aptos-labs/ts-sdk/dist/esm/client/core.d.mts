import { AptosConfig } from '../api/aptosConfig.mjs';
import { ClientRequest, Client, ClientResponse, AptosRequest, AptosResponse } from '../types/types.mjs';
import { AptosApiType } from '../utils/const.mjs';
import '../utils/apiEndpoints.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * Sends a request using the specified options and returns the response.
 *
 * @param options - The options for the request.
 * @param options.url - The URL to send the request to.
 * @param options.method - The HTTP method to use for the request.
 * @param options.body - The body of the request.
 * @param options.contentType - The content type of the request.
 * @param options.params - The query parameters to include in the request.
 * @param options.overrides - Additional overrides for the request.
 * @param options.overrides.HEADERS - Custom headers to include in the request.
 * @param options.overrides.AUTH_TOKEN - The authorization token for the request.
 * @param options.overrides.API_KEY - The API key for the request.
 * @param options.originMethod - The origin method for the request.
 * @param client - The client used to make the request.
 *
 * @returns The response from the request.
 * @group Implementation
 * @category Client
 */
declare function request<Req, Res>(options: ClientRequest<Req>, client: Client): Promise<ClientResponse<Res>>;
/**
 * The main function to use when making an API request, returning the response or throwing an AptosApiError on failure.
 *
 * @param aptosRequestOpts - Options for the Aptos request, including the URL and path.
 * @param aptosConfig - The configuration information for the SDK client instance.
 * @param apiType - The type of API being accessed, which determines how the response is handled.
 * @returns The response from the API request or throws an AptosApiError if the request fails.
 * @group Implementation
 * @category Client
 */
declare function aptosRequest<Req extends {}, Res extends {}>(aptosRequestOpts: AptosRequest, aptosConfig: AptosConfig, apiType: AptosApiType): Promise<AptosResponse<Req, Res>>;

export { aptosRequest, request };
