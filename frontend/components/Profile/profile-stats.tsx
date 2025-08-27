// components/profile/profile-stats.tsx
import React, { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'

interface ProfileStatsProps {
  isActive: boolean
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ isActive }) => {
  const { address } = useWallet()
  const [balances, setBalances] = useState<{[key: string]: string}>({})
  const [portfolioValue, setPortfolioValue] = useState('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ✅ Fetch balances when component becomes active and every minute
  useEffect(() => {
    if (!isActive || !address) return

    fetchUserBalance() // Fetch immediately

    const interval = setInterval(fetchUserBalance, 60000) // Every minute

    return () => clearInterval(interval)
  }, [isActive, address])

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
        console.log('✅ User balance fetched successfully through contract call:', {
          balances: data.data.balances,
          portfolioValue: data.data.portfolioValue,
          timestamp: new Date().toISOString()
        })
        
        setBalances(data.data.balances)
        setPortfolioValue(data.data.portfolioValue)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch balances')
        console.error('❌ Failed to fetch user balance:', data.error)
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('❌ Error fetching user balance:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatBalance = (balance: string, decimals: number = 7) => {
    const num = parseFloat(balance) / Math.pow(10, decimals)
    return num.toFixed(4)
  }

  const getTokenSymbol = (tokenAddress: string) => {
    const tokenMap: { [key: string]: string } = {
      'native': 'XLM',
      'default': 'Unknown'
    }
    return tokenMap[tokenAddress] || tokenAddress.slice(0, 6) + '...'
  }

  const calculatePercentage = (balance: string, total: string) => {
    const balanceNum = parseFloat(balance)
    const totalNum = parseFloat(total)
    if (totalNum === 0) return '0'
    return ((balanceNum / totalNum) * 100).toFixed(1)
  }

  const totalBalance = Object.values(balances).reduce((sum, balance) => {
    return sum + parseFloat(balance)
  }, 0)

  return (
    <div className="p-6 space-y-6 font-raleway">
      {/* Header with refresh status */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-white/90 text-lg">Portfolio Statistics</h3>
        <div className="text-xs text-white/50">
          {isLoading && 'Updating...'}
          {lastUpdated && !isLoading && `Updated: ${lastUpdated.toLocaleTimeString()}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-sm font-medium mb-2">Total Balance</h4>
          <p className="text-3xl font-light text-white/95 font-raleway">
            ${portfolioValue}
          </p>
          <p className="text-xs text-white/40 mt-2">+0.00% (24h)</p>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-sm font-medium mb-2">Total Assets</h4>
          <p className="text-3xl font-light text-white/95 font-raleway">
            {Object.keys(balances).length}
          </p>
          <p className="text-xs text-white/40 mt-2">From Contract</p>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
        <h4 className="text-white/60 text-sm font-medium mb-4">Portfolio Breakdown</h4>
        
        {error && (
          <div className="text-red-400 text-xs mb-4 p-3 bg-red-400/10 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {Object.keys(balances).length === 0 && !isLoading ? (
            <div className="text-white/50 text-sm text-center py-4">
              {address ? 'No contract balances found. Initialize your account first.' : 'Connect wallet to view balances'}
            </div>
          ) : (
            Object.entries(balances).map(([tokenAddress, balance]) => (
              <div key={tokenAddress} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                <span className="text-white/70 text-sm font-medium">
                  {getTokenSymbol(tokenAddress)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-white/80 text-sm">
                    {formatBalance(balance)}
                  </span>
                  <span className="text-white/40 text-xs bg-white/5 px-2 py-1 rounded-full">
                    {calculatePercentage(balance, totalBalance.toString())}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-xs font-medium mb-1">24h Change</h4>
          <p className="text-lg font-light text-green-400">+0.00%</p>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-xs font-medium mb-1">Contract Balance</h4>
          <p className="text-lg font-light text-white/95">
            {totalBalance > 0 ? formatBalance(totalBalance.toString(), 2) : '0.00'} Total
          </p>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-white/8 transition-all duration-300">
          <h4 className="text-white/60 text-xs font-medium mb-1">Active Assets</h4>
          <p className="text-lg font-light text-white/95">{Object.keys(balances).length}</p>
        </div>
      </div>
    </div>
  )
}

export default ProfileStats
