/**
 * Service for Cedra Network
 *
 * Handles TradePort integration and key management
 * Uses Cedra SDK for blockchain interactions
 *
 * @see https://docs.cedra.network/sdks/typescript-sdk
 */

import { useState, useEffect } from "react";

const TRADEPORT_KEYS_COLLECTION_ID = "";
const INDEXER_URL = "https://graphql.cedra.dev/v1/graphql";

const query = `
  query GetTradePortKeys($address: String, $collectionId: String) {
    current_token_ownerships_v2(
      where: {
        owner_address: { _eq: $address }
        amount: { _gt: "0" }
        current_token_data: {
          current_collection: {
            collection_id: { _eq: $collectionId }
          }
        }
      }
    ) {
      current_token_data {
        collection_id
        token_name
        token_data_id
        token_uri
        current_collection {
          collection_id
          collection_name
          description
          creator_address
          uri
        }
      }
      owner_address
      amount
    }
  }
`;

async function graphqlRequest(url: string, query: string, variables: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data;
}

export function useTradePortKeys(address?: string | null) {
  const [data, setData] = useState<{ hasNFT: boolean; nfts: any[]; count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setData({ hasNFT: false, nfts: [], count: 0 });
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchNFTs = async () => {
      try {
        setIsLoading(true);

        const res = await graphqlRequest(INDEXER_URL, query, {
          address,
          collectionId: TRADEPORT_KEYS_COLLECTION_ID,
        });

        const ownerships = res.current_token_ownerships_v2;

        if (!cancelled) {
          setData({
            hasNFT: ownerships && ownerships.length > 0,
            nfts: ownerships || [],
            count: ownerships?.length || 0,
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching Smurf NFTs:", error);
        if (!cancelled) {
          setData({ hasNFT: false, nfts: [], count: 0 });
          setIsLoading(false);
        }
      }
    };

    fetchNFTs();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return {
    data: data || { hasNFT: false, nfts: [], count: 0 },
    isLoading
  };
}
