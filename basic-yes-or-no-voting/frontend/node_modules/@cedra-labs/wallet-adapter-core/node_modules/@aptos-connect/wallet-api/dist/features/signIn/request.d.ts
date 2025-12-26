import { Deserializer, Network, Serializer } from '@aptos-labs/ts-sdk';
import { AptosSignInInput } from '@aptos-labs/wallet-standard';
import { DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface SignInRequest extends WalletRequest<SignInRequest.RequestName, SignInRequest.SupportedVersions> {
    args: SignInRequest.Args;
}
export declare namespace SignInRequest {
    const name: "signIn";
    type RequestName = typeof name;
    const supportedVersions: readonly [1];
    type SupportedVersions = (typeof supportedVersions)[number];
    const currentVersion: 1;
    type CurrentVersion = typeof currentVersion;
    type Args = AptosSignInInput & {
        network: Network;
    };
    function serializeArgs(serializer: Serializer, value: Args): void;
    function deserializeArgs(deserializer: Deserializer, _: SupportedVersions): Args;
    function serialize(dappInfo: DappInfo, args: SignInRequest.Args): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(request: SerializedWalletRequest<RequestName, SupportedVersions>): SignInRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, SupportedVersions>;
}
//# sourceMappingURL=request.d.ts.map