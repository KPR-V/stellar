"use client"

import React, { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import CryptoChart from './cryptochart'

interface AdvancedCryptoDataProps {
  isOpen: boolean
  onClose: () => void
  cryptoData: CryptoData | null
}

interface CryptoData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  total_volume: number
  price_change_percentage_24h: number
  market_cap_change_percentage_24h: number
  circulating_supply: number
  total_supply: number | null
  max_supply: number | null
  high_24h: number
  low_24h: number
  price_change_24h: number
  market_cap_change_24h: number
  fully_diluted_valuation: number
  ath: number
  ath_change_percentage: number
  ath_date: string
  atl: number
  atl_change_percentage: number
  atl_date: string
  last_updated: string
}

export default function AdvancedCryptoDataModal({ isOpen, onClose, cryptoData }: AdvancedCryptoDataProps) {
  if (!isOpen || !cryptoData) return null

  const isTokenData = cryptoData.current_price === 0 && cryptoData.market_cap === 0
  const [enhancedData, setEnhancedData] = useState<CryptoData | null>(null)
  const [loadingEnhanced, setLoadingEnhanced] = useState(false)

  useEffect(() => {
    if (isTokenData && isOpen && cryptoData) {
      fetchEnhancedTokenData()
    }
  }, [isTokenData, isOpen, cryptoData])

  const fetchEnhancedTokenData = async () => {
    setLoadingEnhanced(true)
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=250&sparkline=false`
      )
      
      if (response.ok) {
        const marketData = await response.json()
        const matchedCoin = marketData.find((coin: any) => 
          coin.symbol.toLowerCase() === cryptoData.symbol.toLowerCase() ||
          coin.name.toLowerCase() === cryptoData.name.toLowerCase()
        )
        if (matchedCoin) {
          setEnhancedData(matchedCoin)
        }
      }
    } catch (error) {
      console.error('Failed to fetch enhanced token data:', error)
    } finally {
      setLoadingEnhanced(false)
    }
  }

  const displayData = enhancedData || cryptoData

  const formatLargeNumber = (number: number) => {
    if (number >= 1e12) {
      return `$${(number / 1e12).toFixed(2)}T`
    } else if (number >= 1e9) {
      return `$${(number / 1e9).toFixed(2)}B`
    } else if (number >= 1e6) {
      return `$${(number / 1e6).toFixed(2)}M`
    } else if (number >= 1e3) {
      return `$${(number / 1e3).toFixed(2)}K`
    }
    return `$${number.toFixed(2)}`
  }

  const formatSupply = (supply: number) => {
    if (supply >= 1e9) {
      return `${(supply / 1e9).toFixed(2)}B`
    } else if (supply >= 1e6) {
      return `${(supply / 1e6).toFixed(2)}M`
    } else if (supply >= 1e3) {
      return `${(supply / 1e3).toFixed(2)}K`
    }
    return supply.toLocaleString()
  }

  const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0
    return {
      value: `${isPositive ? '+' : ''}${percentage.toFixed(2)}%`,
      isPositive,
      color: isPositive ? 'text-green-400' : 'text-red-400'
    }
  }

  const marketCapChange = formatPercentage(displayData.market_cap_change_percentage_24h)
  const volumeChange = formatPercentage(displayData.price_change_percentage_24h * 0.7) // Simulated
  const supplyChangePercentage = displayData.total_supply ? ((displayData.circulating_supply / displayData.total_supply) - 1) * 100 : 0
  const supplyChange = formatPercentage(supplyChangePercentage)

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-3xl z-[10000] font-raleway flex justify-center items-center">
      <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl w-[800px] max-h-[80vh] overflow-hidden absolute top-1/2">
        <div className="flex items-center justify-between p-6 border-b border-white/15 bg-black/20">
          <div className="flex items-center space-x-4">
            <img src={displayData.image} alt={displayData.name} className="w-12 h-12 rounded-full" />
            <div>
              <h2 className="text-white/90 font-raleway font-medium text-2xl">
                {displayData.name}
              </h2>
              <p className="text-white/60 text-sm">
                {displayData.market_cap_rank > 0 ? `Market Cap Rank #${displayData.market_cap_rank}` : displayData.symbol.toUpperCase()}
              </p>
              {isTokenData && loadingEnhanced && (
                <p className="text-white/40 text-xs">Loading market data...</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white/90 transition-all duration-300 p-2 hover:bg-white/5 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-black/30 overflow-y-auto max-h-[calc(80vh-120px)] faq-scrollbar">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-black/20 border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/70 text-sm font-medium">Market Cap</h3>
                {marketCapChange.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-white text-xl font-bold mb-1">
                {displayData.market_cap > 0 ? formatLargeNumber(displayData.market_cap) : 'N/A'}
              </div>
              <div className={`text-sm font-medium ${marketCapChange.color}`}>
                {displayData.market_cap_change_percentage_24h !== 0 ? marketCapChange.value : 'N/A'}
              </div>
            </div>

            <div className="bg-black/20 border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/70 text-sm font-medium">24H Volume</h3>
                {volumeChange.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-white text-xl font-bold mb-1">
                {displayData.total_volume > 0 ? formatLargeNumber(displayData.total_volume) : 'N/A'}
              </div>
              <div className={`text-sm font-medium ${volumeChange.color}`}>
                {displayData.price_change_percentage_24h !== 0 ? volumeChange.value : 'N/A'}
              </div>
            </div>

            <div className="bg-black/20 border border-white/10 rounded-lg p-4 hover:bg-black/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white/70 text-sm font-medium">Circulating Supply</h3>
                {supplyChange.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="text-white text-xl font-bold mb-1">
                {displayData.circulating_supply > 0 ? formatSupply(displayData.circulating_supply) : 'N/A'}
              </div>
              <div className="text-white/60 text-sm">
                {displayData.symbol.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="mt-6">
            {isTokenData && !enhancedData ? (
              <div className="bg-black/20 border border-white/10 rounded-xl p-6">
                <div className="text-white/70 text-center">
                  <p className="mb-2">Chart data not available for this token</p>
                  <p className="text-sm text-white/50">
                    Token from specific network - limited data available
                  </p>
                </div>
              </div>
            ) : (
              <CryptoChart
                coinId={displayData.id}
                coinName={displayData.name}
                coinSymbol={displayData.symbol}
                currentPrice={displayData.current_price}
                priceChangePercentage={displayData.price_change_percentage_24h}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
