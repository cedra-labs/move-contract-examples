import { Deserializer, Ed25519PrivateKey, Network, Serializer } from '@aptos-labs/ts-sdk';
import { DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface ClaimOptions {
    asset?: string;
    network: Network;
    secretKey: Ed25519PrivateKey;
}
export interface ConnectRequest extends WalletRequest<ConnectRequest.RequestName, ConnectRequest.SupportedVersions> {
    args: ConnectRequest.Args;
}
export declare namespace ConnectRequest {
    const name: "connect";
    type RequestName = typeof name;
    const supportedVersions: readonly [1, 2, 3, 4];
    type SupportedVersions = (typeof supportedVersions)[number];
    const currentVersion: 4;
    type CurrentVersion = typeof currentVersion;
    type Args = {
        claimOptions?: ClaimOptions;
        dappEd25519PublicKeyB64?: string;
        dappId?: string;
        preferredWalletName?: string;
    };
    function serializeArgs(serializer: Serializer, value: Args): void;
    function deserializeArgs(deserializer: Deserializer, version: SupportedVersions): Args;
    function serialize(dappInfo: DappInfo, args?: ConnectRequest.Args): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(request: SerializedWalletRequest<RequestName, SupportedVersions>): ConnectRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, SupportedVersions>;
}
//# sourceMappingURL=request.d.ts.map