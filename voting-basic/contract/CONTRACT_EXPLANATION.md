# Community Voting Contract - Line-by-Line Explanation

**File**: `sources/voting.move`
**Lines**: 90 (under 100 requirement ✅)
**Module**: `voting::community_voting`

---

## Module Declaration & Imports (Lines 1-5)

```move
module voting::community_voting {
```
**Line 1**: Declares the module namespace `voting::community_voting`

```move
    use std::signer;
    use std::string::{Self, String};
    use cedra_framework::timestamp;
    use std::vector;
```
- **Line 2**: Import signer utilities to get transaction sender's address
- **Line 3**: Import string module and String type for text descriptions
- **Line 4**: Import timestamp for deadline checking
- **Line 5**: Import vector for managing dynamic arrays

---

## Error Codes (Lines 7-8)

```move
    const E_ALREADY_VOTED: u64 = 1;
    const E_VOTING_ENDED: u64 = 2;
```
- **Line 7**: Error code 1 - User already voted on this proposal
- **Line 8**: Error code 2 - Voting deadline has passed

**Why only 2 errors?** Old contract had 3, but we simplified:
- Removed `E_ALREADY_INITIALIZED` (platform can only be initialized once by design)
- Removed `E_PROPOSAL_NOT_FOUND` (Move's vector access handles this automatically)

---

## Data Structures (Lines 10-20)

### VotingPlatform (Line 10)

```move
    struct VotingPlatform has key { proposals: vector<Proposal> }
```
**Line 10**: Container storing all proposals
- `has key`: Can be stored in global storage at an address
- `proposals`: Vector (dynamic array) of all proposals

**Why centralized?** One platform can hold unlimited proposals vs. old design (1 proposal per address)

### Proposal (Lines 12-20)

```move
    struct Proposal has store, copy, drop {
        id: u64,
        description: String,
        creator: address,
        yes_votes: u64,
        no_votes: u64,
        voters: vector<address>,
        end_time: u64,
    }
```
- **Line 12**: Proposal struct with 3 abilities:
  - `store`: Can be stored inside other structs
  - `copy`: Can be copied (lightweight data)
  - `drop`: Can be discarded (no explicit cleanup needed)

- **Line 13**: `id` - Unique numeric identifier (0, 1, 2, ...)
- **Line 14**: `description` - UTF-8 text describing the proposal
- **Line 15**: `creator` - Address of who created this proposal (**NEW**)
- **Line 16**: `yes_votes` - Count of YES votes
- **Line 17**: `no_votes` - Count of NO votes
- **Line 18**: `voters` - List of addresses that voted (prevents double voting)
- **Line 19**: `end_time` - Unix timestamp when voting closes (**NEW**)

---

## Initialize Platform (Lines 22-24)

```move
    public entry fun initialize(account: &signer) {
        move_to(account, VotingPlatform { proposals: vector::empty() });
    }
```
- **Line 22**: Public function callable from transactions
  - `entry`: Can be called directly by users
  - `account: &signer`: The address initializing the platform

- **Line 23**: Move empty VotingPlatform to caller's address
  - `move_to`: Stores resource at account's address
  - `vector::empty()`: Creates empty vector for proposals

**Called once**: Only the platform owner calls this to set up the voting system

---

## Create Proposal (Lines 26-46)

```move
    public entry fun create_proposal(
        creator: &signer,
        platform_addr: address,
        description: vector<u8>,
        duration_seconds: u64,
    ) acquires VotingPlatform {
```
- **Line 26-30**: Function signature
  - `creator`: Who is creating the proposal
  - `platform_addr`: Where the VotingPlatform is stored
  - `description`: UTF-8 bytes for proposal text
  - `duration_seconds`: How long voting is open
- **Line 31**: `acquires VotingPlatform` - Borrows the platform from storage

```move
        let platform = borrow_global_mut<VotingPlatform>(platform_addr);
        let proposal_id = vector::length(&platform.proposals);
```
- **Line 32**: Borrow mutable reference to platform (allows modification)
- **Line 33**: Auto-increment ID = current number of proposals (0, 1, 2...)

```move
        let proposal = Proposal {
            id: proposal_id,
            description: string::utf8(description),
            creator: signer::address_of(creator),
            yes_votes: 0,
            no_votes: 0,
            voters: vector::empty(),
            end_time: timestamp::now_seconds() + duration_seconds,
        };
```
- **Line 35-43**: Create new proposal
  - **Line 37**: Convert UTF-8 bytes to String
  - **Line 38**: Store creator's address
  - **Line 42**: Calculate deadline (current time + duration)

```move
        vector::push_back(&mut platform.proposals, proposal);
```
- **Line 45**: Add proposal to platform's vector

---

## Vote Yes (Lines 48-50)

```move
    public entry fun vote_yes(voter: &signer, platform_addr: address, proposal_id: u64) acquires VotingPlatform {
        vote_internal(voter, platform_addr, proposal_id, true);
    }
```
- **Line 48**: Public entry function for YES votes
- **Line 49**: Delegates to internal function with `is_yes = true`

**Why separate?** Public API is clean; logic is shared internally

---

## Vote No (Lines 52-54)

```move
    public entry fun vote_no(voter: &signer, platform_addr: address, proposal_id: u64) acquires VotingPlatform {
        vote_internal(voter, platform_addr, proposal_id, false);
    }
```
- **Line 52**: Public entry function for NO votes
- **Line 53**: Delegates to internal function with `is_yes = false`

---

## Vote Internal Logic (Lines 56-75)

```move
    fun vote_internal(
        voter: &signer,
        platform_addr: address,
        proposal_id: u64,
        is_yes: bool,
    ) acquires VotingPlatform {
```
- **Line 56-61**: Private internal function
  - `voter`: Who is voting
  - `proposal_id`: Which proposal (0, 1, 2...)
  - `is_yes`: true = YES vote, false = NO vote

```move
        let platform = borrow_global_mut<VotingPlatform>(platform_addr);
        let proposal = vector::borrow_mut(&mut platform.proposals, proposal_id);
```
- **Line 62**: Borrow platform mutably
- **Line 63**: Get mutable reference to specific proposal by ID

```move
        let now = timestamp::now_seconds();
        assert!(now < proposal.end_time, E_VOTING_ENDED);
```
- **Line 65**: Get current Unix timestamp
- **Line 66**: **DEADLINE CHECK** - Abort if voting ended (error code 2)

```move
        let voter_addr = signer::address_of(voter);
        assert!(!vector::contains(&proposal.voters, &voter_addr), E_ALREADY_VOTED);
```
- **Line 68**: Get voter's address
- **Line 69**: **DOUBLE-VOTE PREVENTION** - Abort if already voted (error code 1)
  - `!vector::contains`: Check voter NOT in voters list

```move
        if (is_yes) { proposal.yes_votes = proposal.yes_votes + 1; }
        else { proposal.no_votes = proposal.no_votes + 1; };
```
- **Line 71**: If YES vote, increment yes_votes counter
- **Line 72**: If NO vote, increment no_votes counter

```move
        vector::push_back(&mut proposal.voters, voter_addr);
```
- **Line 74**: Add voter to voters list (prevents future double voting)

---

## Get Proposal (View Function) (Lines 77-82)

```move
    #[view]
    public fun get_proposal(platform_addr: address, proposal_id: u64): (String, address, u64, u64, u64, u64) acquires VotingPlatform {
        let platform = borrow_global<VotingPlatform>(platform_addr);
        let proposal = vector::borrow(&platform.proposals, proposal_id);
        (proposal.description, proposal.creator, proposal.yes_votes, proposal.no_votes, proposal.end_time, vector::length(&proposal.voters))
    }
```
- **Line 77**: `#[view]` attribute - Read-only function (no gas cost!)
- **Line 78**: Returns 6 values as tuple
- **Line 79**: Borrow platform immutably (read-only)
- **Line 80**: Get proposal by ID
- **Line 81**: Return tuple: (description, creator, yes_votes, no_votes, end_time, voter_count)

**Used by frontend**: Fetch proposal data to display

---

## Get Proposal Voters (View Function) (Lines 84-89)

```move
    #[view]
    public fun get_proposal_voters(platform_addr: address, proposal_id: u64): vector<address> acquires VotingPlatform {
        let platform = borrow_global<VotingPlatform>(platform_addr);
        let proposal = vector::borrow(&platform.proposals, proposal_id);
        proposal.voters
    }
```
- **Line 84**: `#[view]` - Read-only function
- **Line 85**: Returns vector of all voter addresses
- **Line 86-87**: Borrow platform and proposal
- **Line 88**: Return voters list directly

**Used by frontend**: Display who voted on each proposal

---

## Summary

### Architecture Flow

1. **Initialize**: Deploy platform once at an address
2. **Create**: Anyone can create proposals with deadlines
3. **Vote**: Users vote YES/NO before deadline, can't vote twice
4. **View**: Frontend reads proposal data and voters (no gas)

### Key Security Features

✅ **Double-vote prevention** (Line 69): Checks voters list
✅ **Deadline enforcement** (Line 66): Rejects late votes
✅ **Creator accountability** (Line 38): Tracks who created what
✅ **Immutable votes**: Once cast, cannot be changed

### Gas Efficiency

- View functions (Lines 77, 84): **FREE** - No gas cost to read data
- Entry functions (Lines 22, 26, 48, 52): Cost gas to execute
- Optimized storage: Only 90 lines, minimal data structures

### Comparison to Old Contract

| Feature | Old | New |
|---------|-----|-----|
| **Lines** | 95 | 90 ✅ |
| **Proposals per platform** | 1 | Unlimited ✅ |
| **Deadlines** | ❌ | ✅ |
| **Creator tracking** | ❌ | ✅ |
| **Error codes** | 3 | 2 (cleaner) |

---

**Contract Address**: `0xfedc238436368f33049325b66c5a66ac049a0483f2c3cd20d8ffeab89f0d617b`
**Module**: `community_voting`
**Network**: Cedra Testnet
