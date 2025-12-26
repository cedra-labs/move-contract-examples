/**
 * A memoize higher-order function to cache the response of an async function.
 * This function helps to improve performance by avoiding repeated calls to the same async function with the same arguments
 * within a specified time-to-live (TTL).
 *
 * @param func The async function to cache the result of.
 * @param key The cache key used to store the result.
 * @param ttlMs The time-to-live in milliseconds for cached data.
 * @returns The cached or latest result.
 * @group Implementation
 * @category Utils
 */
declare function memoizeAsync<T>(func: (...args: any[]) => Promise<T>, key: string, ttlMs?: number): (...args: any[]) => Promise<T>;
/**
 * Caches the result of a function call to improve performance on subsequent calls with the same arguments.
 *
 * @param key - The key to cache on, all accesses by this key will return the cached value.
 * @param func - The function whose result will be cached.
 * @param ttlMs - The time-to-live in milliseconds for cached data.
 * @returns A memoized version of the provided function that returns the cached result if available and within TTL.
 * @group Implementation
 * @category Utils
 */
declare function memoize<T>(func: (...args: any[]) => T, key: string, ttlMs?: number): (...args: any[]) => T;

export { memoize, memoizeAsync };
