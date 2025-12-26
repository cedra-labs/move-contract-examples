import { SigningScheme } from '../types/types.mjs';
import { AccountAddress } from '../core/accountAddress.mjs';
import { Deserializer } from '../bcs/deserializer.mjs';
import '../types/indexer.mjs';
import '../types/generated/operations.mjs';
import '../types/generated/types.mjs';
import '../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';
import '../bcs/serializer.mjs';
import '../core/hex.mjs';
import '../core/common.mjs';
import '../transactions/instances/transactionArgument.mjs';

declare function deserializeSchemeAndAddress(deserializer: Deserializer): {
    address: AccountAddress;
    signingScheme: SigningScheme;
};

export { deserializeSchemeAndAddress };
