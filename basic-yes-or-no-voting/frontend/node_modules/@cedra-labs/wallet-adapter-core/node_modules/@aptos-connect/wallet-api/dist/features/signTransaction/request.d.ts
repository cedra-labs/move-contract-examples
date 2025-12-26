import { AccountAddress, InputGenerateTransactionPayloadData, Network, PublicKey, RawTransaction, TransactionPayload } from '@aptos-labs/ts-sdk';
import { AccountInput, DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface SignTransactionRequest extends WalletRequest<SignTransactionRequest.RequestName, SignTransactionRequest.SupportedVersions> {
    args: SignTransactionRequest.Args;
}
export declare namespace SignTransactionRequest {
    const name: "signTransaction";
    type RequestName = typeof name;
    const supportedVersions: readonly [1, 2, 3, 4];
    type SupportedVersions = (typeof supportedVersions)[number];
    const currentVersion: 4;
    type CurrentVersion = typeof currentVersion;
    interface Args {
        expirationSecondsFromNow?: number;
        expirationTimestamp?: number;
        feePayer?: AccountInput;
        gasUnitPrice?: number;
        maxGasAmount?: number;
        network?: Network;
        payload: TransactionPayload | InputGenerateTransactionPayloadData;
        secondarySigners?: AccountInput[];
        sender?: AccountInput;
        sequenceNumber?: number | bigint;
        signerAddress?: AccountAddress;
    }
    interface ArgsWithTransaction {
        feePayer?: AccountInput;
        secondarySigners?: AccountInput[];
        senderPublicKey?: PublicKey;
        signerAddress?: AccountAddress;
        transaction: RawTransaction;
    }
    function normalizeArgs(args: ArgsWithTransaction): Args;
    function serialize(dappInfo: DappInfo, args: Args): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(serializedRequest: SerializedWalletRequest<RequestName, SupportedVersions>): SignTransactionRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, SupportedVersions>;
}
//# sourceMappingURL=request.d.ts.map