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
 *
 * @param options
 */
declare function cedraClient<Res>(options: CedraClientRequest): Promise<CedraClientResponse<Res>>;
declare function jsonRequest<Res>(options: CedraClientRequest): Promise<CedraClientResponse<Res>>;
/**
 * Used for binary responses, such as BCS outputs
 *
 * @experimental
 * @param options
 */
declare function bcsRequest(options: CedraClientRequest): Promise<CedraClientResponse<ArrayBuffer>>;

export { bcsRequest, cedraClient as default, jsonRequest };
