// components/profile/profile-stats.tsx
import React, { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'

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

  // Store previous portfolio value for 24h change calculation
  useEffect(() => {
    const stored24hValue = localStorage.getItem(`portfolio_24h_${address}`)
    const stored24hTimestamp = localStorage.getItem(`portfolio_24h_timestamp_${address}`)
    
    if (stored24hValue && stored24hTimestamp) {
      const timestamp = parseInt(stored24hTimestamp)
      const now = Date.now()
      const hoursDiff = (now - timestamp) / (1000 * 60 * 60)
      
      if (hoursDiff >= 24) {
        // If it's been 24 hours, update the stored value
        localStorage.setItem(`portfolio_24h_${address}`, portfolioValue)
        localStorage.setItem(`portfolio_24h_timestamp_${address}`, now.toString())
        setPreviousPortfolioValue(portfolioValue)
      } else {
        setPreviousPortfolioValue(stored24hValue)
      }
    } else if (portfolioValue !== '0.00') {
      // First time - store current value as baseline
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
        console.log('✅ User balance fetched successfully through contract call:', {
          balances: data.data.balances,
          balancesWithPrices: data.data.balancesWithPrices,
          tokenPrices: data.data.tokenPrices,
          portfolioValue: data.data.portfolioValue,
          timestamp: new Date().toISOString()
        })
        
        setBalances(data.data.balances)
        setBalancesWithPrices(data.data.balancesWithPrices || {})
        setTokenPrices(data.data.tokenPrices || {})
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

  // Enhanced token mapping with comprehensive list
  const getTokenInfo = (tokenAddress: string) => {
    // Debug logging to see exact addresses
    console.log('Token address received:', `"${tokenAddress}"`, 'Length:', tokenAddress.length);
    
    const tokenMap: { [key: string]: { symbol: string, name: string } } = {
      // Native
      'native': { symbol: 'XLM', name: 'Stellar Lumens' },
      
      // Current active SAC addresses (confirmed by user)
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGCN6FM': { symbol: 'XLM', name: 'Stellar Lumens' },
      'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': { symbol: 'USDC', name: 'USD Coin' },
      'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ': { symbol: 'EURC', name: 'Euro Coin' },
      
      // Alternative SAC addresses
      'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2DA2KTP5PS': { symbol: 'USDC', name: 'USD Coin' },
      
      // Known testnet issuer addresses
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': { symbol: 'USDC', name: 'USD Coin' },
      'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': { symbol: 'EURC', name: 'Euro Coin' },
      
      // Mainnet common tokens (for future reference)
      'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA': { symbol: 'USDC', name: 'USD Coin (Mainnet)' },
      'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU': { symbol: 'USDC', name: 'USD Coin' }
    }
    
    // Clean the token address (remove any whitespace)
    const cleanAddress = tokenAddress.trim();
    
    // Check for exact match first
    if (tokenMap[cleanAddress]) {
      console.log('Found exact match for:', cleanAddress, '→', tokenMap[cleanAddress]);
      return tokenMap[cleanAddress];
    }
    
    // Check for partial matches (in case of different address format)
    for (const [key, value] of Object.entries(tokenMap)) {
      if (key.startsWith(cleanAddress.slice(0, 8)) || cleanAddress.startsWith(key.slice(0, 8))) {
        console.log('Found partial match for:', cleanAddress, '→', value);
        return value;
      }
    }
    
    console.log('No match found for address:', cleanAddress);
    return { 
      symbol: tokenAddress.slice(0, 8) + '...', 
      name: 'Unknown Token' 
    }
  }

  const calculatePercentage = (balance: string, total: string) => {
    const balanceNum = parseFloat(balance)
    const totalNum = parseFloat(total)
    if (totalNum === 0) return '0'
    return ((balanceNum / totalNum) * 100).toFixed(1)
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

  const totalBalance = Object.values(balances).reduce((sum, balance) => {
    return sum + parseFloat(balance)
  }, 0)

  const change24h = calculate24hChange()

  return (
    <div className="p-6 space-y-6 my-8 font-raleway">
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
          <p className={`text-xs mt-2 ${change24h.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {change24h.isPositive ? '+' : '-'}{change24h.percentage.toFixed(2)}% (24h)
          </p>
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
            Object.entries(balancesWithPrices).length > 0 ? (
              // Show balances with USD prices when available
              Object.entries(balancesWithPrices).map(([tokenAddress, data]) => {
                const tokenInfo = getTokenInfo(tokenAddress)
                const balanceAmount = parseFloat(data.balance) / 10000000 // Convert from stroops
                const totalPortfolioUsd = parseFloat(portfolioValue)
                const percentage = totalPortfolioUsd > 0 ? ((data.usdValue / totalPortfolioUsd) * 100).toFixed(1) : '0'
                
                return (
                  <div key={tokenAddress} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/90 text-sm font-medium">
                        {tokenInfo.symbol}
                      </span>
                      <span className="text-white/50 text-xs">
                        {tokenInfo.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-white/80 text-sm">
                          {balanceAmount.toFixed(4)} {tokenInfo.symbol}
                        </div>
                        <div className="text-white/50 text-xs">
                          ${data.usdValue.toFixed(2)} @ ${data.price.toFixed(4)}
                        </div>
                      </div>
                      <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-1 rounded-full border border-blue-400/20">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              // Fallback to old format when price data not available
              Object.entries(balances).map(([tokenAddress, balance]) => {
                const tokenInfo = getTokenInfo(tokenAddress)
                const percentage = calculatePercentage(balance, totalBalance.toString())
                
                return (
                  <div key={tokenAddress} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/90 text-sm font-medium">
                        {tokenInfo.symbol}
                      </span>
                      <span className="text-white/50 text-xs">
                        {tokenInfo.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/80 text-sm">
                        {formatBalance(balance)}
                      </span>
                      <span className="text-blue-400 text-xs bg-blue-400/10 px-2 py-1 rounded-full border border-blue-400/20">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileStats
