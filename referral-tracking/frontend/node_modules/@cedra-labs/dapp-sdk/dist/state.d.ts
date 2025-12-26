export interface BaseDappPairingData {
    accountAddress: string;
    accountAlias?: string;
    accountTransportEd25519PublicKeyB64: string;
    currSequenceNumber: number;
    dappEd25519PublicKeyB64: string;
    dappEd25519SecretKeyB64: string;
    dappWalletId?: string;
    pairingId: string;
}
export interface PrevDappPairingData extends BaseDappPairingData {
    accountEd25519PublicKeyB64: string;
    accountPublicKeyB64?: undefined;
}
export interface CurrDappPairingData extends BaseDappPairingData {
    accountEd25519PublicKeyB64?: undefined;
    accountPublicKeyB64: string;
}
export type DappPairingData = PrevDappPairingData | CurrDappPairingData;
export type DappPairingDataMap = {
    [address: string]: DappPairingData;
};
export interface DappStateAccessors {
    get: (address: string) => Promise<DappPairingData | undefined>;
    getAll: () => Promise<DappPairingDataMap>;
    update: (address: string, pairing?: DappPairingData) => Promise<void>;
}
export declare const DAPP_PAIRINGS_WINDOW_STORAGE_KEY = "icDappPairings";
/**
 * Default implementation of DappStateAccessors that uses the Window localStorage API.
 * This should work for most dapps.
 */
export declare const windowStateAccessors: DappStateAccessors;
//# sourceMappingURL=state.d.ts.map