import { AccountAddress, Deserializer, InputGenerateTransactionPayloadData, Network, Serializer, TransactionPayload } from '@aptos-labs/ts-sdk';
import { AccountAuthenticatorInput, DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface SignAndSubmitTransactionRequest extends WalletRequest<SignAndSubmitTransactionRequest.RequestName, SignAndSubmitTransactionRequest.SupportedVersions> {
    args: SignAndSubmitTransactionRequest.Args;
}
export declare namespace SignAndSubmitTransactionRequest {
    const name: "signAndSubmitTransaction";
    type RequestName = typeof name;
    const supportedVersions: readonly [1, 2, 3];
    type SupportedVersions = (typeof supportedVersions)[number];
    const currentVersion: 3;
    type CurrentVersion = typeof currentVersion;
    interface Args {
        expirationTimestamp?: number;
        feePayer?: AccountAuthenticatorInput;
        gasUnitPrice?: number;
        maxGasAmount?: number;
        network?: Network;
        payload: TransactionPayload | InputGenerateTransactionPayloadData;
        signerAddress?: AccountAddress;
    }
    function serializeArgs(serializer: Serializer, value: Args): void;
    function deserializeArgs(deserializer: Deserializer, version: SupportedVersions): Args;
    function serialize(dappInfo: DappInfo, args: Args): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(serializedRequest: SerializedWalletRequest<RequestName, SupportedVersions>): SignAndSubmitTransactionRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, SupportedVersions>;
}
//# sourceMappingURL=request.d.ts.map