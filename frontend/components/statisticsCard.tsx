'use client'
import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'

interface StatisticsCardProps {
  className?: string
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ className = '' }) => {
  const { 
    address,
    isConnected,
    portfolioValue,
    profitLoss
  } = useWallet();

  const [isCopied, setIsCopied] = useState(false);

  const formatAddress = (address: string) => {
    if (address.length <= 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  }

  return (
    <div className={`
      ${className.includes('relative') 
        ? 'relative' 
        : 'fixed bottom-6 right-6 z-40'
      }
      bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl
      p-4 w-96 h-36
      transition-all duration-300 ease-out
      hover:border-white/30 hover:bg-black/35 hover:shadow-lg hover:shadow-white/5
      font-raleway
      ${className}
    `}>
      {/* Top Row - Connection Status & Re-Balance Button */}
      <div className="flex items-start justify-between mb-3">
        {/* Connection Status */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-white/80 text-xs font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {isConnected && address && (
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs font-mono">
                {formatAddress(address)}
              </span>
              <button
                onClick={copyToClipboard}
                className="text-white/40 hover:text-white/80 transition-colors duration-200"
                title="Copy full address"
              >
                {isCopied ? (
                  <Check size={12} className="text-green-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Re-Balance Button */}
        <button className="
          bg-white text-black rounded-lg
          px-4 py-1.5 text-xs font-medium outline-none
          transition-all duration-300 ease-out
          hover:bg-white/90 hover:shadow-md
          focus:bg-white/90 focus:ring-2 focus:ring-white/20
          active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
          hover:scale-105
          font-raleway
        ">
          Re-Balance
        </button>
      </div>

      {/* Bottom Row - Portfolio Value & P/L */}
      <div className="flex items-center h-16">
        {/* Portfolio Value */}
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-white/50 text-xs font-medium mb-1">Portfolio Value</span>
          <span className="text-white/90 text-lg font-semibold">
            {isConnected ? `$${portfolioValue}` : 'N/A'}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-4" />

        {/* Profit/Loss */}
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-white/50 text-xs font-medium mb-1">P/L (24h)</span>
          {isConnected && profitLoss ? (
            <div className="flex items-center justify-between">
              <span className={`text-lg font-semibold ${
                profitLoss.isProfit ? 'text-green-400' : 'text-red-400'
              }`}>
                {profitLoss.isProfit ? '+' : '-'}${profitLoss.value}
              </span>
              <span className={`text-xs ${
                profitLoss.isProfit ? 'text-green-400/70' : 'text-red-400/70'
              }`}>
                ({profitLoss.isProfit ? '+' : '-'}{profitLoss.percentage}%)
              </span>
            </div>
          ) : (
            <span className="text-white/90 text-lg font-semibold">
              N/A
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatisticsCard
