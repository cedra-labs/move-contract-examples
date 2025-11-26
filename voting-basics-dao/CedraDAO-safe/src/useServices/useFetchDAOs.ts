/**
 * DAO Fetching Service for Cedra Network
 *
 * Fetches and manages DAO data from on-chain
 * Uses Cedra SDK for blockchain interactions
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { useState, useEffect, useCallback } from 'react'
import { cedraClient } from '../cedra_service/cedra-client'
import { MODULE_ADDRESS } from '../cedra_service/constants'
import { DAO } from '../types/dao'
import { fetchDAOCreationEvents } from '../services/graphqlService'
import { DAO_FUNCTIONS } from '../services_abi/dao_core'

// Utility function to add delays for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function useFetchCreatedDAOs() {
  // Load cache immediately on mount for instant display
  const cachedData = (() => {
    try {
      const cached = typeof window !== 'undefined' ? window.localStorage.getItem('daos_cache_v4_stable_count') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed?.daos || [];
      }
    } catch {}
    return [];
  })();

  const [daos, setDAOs] = useState<DAO[]>(cachedData)
  const [isLoading, setIsLoading] = useState(cachedData.length === 0) // Only show loading if no cache
  const [error, setError] = useState<string | null>(null)

  // Enhanced caching with stale-while-revalidate - updated cache key for new deployment
  const CACHE_KEY = 'daos_cache_v4_stable_count'
  const FRESH_TTL_MS = 60 * 1000 // 60s fresh window - increased for better performance
  const STALE_TTL_MS = 5 * 60 * 1000 // 5 minutes stale-while-revalidate - increased

  // Contract verification helper with retry logic
  const verifyContractDeployment = async (): Promise<boolean> => {
    try {
      // Try with a simple view call first (less likely to be rate limited)
      await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::dao_core_file::get_total_dao_count`,
          functionArguments: []
        }
      });
      return true;
    } catch (error: any) {
      if (error?.message?.includes('CORS') || error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
        return true; // Assume deployed when network issues occur
      }
      return false;
    }
  };

  // Helpers for image decoding
  const hexToBytes = (hexLike: string): Uint8Array => {
    try {
      const hex = hexLike.startsWith('0x') ? hexLike.slice(2) : hexLike
      if (hex.length === 0) return new Uint8Array([])
      const out = new Uint8Array(Math.floor(hex.length / 2))
      for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
      return out
    } catch {
      return new Uint8Array([])
    }
  }

  // Enhanced image optimization and preloading functions
  const optimizeImageUrl = (url: string): string => {
    if (!url) return ''
    
    
    try {
      // For Twitter images, use minimal optimization for maximum clarity
      if (url.includes('pbs.twimg.com')) {
        let optimizedUrl = url
        
        // Profile images: use original size for maximum clarity
        if (url.includes('profile_images')) {
          optimizedUrl = url.replace('_400x400', '_400x400') // Keep original size (400x400)
        }
        
        // Banner images: use original size for maximum clarity
        if (url.includes('profile_banners')) {
          optimizedUrl = url.replace('/1500x500', '/1500x500') // Keep original size for clarity
        }
        
        return optimizedUrl
      }
      
      // For other URLs, use minimal optimization for clarity
      const urlObj = new URL(url)
      urlObj.searchParams.set('w', '800') // Much larger max width for clarity
      urlObj.searchParams.set('q', '95')  // Very high quality for clear images
      const optimized = urlObj.toString()
      return optimized
    } catch (error) {
      console.warn('URL optimization failed:', error)
      return url // Return original if URL parsing fails
    }
  }

  // Image cache to avoid reprocessing
  const imageCache = new Map<string, string>();

  // Define fetchDAOs function with useCallback so it can be used in the event listener
  const fetchDAOs = useCallback(async (forceRefresh = false) => {
    // Enhanced caching with stale-while-revalidate pattern
    let usedStaleCache = false
    
    try {
      const cachedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(CACHE_KEY) : null
      if (cachedRaw && !forceRefresh) {
        const cached = JSON.parse(cachedRaw) as { daos: DAO[]; updatedAt: number; count: number }
        if (cached?.daos?.length && cached?.count) {
          const age = Date.now() - (cached.updatedAt || 0)
          
          if (age < FRESH_TTL_MS) {
            // Fresh cache - use immediately and don't fetch
            setDAOs(cached.daos)
            setIsLoading(false)
            return cached.daos
          } else if (age < STALE_TTL_MS) {
            // Stale but valid - show immediately and fetch in background
            setDAOs(cached.daos)
            setIsLoading(false)
            usedStaleCache = true
          }
        }
      }
    } catch {}

    // Only show loading if we don't have stale cache
    if (!usedStaleCache) {
      setIsLoading(true)
    }
    setError(null)

    try {
      
      // First verify contract deployment (but proceed even if network issues)
      const isContractDeployed = await verifyContractDeployment();
      if (!isContractDeployed) {
        // Don't return empty - try to use cached data or continue with other methods
      }
      

      let foundDAOs: DAO[] = []
      let registryAddresses: string[] = []
      let eventAddresses: string[] = []

      // Step 1: Check if registry is initialized and try to use it
      try {
        console.log('🔍 Checking DAO registry status...')
        const registryInitialized = await cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::dao_core_file::is_registry_initialized` as `${string}::${string}::${string}`,
            functionArguments: [],
          },
        }).catch(() => [false])

        const isRegistryReady = Boolean(registryInitialized[0])
        console.log(`📊 Registry status: ${isRegistryReady ? 'Initialized' : 'Not initialized'}`)

        if (isRegistryReady) {
          try {
            const totalDAOs = await cedraClient.view({
              payload: {
                function: DAO_FUNCTIONS.GET_TOTAL_DAO_COUNT as `${string}::${string}::${string}`,
                functionArguments: [],
              },
            })

            const totalCount = Number(totalDAOs[0] || 0)
            console.log(`📊 Registry reports ${totalCount} DAOs`)

            if (totalCount > 0) {
              const allAddresses = await cedraClient.view({
                payload: {
                  function: DAO_FUNCTIONS.GET_ALL_DAO_ADDRESSES as `${string}::${string}::${string}`,
                  functionArguments: [],
                },
              })

              if (Array.isArray(allAddresses[0]) && allAddresses[0].length > 0) {
                registryAddresses = allAddresses[0] as string[]
                console.log(`✅ Found ${registryAddresses.length} DAOs from registry`)
              }
            }
          } catch (registryError: any) {
            console.warn('⚠️ Failed to fetch from registry:', registryError?.message || registryError)
          }
        } else {
          console.warn('⚠️ Registry not initialized - will use event-based discovery')
        }
      } catch (registryCheckError: any) {
        console.warn('⚠️ Registry check failed:', registryCheckError?.message || registryCheckError)
      }

      // Step 2: Always try event-based discovery (as fallback or to find missing DAOs)
      try {
        console.log('🔍 Fetching DAOs from event indexer (all event types)...')
        // fetchDAOCreationEvents will fetch all DAO creation event types if no specific type provided
        // This includes: DAOCreated, CouncilDAOCreated, and DAORegistered
        eventAddresses = await fetchDAOCreationEvents(MODULE_ADDRESS)
        console.log(`✅ Found ${eventAddresses.length} DAOs from events`)
      } catch (eventError: any) {
        console.warn('⚠️ Event-based discovery failed:', eventError?.message || eventError)
      }

      // Step 3: Combine addresses from both sources (remove duplicates)
      const allAddressesSet = new Set<string>()
      
      // Add registry addresses first (they're more reliable)
      registryAddresses.forEach(addr => {
        if (addr) allAddressesSet.add(addr.toLowerCase())
      })
      
      // Add event addresses (may include DAOs not in registry)
      eventAddresses.forEach(addr => {
        if (addr) allAddressesSet.add(addr.toLowerCase())
      })

      const uniqueAddresses = Array.from(allAddressesSet)
      console.log(`📊 Total unique DAOs found: ${uniqueAddresses.length} (${registryAddresses.length} from registry, ${eventAddresses.length} from events)`)

      // Step 4: Process all unique DAO addresses
      if (uniqueAddresses.length > 0) {
        foundDAOs = await processDAOsInBatches(uniqueAddresses)
        console.log(`✅ Successfully processed ${foundDAOs.length} DAOs`)
      } else {
        console.warn('⚠️ No DAOs found from either registry or events')
      }
      
      // Step 5: Always set the found DAOs (even if empty)
      setDAOs(foundDAOs)
      
      // Cache the final results for consistency
      try {
        const cacheData = {
          daos: foundDAOs,
          updatedAt: Date.now(),
          version: 4,
          count: foundDAOs.length,
          sources: {
            registry: registryAddresses.length,
            events: eventAddresses.length,
            unique: uniqueAddresses.length
          }
        }
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
          window.localStorage.setItem(`${CACHE_KEY}_backup`, JSON.stringify(cacheData))
        }
        
        console.log(`💾 Cached ${foundDAOs.length} DAOs`)
      } catch (error) {
        console.warn('Failed to cache DAOs:', error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DAOs via SDK'
      setError(errorMessage)
      console.error('Error fetching DAOs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Optimistic add: allow other parts of app to inject a just-created DAO for instant UI update
  // Usage: window.dispatchEvent(new CustomEvent('dao:created', { detail: dao }))
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Partial<DAO> | undefined
      if (!detail || !detail.id) {
        // If no detail provided, just trigger a refresh
        console.log('🔄 DAO created event received - triggering refresh...')
        fetchDAOs(true).catch(err => console.warn('Failed to refresh after DAO creation:', err))
        return
      }
      
      console.log('🔄 DAO created event received with details - adding optimistically and refreshing...', detail)
      
      setDAOs(prev => {
        if (prev.some(d => d.id === detail.id)) {
          // DAO already exists, just trigger refresh
          setTimeout(() => { fetchDAOs(true).catch(() => {}) }, 1000)
          return prev
        }
        
        const optimistic: DAO = {
          id: detail.id as string,
          name: detail.name || 'New DAO',
          description: detail.description || '',
          image: detail.image || '',
          background: detail.background || '',
          subname: detail.subname,
          chain: detail.subname ?? 'Cedra',
          tokenName: detail.tokenName ?? 'DAO',
          tokenSymbol: detail.tokenSymbol ?? 'DAO',
          tvl: '0',
          proposals: 0,
          members: 0,
          established: new Date().toLocaleString(),
          category: 'featured',
          isFollowing: false,
        }
        // Put at the top for immediate visibility
        const next = [optimistic, ...prev]
        // cache immediately
        try {
          const cacheData = { daos: next, updatedAt: Date.now(), version: 4, count: next.length }
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
            window.localStorage.setItem(`${CACHE_KEY}_backup`, JSON.stringify(cacheData))
          }
        } catch {}
        // Trigger immediate refresh to get real data from blockchain
        // Wait for blockchain indexer to process the transaction
        // GraphQL indexer typically takes 30-60 seconds
        setTimeout(() => {
          console.log('🔄 Refreshing DAO list after creation (30s delay)...')
          fetchDAOs(true).catch(err => console.warn('Failed to refresh after DAO creation:', err))
        }, 30000) // 30 second delay to allow GraphQL indexer to process

        // Additional refresh after 60 seconds as backup
        setTimeout(() => {
          console.log('🔄 Second refresh attempt (60s delay)...')
          fetchDAOs(true).catch(err => console.warn('Failed to refresh after DAO creation:', err))
        }, 60000)
        return next
      })
    }
    window.addEventListener('dao:created', handler as EventListener)
    return () => window.removeEventListener('dao:created', handler as EventListener)
  }, [fetchDAOs])

  const toImageUrl = (maybeBytes: unknown): string => {
    try {
      // Create cache key from the data
      const cacheKey = Array.isArray(maybeBytes) ? 
        `bytes_${maybeBytes.length}_${maybeBytes.slice(0, 10).join('')}` : 
        `str_${String(maybeBytes).substring(0, 50)}`;
      
      // Check cache first
      if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey)!;
      }

      let bytes: Uint8Array | null = null
      if (Array.isArray(maybeBytes)) {
        bytes = new Uint8Array(maybeBytes as number[])
      } else if (typeof maybeBytes === 'string' && maybeBytes.length > 0) {
        if (maybeBytes.startsWith('0x')) {
        }
        bytes = hexToBytes(maybeBytes)
      } else {
      }
      
      if (bytes && bytes.length > 0) {
        
        try {
          // Detect image format from magic bytes
          let mimeType = 'image/jpeg'; // default
          if (bytes.length >= 4) {
            const header = Array.from(bytes.slice(0, 4));
            if (header[0] === 0xFF && header[1] === 0xD8) {
              mimeType = 'image/jpeg';
            } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
              mimeType = 'image/png';
            } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
              mimeType = 'image/gif';
            } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
              mimeType = 'image/webp';
            }
          }
          
          // Use more efficient conversion for large images
          let dataUrl: string;
          if (bytes.length > 100000) { // > 100KB - use chunked processing
            const chunkSize = 8192;
            let binary = '';
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.slice(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64 = btoa(binary);
            dataUrl = `data:${mimeType};base64,${base64}`;
          } else {
            // Standard conversion for smaller images
            const binary = String.fromCharCode.apply(null, Array.from(bytes));
            const base64 = btoa(binary);
            dataUrl = `data:${mimeType};base64,${base64}`;
          }
          
          // Cache the result
          imageCache.set(cacheKey, dataUrl);
          return dataUrl;
        } catch (conversionError) {
          console.error('Image conversion failed:', conversionError);
          const fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzM3NDE1MSIvPgo8L3N2Zz4K';
          imageCache.set(cacheKey, fallback);
          return fallback;
        }
      } else {
      }
      
      // Cache empty result too
      imageCache.set(cacheKey, '');
      return ''
    } catch (error) {
      console.error('Error converting bytes to image URL:', error);
      return ''
    }
  }

  // Batch processing configuration - Optimized for faster loading
  const BATCH_SIZE = 3 // Process 3 DAOs at a time for faster loading
  const BATCH_DELAY = 1000 // 1s delay between batches - reduced for speed
  const REQUEST_DELAY = 200 // 200ms delay between individual requests - reduced for speed

  // Helper function to process a single DAO address
  const processSingleDAO = async (address: string): Promise<DAO | null> => {
    try {
      // Add small delay before each DAO processing to avoid overwhelming the RPC
      await delay(REQUEST_DELAY)
      
      const daoInfo = await cedraClient.view({
        payload: {
          function: DAO_FUNCTIONS.GET_DAO_INFO as `${string}::${string}::${string}`,
          functionArguments: [address],
        },
      })
      
      // Handle different DAO info formats - according to ABI: (name, subname, description, logo_is_url, logo_url, logo_data, bg_is_url, bg_url, bg_data, created_at)
      let name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt;
      if (daoInfo.length >= 10) {
        // New format with subname: (name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt)
        [name, subname, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = daoInfo;
      } else if (daoInfo.length >= 9) {
        // Format without subname: (name, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt)
        [name, description, logoIsUrl, logoUrl, logoData, bgIsUrl, bgUrl, bgData, createdAt] = daoInfo;
        subname = undefined;
      } else {
        // Legacy format: (name, description, logo, background, createdAt)
        [name, description, logoData, bgData, createdAt] = daoInfo;
        logoIsUrl = false;
        bgIsUrl = false;
        logoUrl = '';
        bgUrl = '';
        subname = undefined;
      }
      
      // Handle images using the working pattern with optimization
      let logoUrl_final: string;
      if (logoIsUrl) {
        logoUrl_final = optimizeImageUrl(logoUrl as string);
      } else {
        logoUrl_final = toImageUrl(logoData);
      }
      
      let backgroundUrl_final: string;
      if (bgIsUrl) {
        backgroundUrl_final = optimizeImageUrl(bgUrl as string);
      } else {
        backgroundUrl_final = toImageUrl(bgData);
      }
      
      // Fetch real DAO statistics with a small delay
      await delay(REQUEST_DELAY)
      const stats = await fetchDAOStats(address)
      
      const subnameStr = typeof subname === 'string' ? (subname as string) : undefined;
      const dao: DAO = {
        id: address,
        name: name as string,
        description: description as string,
        image: logoUrl_final,
        background: backgroundUrl_final,
        subname: subnameStr,
        chain: subnameStr || 'Cedra',
        tokenName: subnameStr || 'DAO',
        tokenSymbol: subnameStr || 'DAO',
        tvl: '0',
        proposals: stats.proposals,
        members: stats.members,
        established: new Date(parseInt(createdAt as string) * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) + ' at ' + new Date(parseInt(createdAt as string) * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        category: 'featured' as const,
        isFollowing: false
      }
      
      return dao
    } catch (error) {
      console.warn('Failed to process DAO address:', address, error)
      return null
    }
  }

  // Helper function to process DAOs in batches
  const processDAOsInBatches = async (addresses: string[]): Promise<DAO[]> => {
    const foundDAOs: DAO[] = []
    
    
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE)
      
      // Process batch concurrently
      const batchPromises = batch.map(address => processSingleDAO(address))
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Add successful results to foundDAOs
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value !== null) {
          foundDAOs.push(result.value)
        }
      })
      
      // Wait between batches (except for the last batch)
      if (i + BATCH_SIZE < addresses.length) {
        await delay(BATCH_DELAY)
      }
    }
    
    return foundDAOs
  }

  // Helper function to fetch real DAO statistics (members and proposals)
  const fetchDAOStats = async (daoAddress: string): Promise<{ members: number; proposals: number }> => {
    try {
      
      // Small delay to reduce RPC pressure when called in batches
      await delay(100)
      
      const [membersRes, proposalsRes] = await Promise.allSettled([
        cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::membership::total_members`,
            functionArguments: [daoAddress]
          }
        }),
        cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::proposal::get_proposals_count`,
            functionArguments: [daoAddress]
          }
        })
      ])
      
      const memberCount = membersRes.status === 'fulfilled' && Array.isArray(membersRes.value) 
        ? Number(membersRes.value[0] || 0) 
        : 0
      const proposalCount = proposalsRes.status === 'fulfilled' && Array.isArray(proposalsRes.value) 
        ? Number(proposalsRes.value[0] || 0) 
        : 0
      
      
      return { members: memberCount, proposals: proposalCount }
    } catch (error) {
      console.warn(`Failed to fetch stats for DAO ${daoAddress}:`, error)
      return { members: 0, proposals: 0 }
    }
  }

  useEffect(() => {
    fetchDAOs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDAOs])

  return {
    daos,
    isLoading,
    error,
    refetch: () => fetchDAOs(true), // Force refresh when manually triggered
  }
}

// Hook to get DAO count for stats
export function useDAOStats() {
  const [stats, setStats] = useState({
    totalDAOs: 0,
    totalMembers: 0,
    totalProposals: 0,
    activeProposals: 0,
    totalVotes: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Use the main DAO fetcher to get the same DAOs
  const { daos: fetchedDAOs } = useFetchCreatedDAOs()

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      
      // Debug: If no DAOs found, try to check if the problem is with DAO discovery
      if (fetchedDAOs.length === 0) {
        console.warn(' No DAOs found by main fetcher. This could mean:')
        console.warn('   1. No DAOs have been created yet')
        console.warn('   2. Event indexing is not working')
        console.warn('   3. There is an issue with the MODULE_ADDRESS or event types')
        
        // Try to test if view functions work by testing against MODULE_ADDRESS itself
        try {
          await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::membership::total_members` as `${string}::${string}::${string}`,
              functionArguments: [MODULE_ADDRESS]
            }
          })
        } catch (e) {
          console.warn(' View function test failed:', e)
          console.warn('   This suggests either:')
          console.warn('   • No DAO exists at MODULE_ADDRESS (expected)')
          console.warn('   • Contract is not deployed properly')
          console.warn('   • Network/RPC issues')
        }
      }
      
      // Use the DAOs that were already fetched by the main DAO fetcher
      const daoAddresses = fetchedDAOs.map(dao => dao.id)

      // Calculate real stats using blockchain view functions
      const totalDAOs = daoAddresses.length
      let totalMembers = 0
      let totalProposals = 0
      let activeProposals = 0
      let totalVotes = 0

      // Fetch data for each DAO in parallel batches
      const daoBatchSize = 3
      const daoBatches = []
      for (let i = 0; i < daoAddresses.length; i += daoBatchSize) {
        daoBatches.push(daoAddresses.slice(i, i + daoBatchSize))
      }

      // Get active status value once (it's constant)
      const activeStatusRes = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::proposal::get_status_active`,
          functionArguments: []
        }
      }).catch(() => [1])
      const activeStatusValue = Number(activeStatusRes[0] || 1)

      for (const batch of daoBatches) {
        const batchPromises = batch.map(async (daoAddr) => {
          try {
            // Parallel fetch basic DAO stats
            const [membersRes, proposalCountRes] = await Promise.allSettled([
              cedraClient.view({
                payload: {
                  function: `${MODULE_ADDRESS}::membership::total_members`,
                  functionArguments: [daoAddr]
                }
              }),
              cedraClient.view({
                payload: {
                  function: `${MODULE_ADDRESS}::proposal::get_proposals_count`,
                  functionArguments: [daoAddr]
                }
              })
            ])
            
            const memberCount = membersRes.status === 'fulfilled' ? Number(membersRes.value[0] || 0) : 0
            const proposalCount = proposalCountRes.status === 'fulfilled' ? Number(proposalCountRes.value[0] || 0) : 0
            
            let activeCount = 0
            let voteCount = 0
            
            // Fetch proposal data in smaller batches if there are many proposals
            if (proposalCount > 0) {
              const proposalBatchSize = 5
              const proposalBatches = []
              for (let i = 0; i < proposalCount; i += proposalBatchSize) {
                proposalBatches.push(Array.from({ length: Math.min(proposalBatchSize, proposalCount - i) }, (_, idx) => i + idx))
              }
              
              for (const propBatch of proposalBatches) {
                const propPromises = propBatch.map(async (i) => {
                  try {
                    const [statusRes, proposalRes] = await Promise.allSettled([
                      cedraClient.view({
                        payload: {
                          function: `${MODULE_ADDRESS}::proposal::get_proposal_status`,
                          functionArguments: [daoAddr, i]
                        }
                      }),
                      cedraClient.view({
                        payload: {
                          function: `${MODULE_ADDRESS}::proposal::get_proposal`,
                          functionArguments: [daoAddr, i]
                        }
                      })
                    ])
                    
                    const status = statusRes.status === 'fulfilled' ? Number(statusRes.value[0] || 0) : 0
                    const isActive = status === activeStatusValue ? 1 : 0
                    
                    let votes = 0
                    if (proposalRes.status === 'fulfilled' && proposalRes.value?.[0]) {
                      const proposalData = proposalRes.value[0] as any
                      votes = Number(proposalData.yes_votes || 0) + Number(proposalData.no_votes || 0) + Number(proposalData.abstain_votes || 0)
                    }
                    
                    return { isActive, votes }
                  } catch {
                    return { isActive: 0, votes: 0 }
                  }
                })
                
                const propResults = await Promise.allSettled(propPromises)
                propResults.forEach(result => {
                  if (result.status === 'fulfilled') {
                    activeCount += result.value.isActive
                    voteCount += result.value.votes
                  }
                })
              }
            }
            
            return { memberCount, proposalCount, activeCount, voteCount }
          } catch (error) {
            console.warn(`Failed to fetch stats for DAO ${daoAddr}:`, error)
            return { memberCount: 0, proposalCount: 0, activeCount: 0, voteCount: 0 }
          }
        })
        
        const batchResults = await Promise.allSettled(batchPromises)
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            totalMembers += result.value.memberCount
            totalProposals += result.value.proposalCount
            activeProposals += result.value.activeCount
            totalVotes += result.value.voteCount
          }
        })
      }

      setStats({
        totalDAOs,
        totalMembers,
        totalProposals,
        activeProposals,
        totalVotes
      })
    } catch (error) {
      console.error('Error fetching DAO stats:', error)
      // Fallback to basic counting
      setStats({
        totalDAOs: 0,
        totalMembers: 0,
        totalProposals: 0,
        activeProposals: 0,
        totalVotes: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch stats if we have DAOs available
    if (fetchedDAOs.length > 0) {
      fetchStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedDAOs.length]) // Re-run when DAO count changes

  return {
    stats,
    isLoading,
    refetch: fetchStats
  }
}