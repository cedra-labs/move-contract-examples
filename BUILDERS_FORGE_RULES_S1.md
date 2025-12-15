## **Cedra Builders Forge Requirements + Rules**

To ensure fairness and quality, all participants must follow the guidelines below:

- All tasks in our [Github](https://github.com/cedra-labs/docs/issues) with special `Builders Forge` label
- All code and documentation must be in English
- No copy-paste — all work must be original
- One GitHub account per participant
- Team submissions allowed, but rewards are per task, not per person
- Submit all work through a GitHub Pull Request (PR)
    - Only one task per PR (do not combine)
    - Comment "I'm taking this task" on the issue before starting
- Your PR must include:
    - A clear description of what was built
    - A link to the task issue
    - Testing instructions
    - Any dependencies or setup required
- Once complete, **send your PR in Telegram**: [Cedra Builders Chat](https://t.me/+Ba3QXd0VG9U0Mzky)

NOTE: If you are a resident [of a sanction country](https://www.sanctionsmap.eu/#/main), you are unable to qualify.

### **Disqualification Criteria**

- Plagiarism or copying others’ work
- Malicious code
- Harassment or inappropriate behavior
- Multiple accounts or identity fraud
- Low-quality or spam submissions
- Violation of any rule above

### Minimum requirements for approval:

- Code must compile without errors
- Tests must pass (where applicable)
- Documentation must be complete
- Must solve the stated problem

## **Tasks evaluation**

**Code Implementation (25 pts)**

- Works exactly as specified (10 pts)
- All features implemented (5 pts)
- No bugs or errors (5 pts)
- Handles edge cases (5 pts)

**Technical Excellence (20 pts)**

- Clean, readable code (5 pts)
- Proper error handling (5 pts)
- Gas efficient (5 pts)
- Follows Move conventions (5 pts)

**Test Coverage (15 pts)**

- Unit tests included (5 pts)
- Tests actually pass (5 pts)
- Edge cases tested (5 pts)

**Written Documentation (20 pts)**

- Clear README with setup instructions (5 pts)
- Usage examples that work (5 pts)
- Code comments explaining logic (5 pts)
- API/function documentation (5 pts)

**Ease of Use (20 pts)**

- Easy to understand and modify (5 pts)
- Reusable by other developers (5 pts)
- Clear file structure (5 pts)
- Helpful error messages (5 pts)

### **Evaluation Results**

- **80–100 points:** ⭐ *Excellent* → Eligible for Hard Tasks
- **60–79 points:** ✅ *Good* → Full Payment
- **50–59 points:** 🧩 *Needs Revision* → Feedback Provided, Can Resubmit
- **0–49 points:** ❌ *Rejected* → Major Rework Required

## **Cedra Builders Forge Voting**

Cedra contributors will make the final decision on the campaign’s finalists.

Cedra is community-first, and its builders will partake directly in the voting process.

For any questions, join the [Cedra Builders Telegram](https://t.me/+Ba3QXd0VG9U0Mzky) and ask a moderator for clarification.

On **November 3rd**, we forge.

**Forge fast, Move Smart.**

---

## Submissions

### Game Mechanics

#### Move Slayers - On-Chain RPG
- **Location**: `/game-mechanics/move-slayers/`
- **Description**: A fully on-chain role-playing game featuring turn-based combat, character progression, inventory management, and equipment system
- **Features**:
  - Player character system with stats (HP, Mana, Level, EXP)
  - Inventory and equipment management (Swords, Shields, Armor, Potions)
  - Turn-based combat with 6 enemy types (Boar, Wolf, Orc, Troll, Drake, Dragon)
  - Leveling system with exponential EXP scaling
  - Defense mechanics (armor reduces damage taken)
  - Anti-cheat: On-chain state, deterministic combat, resource safety
  - Gas-efficient: Optimized storage, single-pass algorithms
- **Test Coverage**: 25 comprehensive unit tests (100% passing)
- **Documentation**: Full README with usage examples and game mechanics guide
