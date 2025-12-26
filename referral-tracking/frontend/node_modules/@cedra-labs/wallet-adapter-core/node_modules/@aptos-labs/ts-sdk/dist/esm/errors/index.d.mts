import { AptosApiType } from '../utils/const.mjs';
import { AptosRequest, AptosResponse } from '../types/types.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

declare enum KeylessErrorCategory {
    API_ERROR = 0,
    EXTERNAL_API_ERROR = 1,
    SESSION_EXPIRED = 2,
    INVALID_STATE = 3,
    INVALID_SIGNATURE = 4,
    UNKNOWN = 5
}
declare enum KeylessErrorResolutionTip {
    REAUTHENTICATE = "Re-authentiate to continue using your keyless account",
    REAUTHENTICATE_UNSURE = "Try re-authentiating. If the error persists join the telegram group at https://t.me/+h5CN-W35yUFiYzkx for further support",
    UPDATE_REQUEST_PARAMS = "Update the invalid request parameters and reauthenticate.",
    RATE_LIMIT_EXCEEDED = "Cache the keyless account and reuse it to avoid making too many requests.  Keyless accounts are valid until either the EphemeralKeyPair expires, when the JWK is rotated, or when the proof verifying key is changed, whichever comes soonest.",
    SERVER_ERROR = "Try again later.  See aptosApiError error for more context. For additional support join the telegram group at https://t.me/+h5CN-W35yUFiYzkx",
    CALL_PRECHECK = "Call `await account.checkKeylessAccountValidity()` to wait for asyncronous changes and check for account validity before signing or serializing.",
    REINSTANTIATE = "Try instantiating the account again.  Avoid manipulating the account object directly",
    JOIN_SUPPORT_GROUP = "For support join the telegram group at https://t.me/+h5CN-W35yUFiYzkx",
    UNKNOWN = "Error unknown. For support join the telegram group at https://t.me/+h5CN-W35yUFiYzkx"
}
declare enum KeylessErrorType {
    EPHEMERAL_KEY_PAIR_EXPIRED = 0,
    PROOF_NOT_FOUND = 1,
    ASYNC_PROOF_FETCH_FAILED = 2,
    INVALID_PROOF_VERIFICATION_FAILED = 3,
    INVALID_PROOF_VERIFICATION_KEY_NOT_FOUND = 4,
    INVALID_JWT_SIG = 5,
    INVALID_JWT_JWK_NOT_FOUND = 6,
    INVALID_JWT_ISS_NOT_RECOGNIZED = 7,
    INVALID_JWT_FEDERATED_ISS_NOT_SUPPORTED = 8,
    INVALID_TW_SIG_VERIFICATION_FAILED = 9,
    INVALID_TW_SIG_PUBLIC_KEY_NOT_FOUND = 10,
    INVALID_EXPIRY_HORIZON = 11,
    JWT_PARSING_ERROR = 12,
    JWK_FETCH_FAILED = 13,
    JWK_FETCH_FAILED_FEDERATED = 14,
    RATE_LIMIT_EXCEEDED = 15,
    PEPPER_SERVICE_INTERNAL_ERROR = 16,
    PEPPER_SERVICE_BAD_REQUEST = 17,
    PEPPER_SERVICE_OTHER = 18,
    PROVER_SERVICE_INTERNAL_ERROR = 19,
    PROVER_SERVICE_BAD_REQUEST = 20,
    PROVER_SERVICE_OTHER = 21,
    FULL_NODE_CONFIG_LOOKUP_ERROR = 22,
    FULL_NODE_VERIFICATION_KEY_LOOKUP_ERROR = 23,
    FULL_NODE_JWKS_LOOKUP_ERROR = 24,
    FULL_NODE_OTHER = 25,
    SIGNATURE_TYPE_INVALID = 26,
    SIGNATURE_EXPIRED = 27,
    MAX_EXPIRY_HORIZON_EXCEEDED = 28,
    EPHEMERAL_SIGNATURE_VERIFICATION_FAILED = 29,
    TRAINING_WHEELS_SIGNATURE_MISSING = 30,
    TRAINING_WHEELS_SIGNATURE_VERIFICATION_FAILED = 31,
    PROOF_VERIFICATION_FAILED = 32,
    UNKNOWN = 33
}
declare class KeylessError extends Error {
    readonly innerError?: unknown;
    readonly category: KeylessErrorCategory;
    readonly resolutionTip: KeylessErrorResolutionTip;
    readonly type: KeylessErrorType;
    readonly details?: string;
    /** @internal this constructor is for sdk internal use - do not instantiate outside of the SDK codebase */
    constructor(args: {
        innerError?: unknown;
        category: KeylessErrorCategory;
        resolutionTip: KeylessErrorResolutionTip;
        type: KeylessErrorType;
        message?: string;
        details?: string;
    });
    static constructMessage(message: string, tip: KeylessErrorResolutionTip, innerError?: unknown, details?: string): string;
    /**
     * Static constructor that creates a KeylessError instance using the KeylessErrors constant
     * @param args.type The type of KeylessError
     * @param args.aptosApiError optional AptosApiError supplied for api errors
     * @param args.details optional details to include in the error message
     * @returns A new KeylessError instance
     */
    static fromErrorType(args: {
        type: KeylessErrorType;
        error?: unknown;
        details?: string;
    }): KeylessError;
}
/**
 * Options for handling errors in the Aptos API.
 */
type AptosApiErrorOpts = {
    apiType: AptosApiType;
    aptosRequest: AptosRequest;
    aptosResponse: AptosResponse<any, any>;
};
/**
 * Represents an error returned from the Aptos API.
 * This class encapsulates the details of the error, including the request URL, response status, and additional data.
 *
 * @param name - The name of the error, which is always "AptosApiError".
 * @param url - The URL to which the request was made.
 * @param status - The HTTP response status code (e.g., 400).
 * @param statusText - The message associated with the response status.
 * @param data - The response data returned from the API.
 * @param request - The original AptosRequest that triggered the error.
 */
declare class AptosApiError extends Error {
    readonly url: string;
    readonly status: number;
    readonly statusText: string;
    readonly data: any;
    readonly request: AptosRequest;
    /**
     * Constructs an instance of AptosApiError with relevant error details.
     *
     * @param opts - The options for creating the AptosApiError.
     * @param opts.apiType - The type of API that generated the error.
     * @param opts.aptosRequest - The request object that caused the error.
     * @param opts.aptosResponse - The response object containing error details.
     *
     * @internal This constructor is for SDK internal use - do not instantiate outside the SDK codebase.
     */
    constructor({ apiType, aptosRequest, aptosResponse }: AptosApiErrorOpts);
}

export { AptosApiError, KeylessError, KeylessErrorCategory, KeylessErrorResolutionTip, KeylessErrorType };
