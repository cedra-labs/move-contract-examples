// Error definitions - centralized error codes and helper functions for all DAO modules
module movedao_addrx::errors {
    use std::error;

    // =============================================================================
    // CENTRALIZED ERROR CODES
    // =============================================================================
    // Error codes are organized by module and use ranges to avoid conflicts
    // Range allocation:
    // - Common errors: 1-49
    // - Admin module: 50-99
    // - Membership module: 150-199
    // - Proposal module: 200-299
    // - Staking module: 300-399
    // - Treasury module: 400-449
    // - DAO Core module: 600-649

    // =============================================================================
    // COMMON ERROR CODES (1-49)
    // =============================================================================
    const ENOTHING_TO_CLAIM: u64 = 1;
    const EINSUFFICIENT_BALANCE: u64 = 2;
    const EINSUFFICIENT_PAYMENT: u64 = 3;
    const EINVALID_AMOUNT: u64 = 4;
    const EINVALID_TIME: u64 = 5;
    const EINVALID_STATUS: u64 = 6;
    const EALREADY_EXISTS: u64 = 7;
    const ENOT_FOUND: u64 = 8;
    const ENOT_AUTHORIZED: u64 = 9;
    const ENOT_ADMIN: u64 = 10;
    const EINVALID_ROLE: u64 = 11;
    const EEXPIRATION_PAST: u64 = 12;

    // =============================================================================
    // ADMIN MODULE ERROR CODES (50-99)
    // =============================================================================
    const EADMIN_LIST_EXISTS: u64 = 50;
    const EADMIN_NOT_FOUND: u64 = 51;
    const EMIN_MEMBERS_CONSTRAINT: u64 = 52;
    const EMAX_MEMBERS_CONSTRAINT: u64 = 53;

    // =============================================================================
    // MEMBERSHIP MODULE ERROR CODES (150-199)
    // =============================================================================
    const EMEMBER_EXISTS: u64 = 150;
    const ENOT_MEMBER: u64 = 151;
    const EALREADY_MEMBER: u64 = 152;
    const EMIN_STAKE_REQUIRED: u64 = 153;

    // =============================================================================
    // PROPOSAL MODULE ERROR CODES (200-299)
    // =============================================================================
    const EVOTING_NOT_STARTED: u64 = 200;
    const EVOTING_ENDED: u64 = 201;
    const EALREADY_VOTED: u64 = 202;
    const ENO_SUCH_PROPOSAL: u64 = 203;
    const EQUORUM_NOT_MET: u64 = 204;
    const EEXECUTION_WINDOW_EXPIRED: u64 = 205;
    const ENOT_ADMIN_OR_PROPOSER: u64 = 206;
    const ECANNOT_CANCEL: u64 = 207;
    const EINVALID_VOTE_TYPE: u64 = 208;

    // =============================================================================
    // STAKING MODULE ERROR CODES (300-399)
    // =============================================================================
    const EINSUFFICIENT_STAKE: u64 = 300;
    const EINVALID_UNSTAKE_AMOUNT: u64 = 301;
    const EINVALID_REWARD_AMOUNT: u64 = 302;
    const EINVALID_APY: u64 = 303;
    const EINVALID_VOTE_TIME: u64 = 304;
    const ETIME_LOCK_ACTIVE: u64 = 305;

    // =============================================================================
    // TREASURY MODULE ERROR CODES (400-449)
    // =============================================================================
    const EINSUFFICIENT_TREASURY: u64 = 400;
    const EWITHDRAWAL_LIMIT_EXCEEDED: u64 = 401;
    const EINVALID_FA_METADATA: u64 = 402;
    const EFA_TRANSFER_FAILED: u64 = 403;
    const EINVALID_VAULT_ADDRESS: u64 = 404;

    // =============================================================================
    // DAO CORE MODULE ERROR CODES (600-649)
    // =============================================================================
    const EDAO_ALREADY_EXISTS: u64 = 600;
    const EPROPOSAL_NOT_FOUND: u64 = 602;
    const EPROPOSAL_ALREADY_EXECUTED: u64 = 603;
    const EVOTING_PERIOD_ENDED: u64 = 604;
    const EVOTING_PERIOD_ACTIVE: u64 = 605;
    const EPROPOSAL_NOT_EXECUTED: u64 = 606;
    const EPROPOSAL_NOT_APPROVED: u64 = 607;
    const EUNAUTHORIZED: u64 = 608;
    const EREGISTRY_NOT_INITIALIZED: u64 = 609;
    const ERATE_LIMIT_EXCEEDED: u64 = 610;
    const ESUBNAME_ALREADY_EXISTS: u64 = 611;
    const ESUBNAME_NOT_FOUND: u64 = 612;

    // =============================================================================
    // ERROR HELPER FUNCTIONS
    // =============================================================================

    // Common error functions
    public fun nothing_to_claim(): u64 { ENOTHING_TO_CLAIM }
    public fun insufficient_balance(): u64 { EINSUFFICIENT_BALANCE }
    public fun insufficient_payment(): u64 { EINSUFFICIENT_PAYMENT }
    public fun invalid_amount(): u64 { EINVALID_AMOUNT }
    public fun invalid_time(): u64 { EINVALID_TIME }
    public fun invalid_status(): u64 { EINVALID_STATUS }
    public fun already_exists(): u64 { EALREADY_EXISTS }
    public fun not_found(): u64 { ENOT_FOUND }
    public fun not_authorized(): u64 { ENOT_AUTHORIZED }
    public fun not_admin(): u64 { ENOT_ADMIN }
    public fun invalid_role(): u64 { EINVALID_ROLE }
    public fun expiration_past(): u64 { EEXPIRATION_PAST }

