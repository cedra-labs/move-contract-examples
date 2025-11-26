export const ABI = {
  "address": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8",
  "name": "input_validation",
  "friends": [],
  "exposed_functions": [
    {
      "name": "get_max_council_size",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_max_description_length",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_max_name_length",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_min_description_length",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_min_name_length",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u64"
      ]
    },
    {
      "name": "validate_address_list",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&vector<address>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_allocation_percentages",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&vector<u64>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_background",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&vector<u8>"
      ],
      "return": []
    },
    {
      "name": "validate_council_size",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_dao_description",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "validate_dao_name",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "validate_image_size",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&vector<u8>",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_image_url",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x1::string::String"
      ],
      "return": []
    },
    {
      "name": "validate_logo",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&vector<u8>"
      ],
      "return": []
    },
    {
      "name": "validate_percentage",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_quorum_percentage",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_staking_amount",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_string_length",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x1::string::String",
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_tier",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u8"
      ],
      "return": []
    },
    {
      "name": "validate_token_price",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_token_supply",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64"
      ],
      "return": []
    },
    {
      "name": "validate_voting_period_bounds",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "u64",
        "u64"
      ],
      "return": []
    }
  ],
  "structs": []
}