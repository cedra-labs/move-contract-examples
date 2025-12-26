import { CancelablePromise } from '@telegram-apps/toolkit';
import { ExecuteWithOptions } from '../types.js';
import { CustomMethodName, CustomMethodParams } from '../methods/types/index.js';
/**
 * Invokes known custom method. Returns method execution result.
 * @param method - method name.
 * @param params - method parameters.
 * @param requestId - request identifier.
 * @param options - additional options.
 * @throws {TypedError} ERR_CUSTOM_METHOD_ERR_RESPONSE
 */
export declare function invokeCustomMethod<M extends CustomMethodName>(method: M, params: CustomMethodParams<M>, requestId: string, options?: ExecuteWithOptions): CancelablePromise<unknown>;
/**
 * Invokes unknown custom method. Returns method execution result.
 * @param method - method name.
 * @param params - method parameters.
 * @param requestId - request identifier.
 * @param options - additional options.
 * @throws {TypedError} ERR_CUSTOM_METHOD_ERR_RESPONSE
 */
export declare function invokeCustomMethod(method: string, params: object, requestId: string, options?: ExecuteWithOptions): CancelablePromise<unknown>;
