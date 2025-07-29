'use client'

import React, { useState, useEffect } from 'react'
import WalletConnect from '@/components/WalletConnect'
import ReferralDashboard from '@/components/ReferralDashboard'
import GenerateLink from '@/components/GenerateLink'
import { referralAPI } from '@/lib/api'

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [userCode, setUserCode] = useState<string | null>(null)

  useEffect(() => {
    // Check URL parameters for referral code
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('ref')
    
    if (ref) {
      setReferralCode(ref)
      // Store in localStorage for later use
      localStorage.setItem('referralCode', ref)
      
      // Track the visit
      referralAPI.trackVisit(ref).catch(console.error)
    } else {
      // Check localStorage for stored referral code
      const storedRef = localStorage.getItem('referralCode')
      if (storedRef) {
        setReferralCode(storedRef)
      }
    }
  }, [])

  const handleConnect = async (address: string) => {
    setWalletAddress(address)
    
    try {
      // Register user with referral code if available
      const response = await referralAPI.register(address, referralCode || undefined)
      setUserCode(response.code)
      
      // Clear referral code from localStorage after successful registration
      if (response.isNew && referralCode) {
        localStorage.removeItem('referralCode')
      }
    } catch (error) {
      console.error('Failed to register:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Referral System</h1>
        
        {referralCode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <p className="text-center">
              You were referred! Code: <strong className="text-blue-600">{referralCode}</strong>
            </p>
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-2 lg:col-span-3">
            <WalletConnect 
              onConnect={handleConnect} 
              walletAddress={walletAddress} 
            />
          </div>
          
          {walletAddress && userCode && (
            <>
              <div className="lg:col-span-1">
                <GenerateLink walletAddress={walletAddress} code={userCode} />
              </div>
              <div className="lg:col-span-2">
                <ReferralDashboard walletAddress={walletAddress} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}