    // Admin module errors
    public fun admin_list_exists(): u64 { EADMIN_LIST_EXISTS }
    public fun admin_not_found(): u64 { EADMIN_NOT_FOUND }
    public fun min_members_constraint(): u64 { EMIN_MEMBERS_CONSTRAINT }
    public fun max_members_constraint(): u64 { EMAX_MEMBERS_CONSTRAINT }

    // Membership module errors
    public fun member_exists(): u64 { EMEMBER_EXISTS }
    public fun not_member(): u64 { ENOT_MEMBER }
    public fun already_member(): u64 { EALREADY_MEMBER }
    public fun min_stake_required(): u64 { EMIN_STAKE_REQUIRED }

    // Proposal module errors
    public fun voting_not_started(): u64 { EVOTING_NOT_STARTED }
    public fun voting_ended(): u64 { EVOTING_ENDED }
    public fun already_voted(): u64 { EALREADY_VOTED }
    public fun no_such_proposal(): u64 { ENO_SUCH_PROPOSAL }
    public fun quorum_not_met(): u64 { EQUORUM_NOT_MET }
    public fun execution_window_expired(): u64 { EEXECUTION_WINDOW_EXPIRED }
    public fun not_admin_or_proposer(): u64 { ENOT_ADMIN_OR_PROPOSER }
    public fun cannot_cancel(): u64 { ECANNOT_CANCEL }
    public fun invalid_vote_type(): u64 { EINVALID_VOTE_TYPE }

    // Staking module errors
    public fun insufficient_stake(): u64 { EINSUFFICIENT_STAKE }
    public fun invalid_unstake_amount(): u64 { EINVALID_UNSTAKE_AMOUNT }
    public fun invalid_reward_amount(): u64 { EINVALID_REWARD_AMOUNT }
    public fun invalid_apy(): u64 { EINVALID_APY }
    public fun invalid_vote_time(): u64 { EINVALID_VOTE_TIME }
    public fun time_lock_active(): u64 { ETIME_LOCK_ACTIVE }

    // Treasury module errors
    public fun insufficient_treasury(): u64 { EINSUFFICIENT_TREASURY }
    public fun withdrawal_limit_exceeded(): u64 { EWITHDRAWAL_LIMIT_EXCEEDED }
    public fun invalid_fa_metadata(): u64 { EINVALID_FA_METADATA }
    public fun fa_transfer_failed(): u64 { EFA_TRANSFER_FAILED }
    public fun invalid_vault_address(): u64 { EINVALID_VAULT_ADDRESS }

    // DAO core module errors
    public fun dao_already_exists(): u64 { EDAO_ALREADY_EXISTS }
    public fun proposal_not_found(): u64 { EPROPOSAL_NOT_FOUND }
    public fun proposal_already_executed(): u64 { EPROPOSAL_ALREADY_EXECUTED }
    public fun voting_period_ended(): u64 { EVOTING_PERIOD_ENDED }
    public fun voting_period_active(): u64 { EVOTING_PERIOD_ACTIVE }
    public fun proposal_not_executed(): u64 { EPROPOSAL_NOT_EXECUTED }
    public fun proposal_not_approved(): u64 { EPROPOSAL_NOT_APPROVED }
    public fun unauthorized(): u64 { EUNAUTHORIZED }
    public fun registry_not_initialized(): u64 { EREGISTRY_NOT_INITIALIZED }
    public fun rate_limit_exceeded(): u64 { ERATE_LIMIT_EXCEEDED }
    public fun subname_already_exists(): u64 { ESUBNAME_ALREADY_EXISTS }
    public fun subname_not_found(): u64 { ESUBNAME_NOT_FOUND }

    // =============================================================================
    // ADVANCED ERROR HELPER FUNCTIONS
    // =============================================================================

    // Create structured error codes for different error categories
    public fun abort_with(error_code: u64): u64 {
        error::invalid_argument(error_code)
    }

    public fun permission_denied(error_code: u64): u64 {
        error::permission_denied(error_code)
    }

    public fun already_exists_error(error_code: u64): u64 {
        error::already_exists(error_code)
    }

    public fun not_found_error(error_code: u64): u64 {
        error::not_found(error_code)
    }

    public fun invalid_state(error_code: u64): u64 {
        error::invalid_state(error_code)
    }

    // Convenience functions for common abort patterns
    public fun require_admin(condition: bool) {
        assert!(condition, permission_denied(not_admin()));
    }

    public fun require_member(condition: bool) {
        assert!(condition, permission_denied(not_member()));
    }

    public fun require_authorized(condition: bool) {
        assert!(condition, permission_denied(not_authorized()));
    }

    public fun require_valid_amount(condition: bool) {
        assert!(condition, abort_with(invalid_amount()));
    }

    public fun require_sufficient_balance(condition: bool) {
        assert!(condition, abort_with(insufficient_balance()));
    }

    public fun require_not_exists(condition: bool, error_code: u64) {
        assert!(condition, already_exists_error(error_code));
    }

    public fun require_exists(condition: bool, error_code: u64) {
        assert!(condition, not_found_error(error_code));
    }
}