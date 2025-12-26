import { AccountAddress } from '@aptos-labs/ts-sdk';
import { DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface SignMessageRequest extends WalletRequest<SignMessageRequest.RequestName, SignMessageRequest.SupportedVersions> {
    args: SignMessageRequest.Args;
}
export declare namespace SignMessageRequest {
    const name: "signMessage";
    type RequestName = typeof name;
    const supportedVersions: readonly [1, 2];
    type SupportedVersions = (typeof supportedVersions)[number];
    const currentVersion: 2;
    type CurrentVersion = typeof currentVersion;
    interface Args {
        chainId: number;
        message: Uint8Array;
        nonce: Uint8Array;
        signerAddress?: AccountAddress;
    }
    function serialize(dappInfo: DappInfo, args: Args): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(serializedRequest: SerializedWalletRequest<RequestName, SupportedVersions>): SignMessageRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, SupportedVersions>;
}
//# sourceMappingURL=request.d.ts.map