type CedraClientResponse<Res> = {
    status: number;
    statusText: string;
    data: Res;
    config?: any;
    request?: any;
    response?: any;
    headers?: any;
};
type CedraClientRequest = {
    url: string;
    method: "GET" | "POST";
    body?: any;
    params?: any;
    headers?: any;
    overrides?: any;
};

/**
 * Used for JSON responses
 * @param requestOptions
 */
declare function cedraClient<Res>(requestOptions: CedraClientRequest): Promise<CedraClientResponse<Res>>;
declare function jsonRequest<Res>(requestOptions: CedraClientRequest): Promise<CedraClientResponse<Res>>;
/**
 * Used for binary responses, such as BCS outputs
 *
 * @experimental
 * @param requestOptions
 */
declare function bcsRequest(requestOptions: CedraClientRequest): Promise<CedraClientResponse<Buffer>>;

export { bcsRequest, cedraClient as default, jsonRequest };
