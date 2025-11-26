export const ABI = {
  "address": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8",
  "name": "proposal",
  "friends": [],
  "exposed_functions": [
    {
      "name": "create_proposal",
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
        "u64",
        "u64",
        "u64"
      ],
      "return": []
    },
    {
      "name": "get_proposal",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::Proposal"
      ]
    },
    {
      "name": "is_yes_vote",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "activate_proposal",
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
      "name": "can_user_create_proposals",
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
      "name": "can_user_finalize_proposals",
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
      "name": "cancel_proposal",
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
      "name": "cast_vote",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address",
        "u64",
        "u8"
      ],
      "return": []
    },
    {
      "name": "check_voting_eligibility",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool",
        "u64",
        "bool",
        "u8"
      ]
    },
    {
      "name": "debug_user_status",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool",
        "bool",
        "u8",
        "u64"
      ]
    },
    {
      "name": "execute_proposal",
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
      "name": "finalize_proposal",
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
      "name": "get_all_proposals",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address"
      ],
      "return": [
        "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::Proposal>"
      ]
    },
    {
      "name": "get_proposal_detailed_info",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "0x1::string::String",
        "0x1::string::String",
        "address",
        "u8",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_proposal_details",
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
        "0x1::string::String",
        "0x1::string::String",
        "address",
        "u8",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "u64",
        "bool",
        "bool",
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_proposal_roles",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "u8",
        "vector<u8>"
      ]
    },
    {
      "name": "get_proposal_status",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_proposal_vote_count",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_proposal_voters",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "vector<address>"
      ]
    },
    {
      "name": "get_proposal_votes_count",
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
        "u64",
        "u64"
      ]
    },
    {
      "name": "get_proposal_votes_detailed",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "vector<address>",
        "vector<u8>",
        "vector<u64>",
        "vector<u64>"
      ]
    },
    {
      "name": "get_proposals_count",
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
      "name": "get_role_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_role_member",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_role_super_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_active",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_cancelled",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_draft",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_executed",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_passed",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_rejected",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_status_value",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_user_permissions",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "bool",
        "bool",
        "bool",
        "bool",
        "bool"
      ]
    },
    {
      "name": "get_user_status_code",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_user_status_detailed",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_user_status_in_dao",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_user_status_string",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "address"
      ],
      "return": [
        "0x1::string::String"
      ]
    },
    {
      "name": "get_user_vote_on_proposal",
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
        "bool",
        "u8",
        "u64"
      ]
    },
    {
      "name": "get_vote_abstain",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_vote_no",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_vote_type_value",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ],
      "return": [
        "u8"
      ]
    },
    {
      "name": "get_vote_yes",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "u8"
      ]
    },
    {
      "name": "has_proposals",
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
      "name": "has_user_voted_on_proposal",
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
      "name": "initialize_proposals",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer"
      ],
      "return": []
    },
    {
      "name": "is_abstain_vote",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_active",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_cancelled",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_draft",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_executed",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_no_vote",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_passed",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_proposal_approved_by_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_proposal_finalized_by_admin",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "address",
        "u64"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_rejected",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ],
      "return": [
        "bool"
      ]
    },
    {
      "name": "is_user_admin",
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
      "name": "is_user_member",
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
      "name": "start_voting",
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
      "name": "status_active",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ]
    },
    {
      "name": "status_cancelled",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ]
    },
    {
      "name": "status_draft",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ]
    },
    {
      "name": "status_executed",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ]
    },
    {
      "name": "status_passed",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ]
    },
    {
      "name": "status_rejected",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
      ]
    },
    {
      "name": "vote_abstain",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ]
    },
    {
      "name": "vote_no",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ]
    },
    {
      "name": "vote_yes",
      "visibility": "public",
      "is_entry": false,
      "is_view": false,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
      ]
    }
  ],
  "structs": [
    {
      "name": "Proposal",
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
          "name": "proposer",
          "type": "address"
        },
        {
          "name": "proposer_role",
          "type": "u8"
        },
        {
          "name": "status",
          "type": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::ProposalStatus"
        },
        {
          "name": "votes",
          "type": "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::Vote>"
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
          "name": "abstain_votes",
          "type": "u64"
        },
        {
          "name": "created_at",
          "type": "u64"
        },
        {
          "name": "voting_start",
          "type": "u64"
        },
        {
          "name": "voting_end",
          "type": "u64"
        },
        {
          "name": "execution_window",
          "type": "u64"
        },
        {
          "name": "min_quorum_percent",
          "type": "u64"
        },
        {
          "name": "approved_by_admin",
          "type": "bool"
        },
        {
          "name": "finalized_by_admin",
          "type": "bool"
        },
        {
          "name": "constant_member_list",
          "type": "vector<address>"
        }
      ]
    },
    {
      "name": "Vote",
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
          "name": "voter",
          "type": "address"
        },
        {
          "name": "voter_role",
          "type": "u8"
        },
        {
          "name": "vote_type",
          "type": "0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::VoteType"
        },
        {
          "name": "weight",
          "type": "u64"
        },
        {
          "name": "voted_at",
          "type": "u64"
        }
      ]
    },
    {
      "name": "DaoProposals",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "proposals",
          "type": "vector<0x9fc26ce453f4f1e9a7486353830505a32a12c51a59f24734cf8502d94f28a6a8::proposal::Proposal>"
        },
        {
          "name": "next_id",
          "type": "u64"
        },
        {
          "name": "proposal_fee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "ProposalActivatedEvent",
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
          "name": "activated_by",
          "type": "address"
        },
        {
          "name": "admin_role",
          "type": "u8"
        }
      ]
    },
    {
      "name": "ProposalCreatedEvent",
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
          "name": "proposer",
          "type": "address"
        },
        {
          "name": "proposer_role",
          "type": "u8"
        },
        {
          "name": "title",
          "type": "0x1::string::String"
        }
      ]
    },
    {
      "name": "ProposalFinalizedEvent",
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
          "name": "finalized_by",
          "type": "address"
        },
        {
          "name": "admin_role",
          "type": "u8"
        },
        {
          "name": "final_status",
          "type": "u8"
        }
      ]
    },
    {
      "name": "ProposalStatus",
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
          "name": "value",
          "type": "u8"
        }
      ]
    },
    {
      "name": "ProposalStatusChangedEvent",
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
          "name": "old_status",
          "type": "u8"
        },
        {
          "name": "new_status",
          "type": "u8"
        },
        {
          "name": "reason",
          "type": "0x1::string::String"
        }
      ]
    },
    {
      "name": "ProposerRecord",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "last_proposal_time",
          "type": "u64"
        },
        {
          "name": "proposal_count",
          "type": "u64"
        }
      ]
    },
    {
      "name": "VoteCastEvent",
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
          "name": "voter",
          "type": "address"
        },
        {
          "name": "voter_role",
          "type": "u8"
        },
        {
          "name": "vote_type",
          "type": "u8"
        },
        {
          "name": "weight",
          "type": "u64"
        }
      ]
    },
    {
      "name": "VoteType",
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
          "name": "value",
          "type": "u8"
        }
      ]
    }
  ]
}