# Contributing to Cedra Move Contract Examples

Thank you for your interest in contributing! This guide will help you get started quickly.

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR-USERNAME/move-contract-examples
cd move-contract-examples

# 2. Setup environment
https://docs.cedra.network/

# 3. Create new branch
git checkout -b my-feature

# 4. Test
bash ./scripts/tests.sh

# 5. Submit PR
git push origin my-feature
```

## Code of Conduct
By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### 🐛 Reporting Bugs

Before reporting, check if the issue already exists. Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- Clear description and steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Move CLI version)
- Error messages and screenshots if applicable

### 💡 Suggesting Features

Check existing examples first. Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and describe:
- The problem you're solving
- Your proposed solution
- Alternative approaches considered

### 📝 Your First Contribution

Start with issues labeled:
- `good-first-issue` - Simple fixes, great for beginners
- `help-wanted` - More complex but well-defined tasks

## Development Guidelines

### Move Style Guide

```move
module cedra_examples::example {  // PascalCase for modules
    use std::signer;
    
    // Constants in UPPER_CASE
    const E_NOT_INITIALIZED: u64 = 1;
    
    // Structs in PascalCase
    struct MyResource has key {
        value: u64,  // snake_case for fields
    }
    
    // Functions in snake_case
    public entry fun do_something(account: &signer) {
        // 4 spaces indentation
        // Max 100 chars per line
    }
}
```

### Documentation Requirements

Every example needs:
- **README.md** with overview, installation, usage, and key concepts
- **Doc comments** for all public functions
- **Inline comments** for complex logic

Example doc comment:
```move
/// Transfers tokens between accounts
/// @param from - Sender's signer
/// @param to - Recipient's address
/// @param amount - Amount to transfer
public entry fun transfer(from: &signer, to: address, amount: u64) {
    // Implementation
}
```

### Testing Standards

- **Required**: All examples must have tests
- **Structure**: Include positive, negative

```move
#[test_only]
module cedra_examples::example_test {
    #[test]
    fun test_success_case() { /* ... */ }
    
    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_error_case() { /* ... */ }
}
```

## Commit Guidelines

Format: `<type>: <subject>`

Types:
- `feat` - New feature/example
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `style` - Formatting
- `chore` - Maintenance

Examples:
```
feat: add flash loan example
fix: resolve issue
docs: improve hello-world readme
```

## Pull Request Process

1. **Before submitting:**
   - Run all tests: `bash scripts/tests.sh`
   - Update documentation

2. **PR must include:**
   - Clear description of changes
   - Link to related issue(s)
   - Test results
   - Screenshots if UI-related

3. **Review process:**
   - Automated CI checks must pass
   - At least one maintainer review required
   - Address all feedback

## Getting Help

- **TG Builders**: [Link](https://t.me/+Ba3QXd0VG9U0Mzky)
- **Discors**: [Link](https://discord.com/invite/cedranetwork)

## Recognition

Contributors with merged PRs receive:
- Credit in CONTRIBUTORS.md
- Exclusive Cedra Developer Perks
- Access to contributor calls
- Mysterious project participation

**Ready to contribute?** Pick an issue labeled `good-first-issue` and start coding! 🚀