declare enum AptosWalletErrorCode {
    Unauthorized = 4100,
    Unsupported = 4200,
    InternalError = -30001
}
declare const AptosWalletErrors: Readonly<{
    4100: {
        status: string;
        message: string;
    };
    [-30001]: {
        status: string;
        message: string;
    };
    4200: {
        status: string;
        message: string;
    };
}>;
declare class AptosWalletError extends Error {
    readonly code: number;
    readonly status: string;
    constructor(code: number, message?: string);
}

export { AptosWalletError, AptosWalletErrorCode, AptosWalletErrors };
