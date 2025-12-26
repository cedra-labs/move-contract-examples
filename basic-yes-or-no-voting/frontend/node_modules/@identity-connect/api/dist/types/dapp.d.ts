export interface RegisteredDappDataBase {
    dappSpecificWalletAllowed: boolean;
    description: string | null;
    externalWalletPairingsAllowed: boolean;
    feePayerAllowed: boolean;
    hostname: string;
    iconUrl: string | null;
    id: string;
    name: string;
}
export interface GetDappData extends RegisteredDappDataBase {
    adminUserId: string;
    allowPairingsWithoutHostname: boolean;
    createdAt: Date;
    id: string;
    isDappHostnameVerified: boolean;
    updatedAt: Date;
}
//# sourceMappingURL=dapp.d.ts.map