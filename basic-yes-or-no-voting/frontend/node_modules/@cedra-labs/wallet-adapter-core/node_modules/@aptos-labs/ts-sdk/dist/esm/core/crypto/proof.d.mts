import { Serializable } from '../../bcs/serializer.mjs';
import '../hex.mjs';
import '../common.mjs';
import '../../types/types.mjs';
import '../../types/indexer.mjs';
import '../../types/generated/operations.mjs';
import '../../types/generated/types.mjs';
import '../../utils/apiEndpoints.mjs';
import '@aptos-labs/script-composer-pack';

/**
 * An abstract representation of a cryptographic proof associated with specific
 * zero-knowledge proof schemes, such as Groth16 and PLONK.
 * @group Implementation
 * @category Serialization
 */
declare abstract class Proof extends Serializable {
}

export { Proof };
