interface RegisterResponse {
  success: boolean
  code: string
  isNew: boolean
  referrer?: string | null
}

interface ValidateCodeResponse {
  valid: boolean
  referrerAddress: string | null
}

interface StatsResponse {
  user: {
    walletAddress: string
    referralCode: string
    referrerAddress: string | null
    isRegisteredOnchain: boolean
  }
  stats: {
    totalReferred: number
    activeReferrals: number
    totalEarned: number
    monthlyEarnings: number
    joinDate: string
  }
  recentRewards: Array<{
    id: string
    referrer_address: string
    buyer_address: string
    reward_amount: string
    transaction_hash: string
    asset_type: string
    status: string
    created_at: string
  }>
}

interface RecordRewardData {
  referrerAddress: string
  buyerAddress: string
  rewardAmount: string
  transactionHash: string
  assetType: string
}

export const referralAPI = {
  register: async (walletAddress: string, referralCode?: string): Promise<RegisterResponse> => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, referralCode })
    })
    
    if (!response.ok) {
      throw new Error('Failed to register')
    }
    
    return response.json()
  },
  
  validateCode: async (code: string): Promise<ValidateCodeResponse> => {
    const response = await fetch('/api/validate-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    })
    
    if (!response.ok) {
      throw new Error('Failed to validate code')
    }
    
    return response.json()
  },
  
  getStats: async (walletAddress: string): Promise<StatsResponse> => {
    const response = await fetch(`/api/stats/${walletAddress}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User not found')
      }
      throw new Error('Failed to fetch stats')
    }
    
    return response.json()
  },
  
  trackVisit: async (referralCode: string): Promise<{ success: boolean }> => {
    const response = await fetch('/api/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ referralCode })
    })
    
    if (!response.ok) {
      throw new Error('Failed to track visit')
    }
    
    return response.json()
  },
  
  recordReward: async (data: RecordRewardData): Promise<{ success: boolean }> => {
    const response = await fetch('/api/record-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error('Failed to record reward')
    }
    
    return response.json()
  }
}