// hooks/useUserBalances.tsx
import { useState, useEffect } from 'react'
import { useWallet } from './useWallet'

interface UserBalance {
  [tokenAddress: string]: string
}

export const useUserBalances = () => {
  const { address, isConnected } = useWallet()
  const [balances, setBalances] = useState<UserBalance>({})
  const [portfolioValue, setPortfolioValue] = useState('0.00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchUserBalances = async () => {
    if (!address || !isConnected) return
    
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
        console.log('✅ useUserBalances Hook: User balance fetched successfully through contract call:', {
          balances: data.data.balances,
          portfolioValue: data.data.portfolioValue,
          timestamp: new Date().toISOString()
        })
        
        setBalances(data.data.balances)
        setPortfolioValue(data.data.portfolioValue)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch balances')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error fetching balances:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch every minute if user is connected
  useEffect(() => {
    if (!address || !isConnected) {
      setBalances({})
      setPortfolioValue('0.00')
      return
    }

    fetchUserBalances() // Fetch immediately

    const interval = setInterval(fetchUserBalances, 60000) // Every minute

    return () => clearInterval(interval)
  }, [address, isConnected])

  return {
    balances,
    portfolioValue,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchUserBalances
  }
}
