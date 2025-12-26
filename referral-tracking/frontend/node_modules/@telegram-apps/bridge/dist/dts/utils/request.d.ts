import { CancelablePromise, If, IsNever } from '@telegram-apps/toolkit';
import { MethodNameWithOptionalParams, MethodNameWithoutParams, MethodNameWithRequiredParams, MethodParams } from '../methods/types/index.js';
import { EventName, EventPayload } from '../events/types/events.js';
import { ExecuteWithOptions } from '../types.js';
type AnyEventName = EventName | EventName[];
export type RequestCaptureFnEventsPayload<E extends EventName[]> = E extends (infer U extends EventName)[] ? {
    [K in U]: If<IsNever<EventPayload<K>>, {
        event: K;
    }, {
        event: K;
        payload: EventPayload<K>;
    }>;
}[U] : never;
export type RequestCaptureEventsFn<E extends EventName[]> = (payload: RequestCaptureFnEventsPayload<E>) => boolean;
export type RequestCaptureEventFn<E extends EventName> = If<IsNever<EventPayload<E>>, () => boolean, (payload: EventPayload<E>) => boolean>;
export type RequestCaptureFn<E extends AnyEventName> = E extends EventName[] ? RequestCaptureEventsFn<E> : E extends EventName ? RequestCaptureEventFn<E> : never;
export interface RequestBasicOptions<E extends AnyEventName> extends ExecuteWithOptions {
    /**
     * Should return true if this event should be captured.
     * The first compatible request will be captured if this property is omitted.
     */
    capture?: RequestCaptureFn<E>;
}
export type RequestResult<E extends AnyEventName> = E extends (infer U extends EventName)[] ? U extends infer K extends EventName ? If<IsNever<EventPayload<K>>, undefined, EventPayload<K>> : never : E extends EventName ? If<IsNever<EventPayload<E>>, undefined, EventPayload<E>> : never;
export type RequestFn = typeof request;
/**
 * Performs a request waiting for specified events to occur.
 *
 * This overriding is used for methods, requiring parameters.
 * @param method - method name.
 * @param eventOrEvents - tracked event or events.
 * @param options - additional options.
 */
export declare function request<M extends MethodNameWithRequiredParams, E extends AnyEventName>(method: M, eventOrEvents: E, options: RequestBasicOptions<E> & {
    params: MethodParams<M>;
}): CancelablePromise<RequestResult<E>>;
/**
 * Performs a request waiting for specified events to occur.
 *
 * This overriding is used for methods with optional parameters.
 * @param method - method name.
 * @param eventOrEvents - tracked event or events.
 * @param options - additional options.
 */
export declare function request<M extends MethodNameWithOptionalParams, E extends AnyEventName>(method: M, eventOrEvents: E, options?: RequestBasicOptions<E> & {
    params?: MethodParams<M>;
}): CancelablePromise<RequestResult<E>>;
/**
 * Performs a request waiting for specified events to occur.
 *
 * This overriding is used for methods without parameters.
 * @param method - method name.
 * @param eventOrEvents - tracked event or events.
 * @param options - additional options.
 */
export declare function request<M extends MethodNameWithoutParams, E extends AnyEventName>(method: M, eventOrEvents: E, options?: RequestBasicOptions<E>): CancelablePromise<RequestResult<E>>;
export {};
