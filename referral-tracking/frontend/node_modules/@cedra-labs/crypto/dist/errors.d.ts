export declare class EncryptionEnvelopeError extends Error {
}
export declare class EnvelopeMessageMismatchError extends EncryptionEnvelopeError {
    field: string;
    constructor(message: string, field: string);
}
export declare class DecryptionError extends EncryptionEnvelopeError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map