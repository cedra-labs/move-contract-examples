export const ABI = {
    "address": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8",
    "name": "profile",
    "friends": [],
    "exposed_functions": [
      {
        "name": "check_multiple_profiles_exist",
        "visibility": "public",
        "is_entry": false,
        "is_view": true,
        "generic_type_params": [],
        "params": [
          "vector<address>"
        ],
        "return": [
          "vector<bool>"
        ]
      },
      {
        "name": "create_profile",
        "visibility": "public",
        "is_entry": true,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "0x1::string::String",
          "0x1::string::String"
        ],
        "return": []
      },
      {
        "name": "get_avatar_url",
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
        "name": "get_basic_profile",
        "visibility": "public",
        "is_entry": false,
        "is_view": true,
        "generic_type_params": [],
        "params": [
          "address"
        ],
        "return": [
          "0x1::string::String",
          "0x1::string::String"
        ]
      },
      {
        "name": "get_display_name",
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
        "name": "get_multiple_avatar_urls",
        "visibility": "public",
        "is_entry": false,
        "is_view": true,
        "generic_type_params": [],
        "params": [
          "vector<address>"
        ],
        "return": [
          "vector<0x1::string::String>"
        ]
      },
      {
        "name": "get_multiple_display_names",
        "visibility": "public",
        "is_entry": false,
        "is_view": true,
        "generic_type_params": [],
        "params": [
          "vector<address>"
        ],
        "return": [
          "vector<0x1::string::String>"
        ]
      },
      {
        "name": "get_profile",
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
          "address",
          "u64",
          "u64"
        ]
      },
      {
        "name": "get_profile_for_dao_member_exists",
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
        "name": "get_profile_timestamps",
        "visibility": "public",
        "is_entry": false,
        "is_view": true,
        "generic_type_params": [],
        "params": [
          "address"
        ],
        "return": [
          "u64",
          "u64"
        ]
      },
      {
        "name": "get_wallet_address",
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
        "name": "profile_exists",
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
        "name": "update_avatar_url",
        "visibility": "public",
        "is_entry": true,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "0x1::string::String"
        ],
        "return": []
      },
      {
        "name": "update_display_name",
        "visibility": "public",
        "is_entry": true,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "0x1::string::String"
        ],
        "return": []
      },
      {
        "name": "update_profile",
        "visibility": "public",
        "is_entry": true,
        "is_view": false,
        "generic_type_params": [],
        "params": [
          "&signer",
          "0x1::string::String",
          "0x1::string::String"
        ],
        "return": []
      },
      {
        "name": "validate_profile_for_dao_action",
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
      }
    ],
    "structs": [
      {
        "name": "ProfileCreatedEvent",
        "is_native": false,
        "abilities": [
          "drop",
          "store"
        ],
        "generic_type_params": [],
        "fields": [
          {
            "name": "user_address",
            "type": "address"
          },
          {
            "name": "display_name",
            "type": "0x1::string::String"
          },
          {
            "name": "avatar_url",
            "type": "0x1::string::String"
          },
          {
            "name": "created_at",
            "type": "u64"
          }
        ]
      },
      {
        "name": "ProfileUpdatedEvent",
        "is_native": false,
        "abilities": [
          "drop",
          "store"
        ],
        "generic_type_params": [],
        "fields": [
          {
            "name": "user_address",
            "type": "address"
          },
          {
            "name": "display_name",
            "type": "0x1::string::String"
          },
          {
            "name": "avatar_url",
            "type": "0x1::string::String"
          },
          {
            "name": "updated_at",
            "type": "u64"
          }
        ]
      },
      {
        "name": "UserProfile",
        "is_native": false,
        "abilities": [
          "key"
        ],
        "generic_type_params": [],
        "fields": [
          {
            "name": "display_name",
            "type": "0x1::string::String"
          },
          {
            "name": "avatar_url",
            "type": "0x1::string::String"
          },
          {
            "name": "wallet_address",
            "type": "address"
          },
          {
            "name": "created_at",
            "type": "u64"
          },
          {
            "name": "updated_at",
            "type": "u64"
          }
        ]
      }
    ]
  }