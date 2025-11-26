export const ABI = {
  "address": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8",
  "name": "dao_core_file",
  "friends": [],
  "exposed_functions": [
    {
      "name": "add_dao_to_registry",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "check_and_init_registry",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": []
    },
    {
      "name": "create_dao",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "vector<u8>",
        "vector<u8>",
        "u64",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "create_dao_mixed",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "u64",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "create_dao_with_urls",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "create_image_from_data",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "vector<u8>"
      ],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::ImageData"
      ]
    },
    {
      "name": "create_image_from_url",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "0x1::string::String"
      ],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::ImageData"
      ]
    },
    {
      "name": "dao_exists",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "execute_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "finalize_council_created_dao",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_all_dao_addresses",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_all_daos",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::DAOSummary>"
      ]
    },
    {
      "name": "get_dao_all_links",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String"
      ]
    },
    {
      "name": "get_dao_category",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_dao_creation_proposal",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "u64",
        "address",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u64",
        "u64",
        "u64",
        "bool",
        "bool"
      ]
    },
    {
      "name": "get_dao_creation_proposal_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_dao_discord_link",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_dao_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String",
        "0x1::string::String",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ]
    },
    {
      "name": "get_dao_info_legacy",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String",
        "0x1::string::String",
        "vector<u8>",
        "vector<u8>",
        "u64"
      ]
    },
    {
      "name": "get_dao_info_with_subname",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "bool",
        "0x1::string::String",
        "vector<u8>",
        "u64"
      ]
    },
    {
      "name": "get_dao_telegram_link",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_dao_website",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_dao_x_link",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_daos_created_by",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_daos_joined_by",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_daos_paginated",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": [
        "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::DAOSummary>"
      ]
    },
    {
      "name": "get_subname_owner",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::string::String"
      ],
      "return": [
        "address"
      ]
    },
    {
      "name": "get_total_dao_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_total_subnames",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_treasury_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ]
    },
    {
      "name": "get_user_daos",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>",
        "vector<address>"
      ]
    },
    {
      "name": "has_voted_on_dao_creation",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "init_council_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "u64"
      ],
      "return": []
    },
    {
      "name": "init_dao_registry",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": []
    },
    {
      "name": "is_dao_creation_registry_initialized",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_registry_functional",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_registry_initialized",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_subname_registry_initialized",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_subname_taken",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::string::String"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "propose_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "vector<u8>",
        "vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "propose_dao_creation_with_urls",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "0x1::string::String",
        "u64"
      ],
      "return": []
    },
    {
      "name": "vote_on_dao_creation",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64",
        "bool"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "CouncilDAOCreated",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedao_addrxess",
          "type": "address"
        },
        {
          "name": "creating_council",
          "type": "address"
        },
        {
          "name": "proposal_id",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "yes_votes",
          "type": "u64"
        },
        {
          "name": "total_council_size",
          "type": "u64"
        }
      ]
    },
    {
      "name": "CouncilDAOCreationRegistry",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "proposals",
          "type": "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::DAOCreationProposalData>"
        },
        {
          "name": "next_proposal_id",
          "type": "u64"
        },
        {
          "name": "voting_duration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOCreated",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedao_addrxess",
          "type": "address"
        },
        {
          "name": "creator",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOCreationProposal",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "proposal_id",
          "type": "u64"
        },
        {
          "name": "proposing_council",
          "type": "address"
        },
        {
          "name": "proposer",
          "type": "address"
        },
        {
          "name": "target_movedao_addrxess",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOCreationProposalData",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "proposer",
          "type": "address"
        },
        {
          "name": "target_movedao_addrxess",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "logo",
          "type": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::ImageData"
        },
        {
          "name": "background",
          "type": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::ImageData"
        },
        {
          "name": "min_stake_to_join",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "voting_deadline",
          "type": "u64"
        },
        {
          "name": "yes_votes",
          "type": "u64"
        },
        {
          "name": "no_votes",
          "type": "u64"
        },
        {
          "name": "voted_members",
          "type": "vector<address>"
        },
        {
          "name": "executed",
          "type": "bool"
        },
        {
          "name": "approved",
          "type": "bool"
        },
        {
          "name": "x_link",
          "type": "0x1::string::String"
        },
        {
          "name": "discord_link",
          "type": "0x1::string::String"
        },
        {
          "name": "telegram_link",
          "type": "0x1::string::String"
        },
        {
          "name": "website",
          "type": "0x1::string::String"
        },
        {
          "name": "category",
          "type": "0x1::string::String"
        }
      ]
    },
    {
      "name": "DAOInfo",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "subname",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "logo",
          "type": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::ImageData"
        },
        {
          "name": "background",
          "type": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file::ImageData"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "treasury",
          "type": "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
        },
        {
          "name": "x_link",
          "type": "0x1::string::String"
        },
        {
          "name": "discord_link",
          "type": "0x1::string::String"
        },
        {
          "name": "telegram_link",
          "type": "0x1::string::String"
        },
        {
          "name": "website",
          "type": "0x1::string::String"
        },
        {
          "name": "category",
          "type": "0x1::string::String"
        }
      ]
    },
    {
      "name": "DAORegistered",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "dao_address",
          "type": "address"
        },
        {
          "name": "registered_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAORegistry",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "dao_addresses",
          "type": "vector<address>"
        },
        {
          "name": "total_daos",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DAOSummary",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "address",
          "type": "address"
        },
        {
          "name": "name",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "created_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ImageData",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "copy",
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "is_url",
          "type": "bool"
        },
        {
          "name": "url",
          "type": "0x1::string::String"
        },
        {
          "name": "data",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "SubnameRegistry",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "used_subnames",
          "type": "0x1::simple_map::SimpleMap<0x1::string::String, address>"
        },
        {
          "name": "total_subnames",
          "type": "u64"
        }
      ]
    }
  ]
}

