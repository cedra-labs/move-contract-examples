import { SecuredEnvelopeTransport } from '@identity-connect/crypto';

declare const DEFAULT_BACKEND_URL = "https://identityconnect.com";

declare enum NetworkName {
    DEVNET = "devnet",
    MAINNET = "mainnet",
    TESTNET = "testnet"
}

interface DappSpecificWallet {
    addressHex: string;
    createdAt: Date;
    id: string;
    publicKeyHex: string;
    registeredDappId: string;
    transportEd25519PublicKeyB64: string;
    updatedAt: Date;
    userId: string;
}

interface AccountData {
    accountAddress: string;
    createdAt: Date;
    id: string;
    publicKeyB64: string;
    transportEd25519PublicKeyB64: string;
    updatedAt: Date;
    userSubmittedAlias: string | null;
    walletAccounts: {
        dappSpecificWallet?: DappSpecificWallet | null;
        dappSpecificWalletId?: string | null;
        walletAccountId: string;
        walletName: string | null;
    }[];
}

interface RegisteredDappDataBase {
    dappSpecificWalletAllowed: boolean;
    description: string | null;
    externalWalletPairingsAllowed: boolean;
    feePayerAllowed: boolean;
    hostname: string;
    iconUrl: string | null;
    id: string;
    name: string;
}
interface GetDappData extends RegisteredDappDataBase {
    adminUserId: string;
    allowPairingsWithoutHostname: boolean;
    createdAt: Date;
    id: string;
    isDappHostnameVerified: boolean;
    updatedAt: Date;
}

type WalletName = 'petra' | 'martian' | 'ic' | 'pontem';
type WalletOS = 'linux' | 'osx' | 'win' | 'ios' | 'android' | 'ic';
type WalletPlatform = 'firefox-extension' | 'chrome-extension' | 'safari-extension' | 'brave-extension' | 'opera-extension' | 'kiwi-extension' | 'native-app' | 'ic-dapp-wallet';
interface BaseWalletData {
    createdAt: Date;
    dappSpecificWallet?: DappSpecificWallet;
    dappSpecificWalletId?: string;
    icEd25519PublicKeyB64: string;
    id: string;
    updatedAt: Date;
}
interface NewWalletData extends BaseWalletData {
    walletEd25519PublicKeyB64: null;
}
interface BaseConnectedWalletData extends BaseWalletData {
    accounts: AccountData[];
    deviceIdentifier: string;
    platform: WalletPlatform;
    platformOS: WalletOS;
    userSubmittedAlias?: string;
    walletEd25519PublicKeyB64: string;
    walletName: WalletName;
}
interface AuthenticatedWalletData extends BaseConnectedWalletData {
    anonymousPairing: null;
    user: {
        id: string;
        username: string;
    };
    userId: string;
}
interface AnonymousWalletData extends BaseConnectedWalletData {
    anonymousPairing: AnonymousPairingData;
    userId: null;
}
type ConnectedWalletData = AuthenticatedWalletData | AnonymousWalletData;
type WalletData = NewWalletData | ConnectedWalletData;

