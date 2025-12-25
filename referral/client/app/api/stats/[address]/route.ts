import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const supabase = createClient()
    const walletAddress = params.address

    // Get user data
    const { data: user } = await supabase
      .from('referral_users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get active referrals
    const { count: activeReferrals } = await supabase
      .from('referral_links')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_address', walletAddress)
      .eq('status', 'active')

    // Get recent rewards
    const { data: recentRewards } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('referrer_address', walletAddress)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate monthly earnings
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: monthlyRewards } = await supabase
      .from('referral_rewards')
      .select('reward_amount')
      .eq('referrer_address', walletAddress)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const monthlyEarnings = monthlyRewards?.reduce(
      (sum: number, r: any) => sum + parseFloat(r.reward_amount),
      0
    ) || 0

    return NextResponse.json({
      user: {
        walletAddress: user.wallet_address,
        referralCode: user.referral_code,
        referrerAddress: user.referrer_address,
        isRegisteredOnchain: user.is_registered_onchain
      },
      stats: {
        totalReferred: user.referred_count,
        activeReferrals: activeReferrals || 0,
        totalEarned: parseFloat(user.total_earned),
        monthlyEarnings,
        joinDate: user.created_at
      },
      recentRewards: recentRewards || []
    })

  } catch (error: any) {
    console.error('Error in stats:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}