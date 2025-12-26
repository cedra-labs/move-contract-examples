import { AptosClientRequest, AptosClientResponse } from "./types";
/**
 * Used for JSON responses
 * @param requestOptions
 */
export default function aptosClient<Res>(requestOptions: AptosClientRequest): Promise<AptosClientResponse<Res>>;
export declare function jsonRequest<Res>(requestOptions: AptosClientRequest): Promise<AptosClientResponse<Res>>;
