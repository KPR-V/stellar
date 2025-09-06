'use client'
import React, { useState, useEffect, useRef } from 'react'
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
  } = useWallet()
  const { openModal } = useRebalance()
  const [hasOpportunities, setHasOpportunities] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState('0.00')
  const [balancesWithPrices, setBalancesWithPrices] = useState<{[key: string]: { balance: string, usdValue: number, price: number }}>({})
  const [tokenPrices, setTokenPrices] = useState<{[key: string]: number}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [dailyProfit, setDailyProfit] = useState<number>(0)
  const [dailyProfitPercentage, setDailyProfitPercentage] = useState<number>(0)
  const [isLoadingProfit, setIsLoadingProfit] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousTotalProfitRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isConnected || !address) {
      setPortfolioValue('0.00')
      setDailyProfit(0)
      setDailyProfitPercentage(0)
      setLastUpdated(null)
        if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const savedPreviousProfit = localStorage.getItem(`stats_previous_total_profit_${address}`)
    if (savedPreviousProfit) {
      previousTotalProfitRef.current = parseFloat(savedPreviousProfit)
    }

    const savedDailyProfit = localStorage.getItem(`stats_daily_profit_${address}`)
    if (savedDailyProfit) {
      const parsedProfit = JSON.parse(savedDailyProfit)
      setDailyProfit(parsedProfit.profit)
      setDailyProfitPercentage(parsedProfit.percentage)
    }

    fetchUserBalance() 
    fetchDailyProfit() 

    const balanceInterval = setInterval(fetchUserBalance, 60000)

    intervalRef.current = setInterval(() => {
      fetchDailyProfit()
    }, 86400000)

    return () => {
      clearInterval(balanceInterval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
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
        setPortfolioValue(data.data.portfolioValue)
        setBalancesWithPrices(data.data.balancesWithPrices || {})
        setTokenPrices(data.data.tokenPrices || {})
        setLastUpdated(new Date())
      } else {
        console.error('StatisticsCard: Failed to fetch user balance:', data.error)
        setPortfolioValue('0.00')
      }
    } catch (err) {
      console.error('StatisticsCard: Error fetching user balance:', err)
      setPortfolioValue('0.00')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDailyProfit = async () => {
    if (!address) return
    
    setIsLoadingProfit(true)
    try {      
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_performance_metrics',
          userAddress: address,
        }),
      })
      const data = await response.json()

      if (data.success && data.data && data.data.metrics) {
        const currentTotalProfit = parseFloat(data.data.metrics.total_profit_loss || '0')
        let calculatedDailyProfit = 0
        let calculatedPercentage = 0

        if (previousTotalProfitRef.current !== null) {
          calculatedDailyProfit = currentTotalProfit - previousTotalProfitRef.current
          const currentPortfolioValue = parseFloat(portfolioValue) || 0
          if (currentPortfolioValue > 0 && Math.abs(calculatedDailyProfit) > 0.01) {
            calculatedPercentage = (calculatedDailyProfit / currentPortfolioValue) * 100
          }
          setDailyProfit(calculatedDailyProfit)
          setDailyProfitPercentage(calculatedPercentage)

          const profitData = {
            profit: calculatedDailyProfit,
            percentage: calculatedPercentage,
            timestamp: Date.now()
          }
          localStorage.setItem(`stats_daily_profit_${address}`, JSON.stringify(profitData))
        }
        previousTotalProfitRef.current = currentTotalProfit
        localStorage.setItem(`stats_previous_total_profit_${address}`, currentTotalProfit.toString())

      } else {
        console.error('StatisticsCard: Failed to fetch performance metrics:', data.error)
      }
    } catch (error) {
      console.error('StatisticsCard: Error fetching daily profit:', error)
    } finally {
      setIsLoadingProfit(false)
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
        userAddress={address || ''}
      />
      <div className={`relative bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 w-96 h-36 transition-all duration-300 ease-out hover:border-white/30 hover:bg-black/35 hover:shadow-lg hover:shadow-white/5 font-raleway ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
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
            className={`relative overflow-hidden bg-white text-black rounded-lg px-4 py-1.5 text-xs font-medium outline-none transition-all duration-300 ease-out hover:bg-white/90 hover:shadow-md focus:bg-white/90 focus:ring-2 focus:ring-white/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 font-raleway
              ${hasOpportunities && isConnected ? 'ring-2 ring-green-400/80 shadow-lg shadow-green-400/30 animate-pulse' : ''}
            `}
          >
            {hasOpportunities && isConnected && (
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/20 via-green-300/30 to-green-400/20 animate-ping"></div>
            )}
            <span className="relative z-10">Re-Balance</span>
          </button>
        </div>
      </div>

      <div className="flex items-center h-16">
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-white/50 text-xs font-medium mb-1">Portfolio Value</span>
          <span className="text-white/90 text-lg font-semibold">
            {isConnected ? `$${portfolioValue}` : 'N/A'}
          </span>
        </div>

        <div className="w-px h-20 bg-gradient-to-b from-transparent via-white/20 to-transparent mx-4" />

        <div className="flex-1 flex flex-col justify-center">
          <span className="text-white/50 text-xs font-medium mb-1">P/L (24h)</span>
          {isConnected ? (
            isLoadingProfit ? (
              <div className="text-white/40 text-lg font-semibold">
                Loading...
              </div>
            ) : (dailyProfit !== 0 || dailyProfitPercentage !== 0) ? (
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${
                  dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {dailyProfit >= 0 ? '+' : ''}${Math.abs(dailyProfit).toFixed(2)}
                </span>
                <span className={`text-xs ${
                  dailyProfit >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                }`}>
                  ({dailyProfitPercentage >= 0 ? '+' : ''}{dailyProfitPercentage.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <span className="text-white/90 text-lg font-semibold">
                $0.00
              </span>
            )
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
