import { DappInfo } from '../../shared';
import { SerializedWalletRequest, WalletRequest } from '../../WalletRequest';
export interface DisconnectRequest extends WalletRequest<DisconnectRequest.RequestName, DisconnectRequest.CurrentVersion> {
}
export declare namespace DisconnectRequest {
    const name: "disconnect";
    type RequestName = typeof name;
    const currentVersion: 1;
    type CurrentVersion = typeof currentVersion;
    function serialize(dappInfo: DappInfo): SerializedWalletRequest<RequestName, CurrentVersion>;
    function deserialize(request: SerializedWalletRequest<RequestName, CurrentVersion>): DisconnectRequest;
    function isSerialized(request: SerializedWalletRequest): request is SerializedWalletRequest<RequestName, CurrentVersion>;
}
//# sourceMappingURL=request.d.ts.map