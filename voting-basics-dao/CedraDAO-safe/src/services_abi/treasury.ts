export const ABI = {
  "address": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8",
  "name": "treasury",
  "friends": [
    "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::dao_core_file"
  ],
  "exposed_functions": [
    {
      "name": "deposit",
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
      "name": "withdraw",
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
      "name": "get_balance",
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
      "name": "allows_public_deposits",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "can_withdraw_amount",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>",
        "u64"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "create_dao_vault",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>",
        "0x1::object::Object<0x1::fungible_asset::Metadata>"
      ],
      "return": []
    },
    {
      "name": "deposit_to_dao_vault",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "deposit_to_object_typed",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [
        {
          "constraints": []
        }
      ],
      "params": [
        "&signer",
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_all_vaults_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_balance_from_object",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_daily_withdrawal_status",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "u64",
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_dao_vaults",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_treasury_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "u64",
        "u64",
        "u64",
        "u64",
        "address",
        "bool"
      ]
    },
    {
      "name": "get_vault_asset_decimals",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_vault_asset_icon_uri",
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
      "name": "get_vault_asset_maximum",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::option::Option<u128>"
      ]
    },
    {
      "name": "get_vault_asset_name",
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
      "name": "get_vault_asset_project_uri",
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
      "name": "get_vault_asset_supply",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::option::Option<u128>"
      ]
    },
    {
      "name": "get_vault_asset_symbol",
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
      "name": "get_vault_balance",
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
      "name": "get_vault_dao_address",
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
      "name": "get_vault_info",
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
        "u8",
        "u64",
        "address"
      ]
    },
    {
      "name": "get_vault_maximum_or_zero",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u128"
      ]
    },
    {
      "name": "get_vault_metadata",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "0x1::object::Object<0x1::fungible_asset::Metadata>"
      ]
    },
    {
      "name": "get_vault_supply_or_zero",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "u128"
      ]
    },
    {
      "name": "get_vaults_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "init_treasury",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": [
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>"
      ]
    },
    {
      "name": "set_public_deposits",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>",
        "bool"
      ],
      "return": []
    },
    {
      "name": "user_deposit_to_vault",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "u64"
      ],
      "return": []
    },
    {
      "name": "vault_exists",
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
      "name": "withdraw_from_dao_vault",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "address",
        "u64",
        "address"
      ],
      "return": []
    },
    {
      "name": "withdraw_from_object",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "0x1::object::Object<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::treasury::Treasury>",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "DAOVaultRegistry",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "vaults",
          "type": "vector<address>"
        }
      ]
    },
    {
      "name": "ReentrancyGuard",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "locked",
          "type": "bool"
        }
      ]
    },
    {
      "name": "TokenVault",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "dao_address",
          "type": "address"
        },
        {
          "name": "fa_metadata",
          "type": "0x1::object::Object<0x1::fungible_asset::Metadata>"
        },
        {
          "name": "store",
          "type": "0x1::object::Object<0x1::fungible_asset::FungibleStore>"
        }
      ]
    },
    {
      "name": "Treasury",
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
          "name": "daily_withdrawal_limit",
          "type": "u64"
        },
        {
          "name": "last_withdrawal_day",
          "type": "u64"
        },
        {
          "name": "daily_withdrawn",
          "type": "u64"
        },
        {
          "name": "movedao_addrxess",
          "type": "address"
        },
        {
          "name": "allow_public_deposits",
          "type": "bool"
        },
        {
          "name": "last_major_withdrawal_time",
          "type": "u64"
        }
      ]
    },
    {
      "name": "TreasuryDepositEvent",
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
          "name": "depositor",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "new_balance",
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
      "name": "TreasuryRewardWithdrawalEvent",
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
          "name": "recipient",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "remaining_balance",
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
      "name": "TreasuryWithdrawalEvent",
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
          "name": "withdrawer",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "remaining_balance",
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
    }
  ]
}