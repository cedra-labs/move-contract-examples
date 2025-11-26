// Professional RPC utilities with advanced request management
import { cedraClient } from '../cedra_service/cedra-client';
import { managedApiCall } from '../services/apiRequestManager';

// Helper to check if error is a treasury resource missing error (expected for some DAOs)
const isTreasuryResourceMissingError = (error: any): boolean => {
  const errorMsg = error?.message || JSON.stringify(error);
  return (
    errorMsg.includes('MISSING_DATA') &&
    errorMsg.includes('treasury') &&
    errorMsg.includes('Failed to borrow global resource')
  );
};

// Wrapper for view function calls with professional request management
export const safeView = async (payload: any, cacheKey?: string): Promise<any> => {
  try {
    return await managedApiCall(
      () => cedraClient.view({ payload }),
      {
        cacheKey: cacheKey ? `view_${cacheKey}` : undefined,
        cacheTtl: 1000, // Cache for 1 second only
        priority: 1
      }
    );
  } catch (error: any) {
    // Suppress treasury resource missing errors (expected for some DAOs)
    if (isTreasuryResourceMissingError(error)) {
      // Return empty result instead of throwing
      return [];
    }
    throw error;
  }
};

// Wrapper for resource calls with professional request management
export const safeGetAccountResource = async (params: any, cacheKey?: string): Promise<any> => {
  return managedApiCall(
    () => cedraClient.getAccountResource(params),
    {
      cacheKey: cacheKey ? `resource_${cacheKey}` : undefined,
      cacheTtl: 2000, // Cache for 2 seconds
      priority: 2 // Higher priority for resource calls
    }
  );
};

// Wrapper for event calls with professional request management
export const safeGetModuleEventsByEventType = async (params: any, cacheKey?: string): Promise<any> => {
  return managedApiCall(
    () => cedraClient.getModuleEventsByEventType(params),
    {
      cacheKey: cacheKey ? `events_${cacheKey}` : undefined,
      cacheTtl: 3000, // Cache for 3 seconds (events change frequently)
      priority: 0 // Lower priority for events
    }
  );
};

// Wrapper for multiple calls with controlled concurrency - now handled by request manager
export const batchSafeView = async (payloads: any[], options?: { cachePrefix?: string }): Promise<any[]> => {
  const promises = payloads.map((payload, index) => 
    safeView(payload, options?.cachePrefix ? `${options.cachePrefix}_${index}` : undefined)
  );
  
  // Request manager handles concurrency and rate limiting automatically
  const results = await Promise.allSettled(promises);
  return results;
};

// Legacy function kept for compatibility
export const retryWithBackoff = async (fn: () => Promise<any>, _maxRetries = 3): Promise<any> => {
  console.warn('retryWithBackoff is deprecated, use safeView/safeGetAccountResource instead');
  return managedApiCall(fn);
};