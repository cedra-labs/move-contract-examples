export interface User {
  walletAddress: string
  referralCode: string
  referrerAddress: string | null
  isRegisteredOnchain: boolean
}

export interface ReferralStats {
  totalReferred: number
  activeReferrals: number
  totalEarned: number
  monthlyEarnings: number
  joinDate: string
}

export interface Reward {
  id: string
  referrer_address: string
  buyer_address: string
  reward_amount: string
  transaction_hash: string
  asset_type: string
  status: string
  created_at: string
}

export interface RegisterResponse {
  success: boolean
  code: string
  isNew: boolean
  referrer?: string | null
}

export interface ValidateCodeResponse {
  valid: boolean
  referrerAddress: string | null
}

export interface StatsResponse {
  user: User
  stats: ReferralStats
  recentRewards: Reward[]
}

export interface RecordRewardData {
  referrerAddress: string
  buyerAddress: string
  rewardAmount: string
  transactionHash: string
  assetType: string
}