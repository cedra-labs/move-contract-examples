import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ValidateCodeRequest {
  code: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { code }: ValidateCodeRequest = await request.json()

    const { data: referrer } = await supabase
      .from('referral_users')
      .select('wallet_address')
      .eq('referral_code', code.toUpperCase())
      .single()

    return NextResponse.json({ 
      valid: !!referrer,
      referrerAddress: referrer?.wallet_address || null
    })

  } catch (error: any) {
    console.error('Error in validate-code:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}