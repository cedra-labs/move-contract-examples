'use client'

import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface Props {
  walletAddress: string
  code: string
}

export default function GenerateLink({ walletAddress, code }: Props) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}?ref=${code}`
    : `https://yourapp.com?ref=${code}`

  useEffect(() => {
    // Generate QR code
    QRCode.toDataURL(referralLink, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).then(url => {
      setQrCodeUrl(url)
    }).catch(console.error)
  }, [referralLink])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareOnTwitter = () => {
    const text = `Join me on the Referral System! Use my referral code: ${code}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Your Referral Link</h2>
      
      <div className="mb-6">
        <p className="mb-2">
          Your referral code: <strong className="text-2xl text-blue-600">{code}</strong>
        </p>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-6 break-all">
        <p className="text-sm">{referralLink}</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button 
          onClick={copyToClipboard}
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button 
          onClick={shareOnTwitter}
          className="flex-1 bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Share on Twitter
        </button>
      </div>

      {qrCodeUrl && (
        <div className="text-center">
          <h3 className="text-lg font-medium mb-3">QR Code</h3>
          <img 
            src={qrCodeUrl} 
            alt="Referral QR Code" 
            className="mx-auto border border-gray-200 rounded-lg p-3 bg-white"
          />
          <p className="text-sm text-gray-600 mt-3">
            Scan to visit your referral link
          </p>
        </div>
      )}
    </div>
  )
}