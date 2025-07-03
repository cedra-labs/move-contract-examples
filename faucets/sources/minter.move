module faucets::minter {
    use faucets::BTC;
    use faucets::ETH;
    use std::signer;

    entry fun mint_BTC(minter: &signer, amount: u64) {
        assert!(amount <= 10_00000000);  // limit minting to 1 unit per call
        BTC::mint(minter, signer::address_of(minter), amount);
    }

    entry fun mint_ETH(minter: &signer, amount: u64) {
        assert!(amount <= 10_00000000);  // limit minting to 1 unit per call
        ETH::mint(minter, signer::address_of(minter), amount);
    }
}