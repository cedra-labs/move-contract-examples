#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROFILE="testnet"
PLATFORM_ADDRESS=$(cat .cedra/config.yaml | grep "account:" | awk '{print $2}')
MODULE_NAME="community_voting"

echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Basic Community Voting Contract - Deploy     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${CYAN}════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════${NC}"
    echo ""
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

# Function to print warning
print_warning() {
    echo -e "${MAGENTA}⚠ $1${NC}"
}

print_section "📋 Deployment Configuration"
echo -e "${YELLOW}Profile:${NC} $PROFILE"
echo -e "${YELLOW}Platform Address:${NC} ${GREEN}$PLATFORM_ADDRESS${NC}"
echo -e "${YELLOW}Module Name:${NC} voting::$MODULE_NAME"
echo -e "${YELLOW}Network:${NC} Cedra Testnet"
echo ""

print_warning "This will deploy a NEW contract instance."
print_warning "The old contract at $PLATFORM_ADDRESS will remain unchanged."
print_warning "You will need to initialize the new contract after deployment."
echo ""

read -p "$(echo -e ${YELLOW}Do you want to continue? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled."
    exit 0
fi
echo ""

print_section "🧹 Step 1: Cleaning Build Directory"
rm -rf build
print_success "Build directory cleaned"
echo ""

print_section "🔨 Step 2: Compiling Contract"
print_info "Compiling with address: $PLATFORM_ADDRESS..."
echo ""

cedra move compile --named-addresses voting=$PLATFORM_ADDRESS

if [ $? -eq 0 ]; then
    print_success "Contract compiled successfully!"
    echo ""
else
    print_error "Compilation failed!"
    exit 1
fi

print_section "🧪 Step 3: Running Tests"
print_info "Running Move unit tests..."
echo ""

cedra move test

if [ $? -eq 0 ]; then
    print_success "All tests passed!"
    echo ""
else
    print_error "Tests failed! Fix errors before deploying."
    exit 1
fi

print_section "🚀 Step 4: Deploying to Testnet"
print_info "Publishing contract to Cedra Testnet..."
echo ""

cedra move publish --profile $PROFILE --named-addresses voting=$PLATFORM_ADDRESS

if [ $? -eq 0 ]; then
    print_success "Contract deployed successfully!"
    echo ""
else
    print_error "Deployment failed!"
    exit 1
fi

print_section "📊 Step 5: Deployment Summary"
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          DEPLOYMENT SUCCESSFUL! ✓              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Contract Details:${NC}"
echo -e "  • Platform Address: ${GREEN}$PLATFORM_ADDRESS${NC}"
echo -e "  • Module: ${GREEN}voting::$MODULE_NAME${NC}"
echo -e "  • Network: ${GREEN}Cedra Testnet${NC}"
echo -e "  • Explorer: ${CYAN}https://cedrascan.com/account/$PLATFORM_ADDRESS?network=testnet${NC}"
echo ""

echo -e "${YELLOW}New View Function Added:${NC}"
echo -e "  • ${GREEN}get_proposal_voters${NC} - Returns list of voter addresses for a proposal"
echo ""

print_section "📝 Next Steps"
echo -e "${BLUE}1. Initialize the platform:${NC}"
echo -e "   ${YELLOW}cedra move run \\${NC}"
echo -e "   ${YELLOW}  --function-id $PLATFORM_ADDRESS::$MODULE_NAME::initialize \\${NC}"
echo -e "   ${YELLOW}  --profile $PROFILE${NC}"
echo ""

echo -e "${BLUE}2. Update frontend configuration:${NC}"
echo -e "   ${YELLOW}File: frontend/lib/cedra.ts${NC}"
echo -e "   ${YELLOW}Update PLATFORM_ADDRESS to: $PLATFORM_ADDRESS${NC}"
echo ""

echo -e "${BLUE}3. Test the new view function:${NC}"
echo -e "   ${YELLOW}cedra move view \\${NC}"
echo -e "   ${YELLOW}  --function-id $PLATFORM_ADDRESS::$MODULE_NAME::get_proposal_voters \\${NC}"
echo -e "   ${YELLOW}  --args address:$PLATFORM_ADDRESS u64:0 \\${NC}"
echo -e "   ${YELLOW}  --profile $PROFILE${NC}"
echo ""

# Save deployment info
DEPLOYMENT_FILE="deployment-$(date +%Y%m%d-%H%M%S).txt"
cat > $DEPLOYMENT_FILE << EOF
Basic Community Voting Contract Deployment
==========================================

Deployment Time: $(date)
Platform Address: $PLATFORM_ADDRESS
Module: voting::$MODULE_NAME
Network: Cedra Testnet
Explorer: https://cedrascan.com/account/$PLATFORM_ADDRESS?network=testnet

View Functions:
- get_proposal: Get proposal details (description, votes, end_time, voter_count)
- get_proposal_voters: Get list of addresses that voted on a proposal

Entry Functions:
- initialize: Initialize the voting platform
- create_proposal: Create a new proposal
- vote_yes: Vote yes on a proposal
- vote_no: Vote no on a proposal

Next Steps:
1. Run initialization command (see above)
2. Update frontend/lib/cedra.ts with new PLATFORM_ADDRESS
3. Test the contract functions
EOF

print_success "Deployment info saved to: $DEPLOYMENT_FILE"
echo ""

echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            Deployment Complete! 🎉             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
