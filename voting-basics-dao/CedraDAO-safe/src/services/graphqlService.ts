interface FungibleAssetInfo {
  symbol: string;
  name: string;
  decimals: number;
  asset_type: string;
}

interface GraphQLResponse {
  data: {
    fungible_asset_metadata: FungibleAssetInfo[];
  };
}

const GRAPHQL_ENDPOINT = 'https://graphql.cedra.dev/v1/graphql';

export const fetchFungibleAssetInfo = async (assetTypes: string[]): Promise<FungibleAssetInfo[]> => {
  const query = `
    query GetFungibleAssetInfo($in: [String!], $offset: Int) {
      fungible_asset_metadata(
        where: { asset_type: { _in: $in } }
        offset: $offset
        limit: 100
      ) {
        symbol
        name
        decimals
        asset_type
        __typename
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          in: assetTypes,
          offset: 0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result: GraphQLResponse = await response.json();
    return result.data.fungible_asset_metadata || [];
  } catch (error) {
    console.error('Failed to fetch fungible asset info:', error);
    return [];
  }
};

export const fetchSingleAssetInfo = async (assetType: string): Promise<FungibleAssetInfo | null> => {
  const results = await fetchFungibleAssetInfo([assetType]);
  return results.length > 0 ? results[0] : null;
};

/**
 * Fetch DAO creation events from Cedra GraphQL indexer
 * Fetches all types of DAO creation events: DAOCreated, CouncilDAOCreated, and DAORegistered
 * @param moduleAddress - The module address to filter events
 * @param eventType - Optional event type to filter (defaults to fetching all DAO-related events)
 * @returns Array of DAO addresses from events
 */
export const fetchDAOCreationEvents = async (
  moduleAddress: string,
  eventType?: string
): Promise<string[]> => {
  // If specific event type provided, use it; otherwise fetch all DAO creation event types
  const eventTypes = eventType 
    ? [eventType]
    : ['DAOCreated', 'CouncilDAOCreated', 'DAORegistered'];
  
  // Build event type patterns - try both with and without full module path
  const eventPatterns = eventTypes.flatMap(et => [
    `%${moduleAddress}::dao_core_file::${et}%`,  // Full path
    `%${et}%`                                     // Just event name
  ]);
  
  // Build GraphQL query with multiple event type patterns
  const orConditions = eventPatterns.map((_, index) => 
    `{ type: { _like: $eventType${index + 1} } }`
  ).join(', ');
  
  const variables: Record<string, string> = {};
  eventPatterns.forEach((pattern, index) => {
    variables[`eventType${index + 1}`] = pattern;
  });
  
  const query = `
    query GetDAOCreationEvents(${eventPatterns.map((_, i) => `$eventType${i + 1}: String!`).join(', ')}) {
      events(
        where: { 
          _or: [
            ${orConditions}
          ]
        }
        order_by: { transaction_version: desc }
        limit: 1000
      ) {
        data
        type
        transaction_version
      }
    }
  `;

  try {
    console.log('🔍 Fetching DAO creation events from GraphQL...', { 
      moduleAddress, 
      eventTypes,
      eventPatterns 
    });
    
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GraphQL request failed:', response.status, errorText);
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
    }

    if (!result.data || !result.data.events) {
      console.warn('⚠️ No events found in GraphQL response');
      return [];
    }
    
    console.log(`📊 Found ${result.data.events.length} events from GraphQL`);

    // Extract DAO addresses from event data
    // The event data structure contains movedao_addrxess field (note the double 's')
    // Try multiple field name variations for compatibility
    const daoAddresses: string[] = [];
    
    for (let i = 0; i < result.data.events.length; i++) {
      const event = result.data.events[i];
      const eventData = event.data || {};
      
      // Log the event structure for debugging
      console.log(`🔍 Event ${i + 1}/${result.data.events.length}:`, {
        type: event.type,
        dataKeys: Object.keys(eventData),
        data: eventData
      });
      
      // Try different field name variations based on event type
      let daoAddress: string | undefined;
      
      // Check event type to determine which field to use
      if (event.type?.includes('DAORegistered')) {
        // DAORegistered event uses dao_address (standard naming)
        daoAddress = 
          eventData.dao_address ||
          eventData.address ||
          eventData.movedao_addrxess ||
          eventData.movedao_addrx ||
          eventData.movedao_address;
      } else if (event.type?.includes('DAOCreated') || event.type?.includes('CouncilDAOCreated')) {
        // DAOCreated and CouncilDAOCreated events use movedao_addrxess (typo with double 's')
        daoAddress = 
          eventData.movedao_addrxess ||  // Correct field name from ABI (typo with double 's')
          eventData.movedao_addrx ||     // Alternative spelling
          eventData.movedao_address ||   // Alternative spelling
          eventData.dao_address ||       // Generic fallback
          eventData.address;             // Generic fallback
      } else {
        // Try all variations for unknown event types
        daoAddress = 
          eventData.movedao_addrxess ||
          eventData.movedao_addrx ||
          eventData.movedao_address ||
          eventData.dao_address ||
          eventData.address;
      }
      
      if (daoAddress && typeof daoAddress === 'string' && daoAddress.trim() !== '') {
        // Ensure it's a valid address format (starts with 0x)
        const normalizedAddress = daoAddress.startsWith('0x') 
          ? daoAddress.toLowerCase().trim()
          : `0x${daoAddress.toLowerCase().trim()}`;
        
        // Validate it looks like an address (hex string of appropriate length)
        if (normalizedAddress.length >= 42 && /^0x[0-9a-f]+$/i.test(normalizedAddress)) {
          if (!daoAddresses.includes(normalizedAddress)) {
            daoAddresses.push(normalizedAddress);
            console.log(`✅ Extracted DAO address from event ${i + 1}: ${normalizedAddress}`);
          } else {
            console.log(`⏭️ Duplicate DAO address from event ${i + 1}: ${normalizedAddress}`);
          }
        } else {
          console.warn(`⚠️ Invalid address format from event ${i + 1}: ${normalizedAddress}`);
        }
      } else {
        console.warn(`⚠️ Could not extract DAO address from event ${i + 1}. Event data:`, JSON.stringify(eventData, null, 2));
      }
    }
    
    console.log(`📊 Found ${daoAddresses.length} unique DAOs from ${result.data.events.length} GraphQL events`);
    return daoAddresses;

  } catch (error) {
    console.error('Failed to fetch DAO creation events:', error);
    return [];
  }
};