"use client"
import React, { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'
import PortfolioPieChart from '../piechart'
import ProfitChart from './ProfitChart'

interface ProfileStatsProps {
  isActive: boolean
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ isActive }) => {
  const { address } = useWallet()
  const [balances, setBalances] = useState<{[key: string]: string}>({})
  const [balancesWithPrices, setBalancesWithPrices] = useState<{[key: string]: { balance: string, usdValue: number, price: number }}>({})
  const [tokenPrices, setTokenPrices] = useState<{[key: string]: number}>({})
  const [portfolioValue, setPortfolioValue] = useState('0.00')
  const [previousPortfolioValue, setPreviousPortfolioValue] = useState('0.00')
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (!isActive || !address) return

    fetchUserBalance()
    fetchPerformanceMetrics()

    const interval = setInterval(() => {
      fetchUserBalance()
      fetchPerformanceMetrics()
    }, 120000)

    return () => clearInterval(interval)
  }, [isActive, address])

  useEffect(() => {
    const stored24hValue = localStorage.getItem(`portfolio_24h_${address}`)
    const stored24hTimestamp = localStorage.getItem(`portfolio_24h_timestamp_${address}`)
    if (stored24hValue && stored24hTimestamp) {
      const timestamp = parseInt(stored24hTimestamp)
      const now = Date.now()
      const hoursDiff = (now - timestamp) / (1000 * 60 * 60)
      if (hoursDiff >= 24) {
        localStorage.setItem(`portfolio_24h_${address}`, portfolioValue)
        localStorage.setItem(`portfolio_24h_timestamp_${address}`, now.toString())
        setPreviousPortfolioValue(portfolioValue)
      } else {
        setPreviousPortfolioValue(stored24hValue)
      }
    } else if (portfolioValue !== '0.00') {
      localStorage.setItem(`portfolio_24h_${address}`, portfolioValue)
      localStorage.setItem(`portfolio_24h_timestamp_${address}`, Date.now().toString())
      setPreviousPortfolioValue(portfolioValue)
    }
  }, [portfolioValue, address])

  const fetchUserBalance = async () => {
    if (!address) return
    setIsLoading(true)
    setError(null)
    
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
        setBalances(data.data.balances)
        setBalancesWithPrices(data.data.balancesWithPrices || {})
        setTokenPrices(data.data.tokenPrices || {})
        setPortfolioValue(data.data.portfolioValue)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch balances')
        console.error('Failed to fetch user balance:', data.error)
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error fetching user balance:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPerformanceMetrics = async () => {
    if (!address) return
    
    setIsLoadingMetrics(true)
    
    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_performance_metrics',
          userAddress: address,
          days: 30
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setPerformanceMetrics(data.data.metrics)
      } else {
        console.error('Failed to fetch performance metrics:', data.error)
        setPerformanceMetrics({
          total_trades: 0,
          successful_trades: 0,
          total_profit: '0',
          total_volume: '0',
          success_rate: '0.00',
          win_rate: '0.00',
          avg_profit_per_trade: '0',
          period_days: 30
        })
      }
    } catch (err) {
      console.error('Error fetching performance metrics:', err)
      setPerformanceMetrics({
        total_trades: 0,
        successful_trades: 0,
        total_profit: '0',
        total_volume: '0',
        success_rate: '0.00',
        win_rate: '0.00',
        avg_profit_per_trade: '0',
        period_days: 30
      })
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  const calculate24hChange = () => {
    const current = parseFloat(portfolioValue)
    const previous = parseFloat(previousPortfolioValue)
    if (previous === 0) return { percentage: 0, isPositive: true }    
    const change = ((current - previous) / previous) * 100
    return {
      percentage: Math.abs(change),
      isPositive: change >= 0
    }
  }

  const change24h = calculate24hChange()

  return (
    <div className="pt-6 pr-6 pl-6 space-y-6 font-raleway pb-28">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white/80 text-lg">Portfolio Statistics</h3>
        <div className="text-xs text-white/50">
          {isLoading && 'Updating...'}
          {lastUpdated && !isLoading && `Updated: ${lastUpdated.toLocaleTimeString()}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15 hover:border-white/25 transition-all duration-300">
          <h4 className="text-white/80 text-sm font-medium mb-2">Total Balance</h4>
          <p className="text-3xl font-bold text-white/95 font-raleway">
            ${portfolioValue}
          </p>
          <p className={`text-xs mt-2 ${change24h.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {change24h.isPositive ? '+' : '-'}{change24h.percentage.toFixed(2)}% (24h)
          </p>
          
          <div className="mt-4">
            <ProfitChart 
              userAddress={address || ''} 
              className="w-full"
            />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <PortfolioPieChart
            balancesWithPrices={balancesWithPrices}
            portfolioValue={portfolioValue}
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15 hover:border-white/25 transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-white/80 text-sm font-medium">Trading Performance (30 days)</h4>
          <div className="text-xs text-white/50">
            {isLoadingMetrics && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>
        
        {!performanceMetrics && !isLoadingMetrics ? (
          <div className="text-center py-8">
            <div className="text-white/60 text-sm mb-1">No trading data available</div>
            <div className="text-white/40 text-xs">Start trading to see your performance metrics</div>
          </div>
        ) : performanceMetrics ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Total Trades</div>
                <div className="text-white/90 text-lg font-medium">{performanceMetrics.total_trades}</div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Win Rate</div>
                <div className="text-white/90 text-lg font-medium">{performanceMetrics.win_rate}%</div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Total Profit</div>
                <div className={`text-lg font-medium ${parseFloat(performanceMetrics.total_profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${(parseFloat(performanceMetrics.total_profit) / 1e7).toFixed(4)}
                </div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Avg Profit/Trade</div>
                <div className={`text-lg font-medium ${parseFloat(performanceMetrics.avg_profit_per_trade) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${(parseFloat(performanceMetrics.avg_profit_per_trade) / 1e7).toFixed(4)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Successful Trades</div>
                <div className="text-white/90 text-sm">{performanceMetrics.successful_trades} / {performanceMetrics.total_trades}</div>
              </div>
              
              <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                <div className="text-white/50 text-xs mb-1">Total Volume</div>
                <div className="text-white/90 text-sm">${(parseFloat(performanceMetrics.total_volume) / 1e7).toFixed(2)}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default ProfileStats
