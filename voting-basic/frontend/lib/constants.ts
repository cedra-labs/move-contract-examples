// Contract configuration
export const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || "0xfedc238436368f33049325b66c5a66ac049a0483f2c3cd20d8ffeab89f0d617b";
export const MODULE_NAME = "community_voting";
export const MODULE_ADDRESS = `${PLATFORM_ADDRESS}::${MODULE_NAME}`;
