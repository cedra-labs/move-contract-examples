import { RegisteredDappDataBase } from './dapp';
export type SerializedEncryptionResult = {
    nonceB64: string;
    securedB64: string;
};
export type SecuredEnvelopeTransport = {
    encryptedPrivateMessage: SerializedEncryptionResult;
    messageSignature: string;
    serializedPublicMessage: string;
};
export declare enum SigningRequestTypes {
    SIGN_AND_SUBMIT_TRANSACTION = "SIGN_AND_SUBMIT_TRANSACTION",
    SIGN_MESSAGE = "SIGN_MESSAGE",
    SIGN_TRANSACTION = "SIGN_TRANSACTION"
}
export declare enum SigningRequestStatus {
    APPROVED = "APPROVED",
    CANCELLED = "CANCELLED",
    INVALID = "INVALID",
    PENDING = "PENDING",
    REJECTED = "REJECTED"
}
export interface SigningRequestData {
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
//# sourceMappingURL=signingRequest.d.ts.map