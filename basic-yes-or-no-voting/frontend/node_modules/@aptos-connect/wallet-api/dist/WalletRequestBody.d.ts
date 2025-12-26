export interface WalletRequestBody<RequestName extends string = string, Version extends number = number> {
    data: Uint8Array;
    name: RequestName;
    version: Version;
}
export declare function encodeWalletRequestBody({ data, ...rest }: WalletRequestBody): string;
export declare function decodeWalletRequestBody(encoded: string): WalletRequestBody;
//# sourceMappingURL=WalletRequestBody.d.ts.map