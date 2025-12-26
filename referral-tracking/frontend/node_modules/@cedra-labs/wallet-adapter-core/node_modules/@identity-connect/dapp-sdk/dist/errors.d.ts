import { SigningRequestStatus } from '@identity-connect/api';
export declare class SignatureRequestError extends Error {
    constructor(status: SigningRequestStatus);
}
export declare class UnexpectedSignatureResponseError extends Error {
    constructor(missingFields: string[]);
}
export declare class PairingExpiredError extends Error {
    constructor();
}
export declare class UnregisteredDappError extends Error {
    constructor();
}
//# sourceMappingURL=errors.d.ts.map