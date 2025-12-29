# Contributing to 5-Seat Texas Hold'em

Thank you for your interest in contributing to the 5-Seat Texas Hold'em project! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Contributions](#making-contributions)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/5-seat-texas-hold-em.git
   cd 5-seat-texas-hold-em
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/CryptoAutistic80/5-seat-texas-hold-em.git
   ```

## Development Setup

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Cedra CLI** (for smart contract development)

### Installation

```bash
# Install all dependencies (root + workspaces)
npm install

# Start the frontend development server
npm run dev

# Run contract tests
npm run contracts:test

# Compile contracts
npm run contracts:compile
```

### Environment Setup

Copy the example environment file for the frontend:

```bash
cp packages/frontend/.env.example packages/frontend/.env
```

## Project Structure

```
5-seat-texas-holdem/
├── packages/
│   ├── contracts/              # Move smart contracts
│   │   ├── sources/            # Contract source files
│   │   ├── tests/              # Contract test files
│   │   ├── docs/               # Contract documentation
│   │   └── Move.toml           # Move package config
│   └── frontend/               # React + TypeScript frontend
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── config/         # Configuration
│       │   └── types/          # TypeScript types
│       └── package.json
├── package.json                # Root workspace config
└── README.md
```

## Making Contributions

### Types of Contributions

- **🐛 Bug Fixes**: Fix issues in contracts or frontend
- **✨ Features**: Add new functionality
- **📝 Documentation**: Improve docs, comments, or examples
- **🧪 Tests**: Add or improve test coverage
- **🎨 UI/UX**: Improve the frontend design

### Branch Naming

Use descriptive branch names:

- `feature/add-straddle-button`
- `fix/pot-calculation-bug`
- `docs/update-api-reference`
- `refactor/simplify-hand-eval`

## Coding Standards

### Move Contracts

- Follow Move best practices
- Add comprehensive comments for public functions
- Include error codes with descriptive names
- Write tests for all new functionality

```move
/// Creates a new poker table with the specified configuration.
/// 
/// # Arguments
/// * `creator` - The signer who creates and owns the table
/// * `small_blind` - Small blind amount in chips
/// * `big_blind` - Big blind amount in chips
/// 
/// # Errors
/// * `E_INVALID_BLINDS` - If big blind is not 2x small blind
public entry fun create_table(
    creator: &signer,
    small_blind: u64,
    big_blind: u64,
) acquires Table {
    // Implementation
}
```

### TypeScript/React

- Use TypeScript strict mode
- Follow ESLint configuration
- Use functional components with hooks
- Prefer `type` imports for type-only imports

```typescript
import type { TableConfig, GameState } from "../types";
import { useCallback, useState } from "react";

export function useTableData(address: string) {
  // Implementation
}
```

### CSS

- Use CSS custom properties (variables) from `App.css`
- Follow BEM-like naming conventions
- Mobile-first responsive design

## Testing

### Contract Tests

```bash
# Run all contract tests
npm run contracts:test

# Run specific test file
cd packages/contracts
cedra move test --filter test_game_flow
```

### Frontend Tests

```bash
# Type checking
cd packages/frontend
npx tsc --noEmit

# Linting
npx eslint src/
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, atomic commits
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request** with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for UI changes
   - Test results

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New code has appropriate tests
- [ ] Documentation updated
- [ ] Commit messages are clear and descriptive

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Questions?

If you have questions or need help:

1. Check existing issues and discussions
2. Open a new issue with your question
3. Tag it with `question` label

---

Thank you for contributing! 🃏♠️♥️♦️♣️
