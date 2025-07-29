import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RecordRewardRequest {
  referrerAddress: string
  buyerAddress: string
  rewardAmount: string
  transactionHash: string
  assetType: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { 
      referrerAddress, 
      buyerAddress, 
      rewardAmount, 
      transactionHash,
      assetType 
    }: RecordRewardRequest = await request.json()

    // Insert reward record
    await supabase
      .from('referral_rewards')
      .insert({
        referrer_address: referrerAddress,
        buyer_address: buyerAddress,
        reward_amount: rewardAmount,
        transaction_hash: transactionHash,
        asset_type: assetType,
        status: 'completed'
      })

    // Update user stats
    await supabase.rpc('increment', {
      filter_column: 'wallet_address',
      filter_value: referrerAddress,
      column_to_increment: 'total_earned',
      increment_by: parseFloat(rewardAmount)
    })

    // Update referral link status if needed
    await supabase
      .from('referral_links')
      .update({ 
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('referred_address', buyerAddress)
      .eq('status', 'pending')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in record-reward:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}