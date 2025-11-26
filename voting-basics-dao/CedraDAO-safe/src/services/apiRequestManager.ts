/**
 * Professional API Request Manager with Rate Limiting, Circuit Breaker, and Caching
 * Handles 429 Too Many Requests errors professionally
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
  priority: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class APIRequestManager {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private cache = new Map<string, CacheEntry>();
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();
  
  // Configuration - More lenient settings for blockchain RPC calls
  private readonly MAX_CONCURRENT_REQUESTS = 2; // Reduced to be more conservative
  private readonly REQUESTS_PER_SECOND = 1; // Reduced to 1 request per second
  private readonly CIRCUIT_BREAKER_THRESHOLD = 15; // Increased from 5 to 15 failures
  private readonly CIRCUIT_BREAKER_TIMEOUT = 15000; // Reduced to 15 seconds for faster recovery
  private readonly DEFAULT_CACHE_TTL = 30000; // Increased to 30 seconds for better caching
  private readonly MAX_RETRIES = 5; // Increased retries
  private readonly BASE_DELAY = 2000; // Increased base delay to 2 seconds

  private activeRequests = 0;

  /**
   * Queue a request with rate limiting and circuit breaker protection
   */
  async queueRequest<T>(
    requestFn: () => Promise<T>,
    options: {
      cacheKey?: string;
      cacheTtl?: number;
      priority?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const { cacheKey, cacheTtl = this.DEFAULT_CACHE_TTL, priority = 0, skipCache = false } = options;

    // Check cache first
    if (cacheKey && !skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check circuit breaker
    if (this.circuitBreakerState === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
        throw new Error('Circuit breaker is OPEN - too many failures');
      } else {
        this.circuitBreakerState = 'HALF_OPEN';
      }
    }

    return new Promise<T>((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random()}`;
      
      const queuedRequest: QueuedRequest = {
        id: requestId,
        execute: async () => {
          try {
            const result = await requestFn();
            
            // Cache the result if cache key provided
            if (cacheKey) {
              this.setCache(cacheKey, result, cacheTtl);
            }
            
            // Reset circuit breaker on success
            this.resetCircuitBreaker();
            
            return result;
          } catch (error: any) {
            this.handleRequestFailure(error);
            throw error;
          }
        },
        resolve,
        reject,
        retryCount: 0,
        priority
      };

      // Add to queue sorted by priority
      this.queue.push(queuedRequest);
      this.queue.sort((a, b) => b.priority - a.priority);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Rate limiting check
      if (!this.canMakeRequest()) {
        await this.waitForRateLimit();
        continue;
      }

      // Concurrent request limit
      if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const request = this.queue.shift();
      if (!request) continue;

      this.executeRequest(request);
    }

    this.isProcessing = false;
  }

  private async executeRequest(request: QueuedRequest): Promise<void> {
    this.activeRequests++;

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error: any) {
      if (this.shouldRetry(error, request)) {
        request.retryCount++;
        const delay = this.calculateBackoffDelay(request.retryCount);
        
        setTimeout(() => {
          this.queue.unshift(request); // Add back to front of queue
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, delay);
      } else {
        request.reject(error);
      }
    } finally {
      this.activeRequests--;
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const windowDuration = 1000; // 1 second window

    // Reset window if needed
    if (now - this.windowStart >= windowDuration) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    return this.requestCount < this.REQUESTS_PER_SECOND;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeToWait = 1000 - (now - this.windowStart);
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
  }

  private shouldRetry(error: any, request: QueuedRequest): boolean {
    if (request.retryCount >= this.MAX_RETRIES) return false;

    // Retry on rate limit errors
    if (error.status === 429 || error.code === 'ERR_NETWORK' || 
        error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      return true;
    }

    // Retry on CORS errors (might be temporary)
    if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
      return true;
    }

    return false;
  }

  private calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.BASE_DELAY * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  private handleRequestFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Only count certain errors as failures (not all errors should trigger circuit breaker)
    const isCircuitBreakerError = error.status === 429 || 
                                 error.code === 'ERR_NETWORK' || 
                                 error.message?.includes('429') || 
                                 error.message?.includes('Too Many Requests') ||
                                 error.message?.includes('timeout') ||
                                 error.message?.includes('CORS');

    if (isCircuitBreakerError && this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerState = 'OPEN';
      console.warn(`🔥 Circuit breaker opened after ${this.failureCount} network failures`);
      console.warn(`🔧 Use resetCircuitBreaker() to manually reset if needed`);
    } else if (!isCircuitBreakerError) {
      // Reset failure count for non-network errors
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreakerState === 'HALF_OPEN') {
      this.circuitBreakerState = 'CLOSED';
      console.log(' Circuit breaker closed - requests restored');
    }
    this.failureCount = 0;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache for specific keys or all
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  resetCircuitBreakerManually() {
    this.circuitBreakerState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log('🔧 Circuit breaker manually reset');
  }

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      cacheSize: this.cache.size,
      requestCount: this.requestCount,
      timeSinceLastFailure: Date.now() - this.lastFailureTime,
    };
  }
}

// Singleton instance
export const apiRequestManager = new APIRequestManager();

/**
 * Wrapper function for making API calls through the request manager
 */
export async function managedApiCall<T>(
  requestFn: () => Promise<T>,
  options?: {
    cacheKey?: string;
    cacheTtl?: number;
    priority?: number;
    skipCache?: boolean;
  }
): Promise<T> {
  return apiRequestManager.queueRequest(requestFn, options);
}

/**
 * Manually reset the circuit breaker (internal use only)
 */
function resetCircuitBreaker() {
  return apiRequestManager.resetCircuitBreakerManually();
}

/**
 * Get API manager status (internal use only)
 */
function getAPIStatus() {
  return apiRequestManager.getStatus();
}

// Note: Manual reset functions are only available internally, not exposed globally for production security