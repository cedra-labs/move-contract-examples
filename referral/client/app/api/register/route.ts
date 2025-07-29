import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RegisterRequest {
  walletAddress: string
  referralCode?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { walletAddress, referralCode }: RegisterRequest = await request.json()

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('referral_users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        success: true,
        code: existingUser.referral_code,
        isNew: false 
      })
    }

    // Generate new referral code
    const { data: newCode } = await supabase
      .rpc('generate_referral_code', { address: walletAddress })

    let referrerAddress = null

    // Validate referral code if provided
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('referral_users')
        .select('wallet_address')
        .eq('referral_code', referralCode.toUpperCase())
        .single()

      if (referrer) {
        referrerAddress = referrer.wallet_address

        // Create referral link
        await supabase
          .from('referral_links')
          .insert({
            referrer_address: referrerAddress,
            referred_address: walletAddress,
            status: 'pending'
          })
      }
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('referral_users')
      .insert({
        wallet_address: walletAddress,
        referral_code: newCode,
        referrer_address: referrerAddress
      })
      .select()
      .single()

    if (error) throw error

    // Track registration event
    await supabase
      .from('referral_events')
      .insert({
        event_type: 'register',
        referral_code: referralCode,
        wallet_address: walletAddress,
        metadata: { referrer: referrerAddress }
      })

    return NextResponse.json({ 
      success: true,
      code: newCode,
      isNew: true,
      referrer: referrerAddress
    })

  } catch (error: any) {
    console.error('Error in register:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}