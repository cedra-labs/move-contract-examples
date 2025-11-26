export const ABI = {
  "address": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8",
  "name": "staking",
  "friends": [],
  "exposed_functions": [
    {
      "name": "stake",
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
      "name": "vote",
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
    },
    {
      "name": "create_vote",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::string::String",
        "0x1::string::String",
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "declare_winner",
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
      "name": "get_all_stakers",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<address>",
        "vector<u64>"
      ]
    },
    {
      "name": "get_dao_stake_direct",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_dao_staked_balance",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_staked_balance",
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
      "name": "get_staker_amount",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_staker_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_total_staked",
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
      "name": "get_vault_addr",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "address"
      ]
    },
    {
      "name": "init_staking",
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
      "name": "is_dao_staker",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_registered_staker",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_staker",
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
      "name": "is_staking_initialized",
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
      "name": "repair_staker_sync",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address"
      ],
      "return": []
    },
    {
      "name": "unstake",
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
      "name": "validate_staker_sync",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool"
      ]
    }
  ],
  "structs": [
    {
      "name": "Vote",
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
          "name": "title",
          "type": "0x1::string::String"
        },
        {
          "name": "description",
          "type": "0x1::string::String"
        },
        {
          "name": "start_time",
          "type": "u64"
        },
        {
          "name": "end_time",
          "type": "u64"
        },
        {
          "name": "total_yes_votes",
          "type": "u64"
        },
        {
          "name": "total_no_votes",
          "type": "u64"
        },
        {
          "name": "completed",
          "type": "bool"
        },
        {
          "name": "voters",
          "type": "0x1::table::Table<address, 0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::staking::VoteRecord>"
        }
      ]
    },
    {
      "name": "DAOStakeInfo",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "staked_balance",
          "type": "u64"
        },
        {
          "name": "last_stake_time",
          "type": "u64"
        }
      ]
    },
    {
      "name": "RewardClaimedEvent",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedao_addrx",
          "type": "address"
        },
        {
          "name": "staker",
          "type": "address"
        },
        {
          "name": "reward_amount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "StakeEvent",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedao_addrx",
          "type": "address"
        },
        {
          "name": "staker",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "total_staked",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "StakerProfile",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "dao_stakes",
          "type": "0x1::table::Table<address, 0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::staking::DAOStakeInfo>"
        },
        {
          "name": "total_staked",
          "type": "u64"
        }
      ]
    },
    {
      "name": "StakerRegistry",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "stakers",
          "type": "0x1::table::Table<address, u64>"
        },
        {
          "name": "total_stakers",
          "type": "u64"
        }
      ]
    },
    {
      "name": "UnstakeEvent",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "movedao_addrx",
          "type": "address"
        },
        {
          "name": "staker",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "remaining_staked",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        },
        {
          "name": "transaction_hash",
          "type": "vector<u8>"
        }
      ]
    },
    {
      "name": "Vault",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "balance",
          "type": "0x1::coin::Coin<0x1::cedra_coin::CedraCoin>"
        },
        {
          "name": "extend_ref",
          "type": "0x1::object::ExtendRef"
        }
      ]
    },
    {
      "name": "VoteRecord",
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
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "u64"
        }
      ]
    },
    {
      "name": "VoteRepository",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "store",
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "votes",
          "type": "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::staking::Vote>"
        }
      ]
    }
  ]
}