declare enum PairingStatus {
    Finalized = "FINALIZED",
    Pending = "PENDING"
}
interface BasePairingData {
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
interface NewPairingData extends BasePairingData {
    maxDappSequenceNumber: -1;
    maxWalletSequenceNumber: -1;
    status: PairingStatus.Pending;
}
interface BaseFinalizedPairingData extends BasePairingData {
    account: AccountData;
    accountId: string;
    status: PairingStatus.Finalized;
    walletName: string;
}
interface AnonymousPairingData extends BaseFinalizedPairingData {
    anonymousWallet: ConnectedWalletData;
    anonymousWalletId: string;
}
type FinalizedPairingData = BaseFinalizedPairingData | AnonymousPairingData;
type PairingData = NewPairingData | FinalizedPairingData;

interface BackendSuccessResponse<T> {
    data: T;
    status: 200;
    success: true;
}
interface BackendErrorResponse {
    message: string;
    status: 400 | 401 | 500;
    success: false;
}
type BackendResponse<T> = BackendSuccessResponse<T>;

type SerializedDate<T> = T extends (infer S)[] ? SerializedDate<S>[] : {
    [P in keyof T]: T[P] extends Date ? string : SerializedDate<T[P]>;
};

declare enum SigningRequestTypes {
    SIGN_AND_SUBMIT_TRANSACTION = "SIGN_AND_SUBMIT_TRANSACTION",
    SIGN_MESSAGE = "SIGN_MESSAGE",
    SIGN_TRANSACTION = "SIGN_TRANSACTION"
}
declare enum SigningRequestStatus {
    APPROVED = "APPROVED",
    CANCELLED = "CANCELLED",
    INVALID = "INVALID",
    PENDING = "PENDING",
    REJECTED = "REJECTED"
}
interface SigningRequestData {
    apiVersion: string;
    createdAt: Date;
    id: string;
    networkName: string | null;
    pairing: {
        registeredDapp: RegisteredDappDataBase;
    };
    pairingId: string;
    requestEnvelope: SecuredEnvelopeTransport;
    requestType: SigningRequestTypes;
    responseEnvelope?: SecuredEnvelopeTransport;
    status: SigningRequestStatus;
}

interface UserData {
    confirmedPrivacyPolicy: boolean;
    confirmedTOS?: boolean;
    createdAt: Date;
    updatedAt: Date;
    username: string;
    id: string;
}
interface ProjectData {
    adminUserId: string;
    allowPairingsWithoutHostname: boolean;
    createdAt: Date;
    description: string;
    hostname: string;
    iconUrl: string | null;
    id: string;
    isDappHostnameVerified: boolean;
    name: string;
    updatedAt: Date;
}

type GetDappResponse = BackendResponse<{
    dapp: GetDappData;
}>;
type GetDappSerializedResponse = SerializedDate<GetDappResponse>;
type CreateWalletConnectionResponse = BackendResponse<{
    wallet: NewWalletData;
}>;
type CreateWalletConnectionSerializedResponse = SerializedDate<CreateWalletConnectionResponse>;
type GetWalletResponse = BackendResponse<{
    wallet: WalletData;
}>;
type GetWalletSerializedResponse = SerializedDate<GetWalletResponse>;
type FinalizeConnectionResponse = BackendResponse<{
    wallet: AuthenticatedWalletData;
}>;
type FinalizeConnectionSerializedResponse = SerializedDate<FinalizeConnectionResponse>;
type CreatePairingResponse = BackendResponse<{
    pairing: NewPairingData;
}>;
type CreatePairingSerializedResponse = SerializedDate<CreatePairingResponse>;
type GetPairingResponse = BackendResponse<{
    pairing: PairingData;
}>;
type GetPairingSerializedResponse = SerializedDate<GetPairingResponse>;
type FinalizePairingResponse = BackendResponse<{
    pairing: BaseFinalizedPairingData;
}> | BackendErrorResponse;
type FinalizePairingSerializedResponse = SerializedDate<FinalizePairingResponse>;
type FinalizeAnonymousPairingResponse = BackendResponse<{
    pairing: AnonymousPairingData;
}>;
type FinalizeAnonymousPairingSerializedResponse = SerializedDate<FinalizeAnonymousPairingResponse>;
type CreateSigningRequestResponse = BackendResponse<{
    signingRequest: SigningRequestData;
}>;
type CreateSigningRequestSerializedResponse = SerializedDate<CreateSigningRequestResponse>;
type GetSigningRequestResponse = BackendResponse<{
    signingRequest: SigningRequestData;
}>;
type GetSigningRequestSerializedResponse = SerializedDate<GetSigningRequestResponse>;
type GetSigningRequestsResponse = BackendResponse<{
    signingRequests: SigningRequestData[];
}>;
type GetSigningRequestsSerializedResponse = SerializedDate<GetSigningRequestsResponse>;
type RespondToSignRequestResponse = BackendResponse<{
    signingRequest: SigningRequestData;
}>;
type RespondToSignRequestSerializedResponse = SerializedDate<RespondToSignRequestResponse>;
type CancelSigningRequestResponse = BackendResponse<{
    signingRequest: SigningRequestData;
}>;
type CancelSigningRequestSerializedResponse = SerializedDate<CancelSigningRequestResponse>;
type GetUserAccountsResponse = BackendResponse<{
    accounts: AccountData[];
}>;
type GetUserAccountsSerializedResponse = SerializedDate<GetUserAccountsResponse>;
type GetUserProjectsResponse = BackendResponse<{
    projects: ProjectData[];
}>;
type GetUserProjectsSerializedResponse = SerializedDate<GetUserProjectsResponse>;
type GetUserDataResponse = BackendResponse<{
    user: UserData;
}>;
type GetUserDataSerializedResponse = SerializedDate<GetUserDataResponse>;
type GetUserPairingsResponse = BackendResponse<{
    pairings: PairingData[];
}>;
type GetUserPairingsSerializedResponse = SerializedDate<GetUserPairingsResponse>;

export { AccountData, AnonymousPairingData, AnonymousWalletData, AuthenticatedWalletData, BackendErrorResponse, BackendResponse, BackendSuccessResponse, BaseConnectedWalletData, BaseFinalizedPairingData, BasePairingData, BaseWalletData, CancelSigningRequestResponse, CancelSigningRequestSerializedResponse, ConnectedWalletData, CreatePairingResponse, CreatePairingSerializedResponse, CreateSigningRequestResponse, CreateSigningRequestSerializedResponse, CreateWalletConnectionResponse, CreateWalletConnectionSerializedResponse, DEFAULT_BACKEND_URL, DappSpecificWallet, FinalizeAnonymousPairingResponse, FinalizeAnonymousPairingSerializedResponse, FinalizeConnectionResponse, FinalizeConnectionSerializedResponse, FinalizePairingResponse, FinalizePairingSerializedResponse, FinalizedPairingData, GetDappData, GetDappResponse, GetDappSerializedResponse, GetPairingResponse, GetPairingSerializedResponse, GetSigningRequestResponse, GetSigningRequestSerializedResponse, GetSigningRequestsResponse, GetSigningRequestsSerializedResponse, GetUserAccountsResponse, GetUserAccountsSerializedResponse, GetUserDataResponse, GetUserDataSerializedResponse, GetUserPairingsResponse, GetUserPairingsSerializedResponse, GetUserProjectsResponse, GetUserProjectsSerializedResponse, GetWalletResponse, GetWalletSerializedResponse, NetworkName, NewPairingData, NewWalletData, PairingData, PairingStatus, ProjectData, RegisteredDappDataBase, RespondToSignRequestResponse, RespondToSignRequestSerializedResponse, SerializedDate, SigningRequestData, SigningRequestStatus, SigningRequestTypes, UserData, WalletData, WalletName, WalletOS, WalletPlatform };