// ============================================================================
// HELPER FUNCTIONS FOR CEDRA SDK
// ============================================================================

/**
 * Get the full function path for a view or entry function
 * @param functionName - The name of the function from the ABI
 * @returns Full function path in format: address::module::function
 *
 * @example
 * const func = getFunction('create_dao');
 * // Returns: "0x9fc...::dao_core_file::create_dao"
 */
export const getFunction = (functionName: string): string => {
  return `${ABI.address}::${ABI.name}::${functionName}`;
};

/**
 * Get the resource type path
 * @param structName - The name of the struct from the ABI
 * @returns Full resource type path
 *
 * @example
 * const resourceType = getResourceType('DAOInfo');
 * // Returns: "0x9fc...::dao_core_file::DAOInfo"
 */
export const getResourceType = (structName: string): string => {
  return `${ABI.address}::${ABI.name}::${structName}`;
};

/**
 * Get the event type for DAOCreated events
 * @returns Event type string for use with Cedra GraphQL indexer
 *
 * @example
 * const eventType = getDAOCreatedEventType();
 * // Use with GraphQL indexer
 */
export const getDAOCreatedEventType = (): string => {
  return `${ABI.address}::${ABI.name}::DAOCreated`;
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const DAO_FUNCTIONS = {
  CREATE_DAO: getFunction('create_dao'),
  CREATE_DAO_WITH_URLS: getFunction('create_dao_with_urls'),
  CREATE_DAO_MIXED: getFunction('create_dao_mixed'),
  GET_DAO_INFO: getFunction('get_dao_info_with_subname'),
  GET_TOTAL_DAO_COUNT: getFunction('get_total_dao_count'),
  GET_ALL_DAO_ADDRESSES: getFunction('get_all_dao_addresses'),
  IS_SUBNAME_TAKEN: getFunction('is_subname_taken'),
  GET_SUBNAME_OWNER: getFunction('get_subname_owner'),
  DAO_EXISTS: getFunction('dao_exists'),
  IS_REGISTRY_INITIALIZED: getFunction('is_registry_initialized'),
} as const;

export const DAO_RESOURCES = {
  DAO_INFO: getResourceType('DAOInfo'),
  DAO_REGISTRY: getResourceType('DAORegistry'),
  SUBNAME_REGISTRY: getResourceType('SubnameRegistry'),
} as const;

export const DAO_EVENTS = {
  DAO_CREATED: getDAOCreatedEventType(),
} as const;