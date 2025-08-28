// components/statisticscard.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { useRebalance } from '../hooks/useRebalance'
import ReBalanceModal from './Re-Balance/reBalanceModal'

interface StatisticsCardProps {
  className?: string
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ className = '' }) => {
  const { 
    address,
    isConnected,
    profitLoss
  } = useWallet()
  const { openModal } = useRebalance()

  const [portfolioValue, setPortfolioValue] = useState('0.00')
  const [balancesWithPrices, setBalancesWithPrices] = useState<{[key: string]: { balance: string, usdValue: number, price: number }}>({})
  const [tokenPrices, setTokenPrices] = useState<{[key: string]: number}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // ✅ Fetch user balance every minute when connected
  useEffect(() => {
    if (!isConnected || !address) {
      setPortfolioValue('0.00')
      setLastUpdated(null)
      return
    }

    fetchUserBalance() // Fetch immediately

    const interval = setInterval(fetchUserBalance, 60000) // Every minute

    return () => clearInterval(interval)
  }, [isConnected, address])

  const fetchUserBalance = async () => {
    if (!address || !isConnected) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_balances',
          userAddress: address,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ StatisticsCard: User balance fetched successfully through contract call:', {
          portfolioValue: data.data.portfolioValue,
          balances: data.data.balances,
          timestamp: new Date().toISOString()
        })
        
        setPortfolioValue(data.data.portfolioValue)
        setBalancesWithPrices(data.data.balancesWithPrices || {})
        setTokenPrices(data.data.tokenPrices || {})
        setLastUpdated(new Date())
      } else {
        console.error('❌ StatisticsCard: Failed to fetch user balance:', data.error)
        setPortfolioValue('0.00')
      }
    } catch (err) {
      console.error('❌ StatisticsCard: Error fetching user balance:', err)
      setPortfolioValue('0.00')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    if (address.length <= 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  return (
    <>
      <ReBalanceModal 
        portfolioValue={portfolioValue}
        balancesWithPrices={balancesWithPrices}
        tokenPrices={tokenPrices}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
      />
      <div className={`
        relative
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
            {isLoading && (
              <RefreshCw className="w-3 h-3 text-white/50 animate-spin" />
            )}
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

        {/* Re-Balance Button with Refresh */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={fetchUserBalance}
              disabled={isLoading}
              className="text-white/40 hover:text-white/80 transition-colors duration-200 disabled:opacity-50"
              title="Refresh balance"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
          
          <button 
            onClick={openModal}
            disabled={!isConnected}
            className="
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
      </div>

      {/* Bottom Row - Portfolio Value & P/L */}
      <div className="flex items-center h-16">
        {/* Portfolio Value */}
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-white/50 text-xs font-medium mb-1">Portfolio Value</span>
          <span className="text-white/90 text-lg font-semibold">
            {isConnected ? `$${portfolioValue}` : 'N/A'}
          </span>
          {lastUpdated && (
            <span className="text-white/30 text-xs">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
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
    </>
  )
}

export default StatisticsCard
