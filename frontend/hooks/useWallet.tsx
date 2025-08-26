'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WalletContextType {
  address: string | null
  isConnected: boolean
  isLoading: boolean
  portfolioValue: string
  profitLoss: {
    value: string
    percentage: string
    isProfit: boolean
  }
  setAddress: (address: string | null) => void
  setIsLoading: (loading: boolean) => void
  setPortfolioValue: (value: string) => void
  setProfitLoss: (pl: { value: string; percentage: string; isProfit: boolean }) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState('0.00')
  const [profitLoss, setProfitLoss] = useState({
    value: '0.00',
    percentage: '0.00',
    isProfit: true
  })

  const isConnected = Boolean(address)

  // Check stored wallet address on mount
  useEffect(() => {
    const storedAddress = localStorage.getItem('stellarWalletAddress')
    if (storedAddress) {
      setAddress(storedAddress)
      // Set hardcoded values for stored wallet
      setPortfolioValue('0.00')
      setProfitLoss({
        value: '0.00',
        percentage: '0.00',
        isProfit: true
      })
    }
  }, [])

  const value: WalletContextType = {
    address,
    isConnected,
    isLoading,
    portfolioValue,
    profitLoss,
    setAddress,
    setIsLoading,
    setPortfolioValue,
    setProfitLoss,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
