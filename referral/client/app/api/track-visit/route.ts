import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TrackVisitRequest {
  referralCode: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { referralCode }: TrackVisitRequest = await request.json()

    await supabase
      .from('referral_events')
      .insert({
        event_type: 'visit',
        referral_code: referralCode,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error in track-visit:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}