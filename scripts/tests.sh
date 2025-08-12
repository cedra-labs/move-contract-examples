#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   Cedra Move Test Runner${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if cedra CLI exists, if not try aptos
if command -v cedra &> /dev/null; then
    CLI="cedra"
    echo -e "${GREEN}Using Cedra CLI${NC}"
elif command -v aptos &> /dev/null; then
    CLI="aptos"
    echo -e "${YELLOW}Using Aptos CLI (Cedra CLI not found)${NC}"
else
    echo -e "${RED}Error: Cedra CLI not found!${NC}"
    echo "Please install Cedra CLI first"
    echo "https://docs.cedra.network/getting-started/cli"
    exit 1
fi

# Initialize counters
PASSED=0
FAILED=0
SKIPPED=0
PASSED_DIRS=()
SKIPPED_DIRS=()
FAILED_DIRS=()

ROOT_DIR=$(pwd)

# Test each directory that has Move.toml or move.toml (recursively)
for toml in $(find . -type f \( -name 'Move.toml' -o -name 'move.toml' \)); do
    dir=$(dirname "$toml")
    echo -e "${YELLOW}Testing: $dir${NC}"

    cd "$dir"

    # Check if tests directory exists with at least one .move file
    if [ ! -d "tests" ] || [ -z "$(ls -A tests/*.move 2>/dev/null)" ]; then
        echo -e "  ${YELLOW}⚠ SKIPPED (no tests found)${NC}"
        SKIPPED=$((SKIPPED + 1))
        SKIPPED_DIRS+=("$dir")
        cd "$ROOT_DIR"
        continue
    fi

    # Run tests
    if $CLI move test 2>&1 | tee test_output.tmp; then
        echo -e "  ${GREEN}✅ PASSED${NC}"
        PASSED=$((PASSED + 1))
        PASSED_DIRS+=("$dir")

        # Try to extract test count
        TEST_COUNT=$(grep -c "PASS" test_output.tmp 2>/dev/null || echo "0")
        if [ "$TEST_COUNT" -gt 0 ]; then
            echo -e "  ${BLUE}   Tests passed: $TEST_COUNT${NC}"
        fi
    else
        echo -e "  ${RED}❌ FAILED${NC}"
        FAILED=$((FAILED + 1))
        FAILED_DIRS+=("$dir")
    fi

    # Clean up temp file
    rm -f test_output.tmp

    cd "$ROOT_DIR"
    echo ""
done

# Print summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}         Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
echo -e "${RED}❌ Failed:  $FAILED${NC}"
echo -e "${YELLOW}⚠  Skipped: $SKIPPED${NC}"

echo ""

# Show lists
if [ $PASSED -gt 0 ]; then
    echo -e "${GREEN}Passed directories:${NC}"
    for dir in "${PASSED_DIRS[@]}"; do
        echo -e "  ${GREEN}- $dir${NC}"
    done
    echo ""
fi

if [ $SKIPPED -gt 0 ]; then
    echo -e "${YELLOW}Skipped directories:${NC}"
    for dir in "${SKIPPED_DIRS[@]}"; do
        echo -e "  ${YELLOW}- $dir${NC}"
    done
    echo ""
fi

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed directories:${NC}"
    for dir in "${FAILED_DIRS[@]}"; do
        echo -e "  ${RED}- $dir${NC}"
    done
    exit 1
fi

if [ $PASSED -eq 0 ] && [ $SKIPPED -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}No tests found in any directory!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"