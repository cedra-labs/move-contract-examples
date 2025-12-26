import { AccountData } from './account';
import { RegisteredDappDataBase } from './dapp';
import { ConnectedWalletData } from './wallet';
import { DappSpecificWallet } from './dappSpecificWallet';
export declare enum PairingStatus {
    Finalized = "FINALIZED",
    Pending = "PENDING"
}
export interface BasePairingData {
    createdAt: Date;
    dappEd25519PublicKeyB64: string;
    dappSpecificWallet?: DappSpecificWallet;
    dappSpecificWalletId?: string;
    expiresAt: Date;
    id: string;
    maxDappSequenceNumber: number;
    maxWalletSequenceNumber: number;
    registeredDapp: RegisteredDappDataBase;
    registeredDappId: string;
    status: PairingStatus;
    updatedAt: Date;
}
export interface NewPairingData extends BasePairingData {
    maxDappSequenceNumber: -1;
    maxWalletSequenceNumber: -1;
    status: PairingStatus.Pending;
}
export interface BaseFinalizedPairingData extends BasePairingData {
    account: AccountData;
    accountId: string;
    status: PairingStatus.Finalized;
    walletName: string;
}
export interface AnonymousPairingData extends BaseFinalizedPairingData {
    anonymousWallet: ConnectedWalletData;
    anonymousWalletId: string;
}
export type FinalizedPairingData = BaseFinalizedPairingData | AnonymousPairingData;
export type PairingData = NewPairingData | FinalizedPairingData;
//# sourceMappingURL=pairing.d.ts.map