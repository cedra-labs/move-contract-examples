'use client'

import React, { useState, useEffect } from 'react'
import { referralAPI } from '@/lib/api'
import { StatsResponse } from '@/types/referral'

interface Props {
  walletAddress: string
}

export default function ReferralDashboard({ walletAddress }: Props) {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [walletAddress])

  const fetchStats = async () => {
    try {
      setError(null)
      const data = await referralAPI.getStats(walletAddress)
      setStats(data)
    } catch (err: any) {
      console.error('Failed to fetch stats:', err)
      setError(err.message || 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return (amount / 100_000_000).toFixed(4) // Convert from octas
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Your Referral Stats</h2>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Your Referral Stats</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchStats}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Your Referral Stats</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Total Referred</p>
          <p className="text-2xl font-bold mt-1">
            {stats.stats.totalReferred}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Active Referrals</p>
          <p className="text-2xl font-bold mt-1">
            {stats.stats.activeReferrals}
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Total Earned</p>
          <p className="text-2xl font-bold mt-1">
            {formatAmount(stats.stats.totalEarned)} CEDRA
          </p>
        </div>
        
        <div className="bg-pink-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Monthly Earnings</p>
          <p className="text-2xl font-bold mt-1">
            {formatAmount(stats.stats.monthlyEarnings)} CEDRA
          </p>
        </div>
      </div>

      {stats.user.referrerAddress && (
        <div className="mb-6">
          <p>
            Referred by: <strong>{stats.user.referrerAddress.slice(0, 8)}...</strong>
          </p>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-3">Recent Rewards</h3>
        {stats.recentRewards.length === 0 ? (
          <p className="text-gray-600">No rewards yet. Share your referral link to start earning!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">From</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-gray-100">
                    <td className="p-3">
                      {formatDate(reward.created_at)}
                    </td>
                    <td className="p-3">
                      {reward.buyer_address.slice(0, 8)}...
                    </td>
                    <td className="p-3 text-right">
                      {formatAmount(parseFloat(reward.reward_amount))} CEDRA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>Member since: {formatDate(stats.stats.joinDate)}</p>
        {stats.user.isRegisteredOnchain && (
          <p>✓ Registered on blockchain</p>
        )}
      </div>
    </div>
  )
}