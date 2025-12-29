# Module Publishing Guide

## Description

Complete guide for publishing Move modules on Cedra covering step-by-step process, dependencies, versioning, and troubleshooting with real examples.

**File:** `guides/module-publishing.md`

## Task Issue

[Link to task issue]

## Testing

1. Review `guides/module-publishing.md`
2. Verify commands match repository examples
3. Test workflow:
   ```bash
   cd nft-example/contract
   cedra move compile --named-addresses CedraNFTV2=default
   cedra move publish --named-addresses CedraNFTV2=default
   ```

## Dependencies

None. Uses existing Cedra CLI and repository examples.

