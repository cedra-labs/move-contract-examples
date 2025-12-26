type AptosClientResponse<Res> = {
    status: number;
    statusText: string;
    data: Res;
    config?: any;
    request?: any;
    response?: any;
    headers?: any;
};
type AptosClientRequest = {
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
declare function aptosClient<Res>(options: AptosClientRequest): Promise<AptosClientResponse<Res>>;
declare function jsonRequest<Res>(options: AptosClientRequest): Promise<AptosClientResponse<Res>>;

export { aptosClient as default, jsonRequest };
