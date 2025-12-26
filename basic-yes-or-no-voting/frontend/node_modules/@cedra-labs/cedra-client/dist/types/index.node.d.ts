import { CedraClientRequest, CedraClientResponse } from "./types";
/**
 * Used for JSON responses
 * @param requestOptions
 */
export default function cedraClient<Res>(requestOptions: CedraClientRequest): Promise<CedraClientResponse<Res>>;
export declare function jsonRequest<Res>(requestOptions: CedraClientRequest): Promise<CedraClientResponse<Res>>;
/**
 * Used for binary responses, such as BCS outputs
 *
 * @experimental
 * @param requestOptions
 */
export declare function bcsRequest(requestOptions: CedraClientRequest): Promise<CedraClientResponse<Buffer>>;
