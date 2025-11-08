#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
PROFILE="testnet"
PLATFORM_ADDRESS=$(cat .cedra/config.yaml | grep "account:" | awk '{print $2}')

echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Basic Community Voting Contract - Tests      ║${NC}"
echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${BLUE}📋 Test Configuration:${NC}"
echo -e "   Platform Address: ${YELLOW}$PLATFORM_ADDRESS${NC}"
echo -e "   Network: ${YELLOW}$PROFILE${NC}"
echo ""

# Function to print test headers
print_test() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST: $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📦 Step 1: Cleaning Previous Build${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

rm -rf build
print_success "Cleaned build directory"
echo ""

echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔨 Step 2: Compiling Contract${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

cedra move compile --named-addresses voting=$PLATFORM_ADDRESS
if [ $? -eq 0 ]; then
    print_success "Contract compiled successfully!"
    echo ""
else
    print_error "Compilation failed!"
    exit 1
fi

echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧪 Step 3: Running Move Unit Tests${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

cedra move test
if [ $? -eq 0 ]; then
    print_success "All unit tests passed!"
    echo ""
else
    print_error "Unit tests failed!"
    exit 1
fi

echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 Step 4: Contract Analysis${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

print_info "Analyzing contract structure..."
echo ""

# Check for view functions
print_test "View Functions"
echo -e "${YELLOW}Found view functions:${NC}"
grep -n "#\[view\]" sources/voting.move | while read line; do
    echo -e "  • Line $(echo $line | cut -d: -f1)"
    next_line=$(echo $line | cut -d: -f1)
    next_line=$((next_line + 1))
    sed -n "${next_line}p" sources/voting.move | sed 's/^/    /'
done
echo ""

# Check for entry functions
print_test "Entry Functions"
echo -e "${YELLOW}Found entry functions:${NC}"
grep -n "public entry fun" sources/voting.move | while read line; do
    echo -e "  • $(echo $line | cut -d: -f2 | sed 's/^[ \t]*//')"
done
echo ""

# Check for error codes
print_test "Error Codes"
echo -e "${YELLOW}Defined error codes:${NC}"
grep -n "const E_" sources/voting.move | while read line; do
    echo -e "  • $(echo $line | cut -d: -f2 | sed 's/^[ \t]*//')"
done
echo ""

echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📄 Step 5: Contract Summary${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

# Count lines of code
TOTAL_LINES=$(wc -l < sources/voting.move)
CODE_LINES=$(grep -v "^[[:space:]]*$" sources/voting.move | grep -v "^[[:space:]]*//" | wc -l)

echo -e "${YELLOW}Contract Statistics:${NC}"
echo -e "  • Total lines: ${GREEN}$TOTAL_LINES${NC}"
echo -e "  • Code lines: ${GREEN}$CODE_LINES${NC}"
echo -e "  • Structs: ${GREEN}$(grep -c "struct " sources/voting.move)${NC}"
echo -e "  • Functions: ${GREEN}$(grep -c "fun " sources/voting.move)${NC}"
echo ""

echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All Tests Completed Successfully!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "   1. Review the test results above"
echo -e "   2. Deploy to testnet with ${YELLOW}cedra move publish${NC}"
echo -e "   3. Update frontend with new contract address"
echo ""

echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
