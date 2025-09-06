'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StellarWalletsKit, WalletNetwork, ISupportedWallet, xBullModule, FreighterModule, AlbedoModule } from "@creit.tech/stellar-wallets-kit"

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
  walletKit: StellarWalletsKit | null
  setAddress: (address: string | null) => void
  setIsLoading: (loading: boolean) => void
  setPortfolioValue: (value: string) => void
  setProfitLoss: (pl: { value: string; percentage: string; isProfit: boolean }) => void
  setWalletKit: (kit: StellarWalletsKit | null) => void 
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
  const [walletKit, setWalletKit] = useState<StellarWalletsKit | null>(null)

  const isConnected = Boolean(address)

  useEffect(() => {
    const storedAddress = localStorage.getItem('stellarWalletAddress')
    const storedWalletId = localStorage.getItem('stellarSelectedWallet')
    const initKit = async () => {
      try {
        const kit = new StellarWalletsKit({
          network: WalletNetwork.TESTNET,
          modules: [new xBullModule(), new FreighterModule(), new AlbedoModule()],
        })
        setWalletKit(kit)
        if (storedWalletId) {
          try {
            await kit.setWallet(storedWalletId as unknown as ISupportedWallet['id'])
          } catch {}
        }
      } catch {}
    }

    initKit()

    if (storedAddress) {
      setAddress(storedAddress)
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
    walletKit,
    setAddress,
    setIsLoading,
    setPortfolioValue,
    setProfitLoss,
    setWalletKit,
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
