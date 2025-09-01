'use client'
import React, { useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Clock, Target, Zap, Building, ExternalLink, Info } from 'lucide-react'

interface VenueRecommendation {
  address: string
  name: string
  enabled: boolean
  fee_bps: number
  liquidity_threshold: string
}

interface StablecoinPair {
  stablecoin_symbol: string
  fiat_symbol: string
  stablecoin_address: string
  target_peg: string
  deviation_threshold_bps: number
}

interface BaseOpportunity {
  pair: StablecoinPair
  stablecoin_price: string
  fiat_rate: string
  deviation_bps: number
  estimated_profit: string
  trade_direction: string
  timestamp: string
}

interface ArbitrageOpportunity {
  base_opportunity: BaseOpportunity
  twap_price: string | null
  confidence_score: number
  max_trade_size: string
  venue_recommendations: VenueRecommendation[]
}

interface AdvancedOpportunitiesModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity: ArbitrageOpportunity | null
}

const AdvancedOpportunitiesModal: React.FC<AdvancedOpportunitiesModalProps> = ({
  isOpen,
  onClose,
  opportunity
}) => {
  // Tooltip information for each value
  const tooltipInfo = {
    direction: "Indicates whether to BUY or SELL to capitalize on the arbitrage opportunity. BUY when stablecoin is underpriced, SELL when overpriced.",
    deviation: "The percentage difference between the current stablecoin price and its target peg value. Higher deviation means greater arbitrage potential.",
    estimatedProfit: "The estimated profit from executing this arbitrage trade, calculated based on price differences and trade size.",
    confidence: "A score from 0-100% indicating the reliability of this opportunity based on liquidity, historical performance, and market conditions.",
    stablecoinPrice: "Current market price of the stablecoin in USD, used to calculate the deviation from the target peg.",
    fiatRate: "Current exchange rate of the paired fiat currency against USD, providing the reference rate for arbitrage calculations.",
    twapPrice: "Time-Weighted Average Price over a recent period, providing a more stable price reference to reduce noise from temporary spikes.",
    maxTradeSize: "Maximum recommended trade amount for this opportunity, calculated based on available liquidity and risk management parameters."
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen || !opportunity) return null

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price) / 1e7
    if (numPrice >= 1) {
      return numPrice.toFixed(2)
    }
    return numPrice.toFixed(4)
  }

  const formatLargeNumber = (value: string) => {
    const num = parseFloat(value) / 1e7
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toFixed(2)
  }

  const formatDeviationBps = (bps: number) => {
    return (bps / 100).toFixed(2) + '%'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString()
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 8000) return 'text-green-400'
    if (score >= 6000) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceText = (score: number) => {
    if (score >= 8000) return 'High'
    if (score >= 6000) return 'Medium'
    return 'Low'
  }

  const shortenAddress = (address: string) => {
    if (address === 'UNKNOWN_ADDRESS') return address
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="
        bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl
        w-[850px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col
        transition-all ease-out
        animate-in fade-in-0 zoom-in-95 duration-300
        shadow-xl shadow-black/20
        font-raleway
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
          <div>
            <h2 className="text-white/90 text-xl font-medium">
              Arbitrage Opportunity Details
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {opportunity.base_opportunity.pair.stablecoin_symbol} vs {opportunity.base_opportunity.pair.fiat_symbol}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white/80 transition-colors duration-200 p-2 hover:bg-white/5 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 bg-black/30 overflow-y-auto faq-scrollbar">
          <div className="p-6 space-y-6">
            
            {/* Overview and Price Information Cards - Horizontal Layout */}
            <div className="flex gap-6 h-72">
              
              {/* Overview Card - 50% Width */}
              <div className="flex-[2] bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
                <h3 className="text-white/90 font-medium text-lg mb-4 flex items-center gap-2">
                  <Target size={18} />
                  Opportunity Overview
                </h3>
                
                {/* 2x2 Grid Layout */}
                <div className="grid grid-cols-2 gap-4 h-32">
                  {/* Direction */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Direction</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.direction}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${
                      opportunity.base_opportunity.trade_direction === 'BUY' 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {opportunity.base_opportunity.trade_direction === 'BUY' 
                        ? <TrendingUp size={20} /> 
                        : <TrendingDown size={20} />
                      }
                      <span className="font-medium text-lg text-white">
                        {opportunity.base_opportunity.trade_direction}
                      </span>
                    </div>
                  </div>

                  {/* Deviation */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Deviation</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.deviation}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 font-medium text-lg">
                      {formatDeviationBps(opportunity.base_opportunity.deviation_bps)}
                    </div>
                  </div>

                  {/* Est. Profit */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Est. Profit</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.estimatedProfit}
                        </div>
                      </div>
                    </div>
                    <div className="text-white font-medium text-lg">
                      ${formatPrice(opportunity.base_opportunity.estimated_profit)}
                    </div>
                  </div>

                  {/* Confidence Score - Circular Progress */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Confidence</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.confidence}
                        </div>
                      </div>
                    </div>
                    <div className="relative w-16 h-16">
                      {/* Background Circle */}
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="rgb(255 255 255 / 0.1)"
                          strokeWidth="4"
                          fill="none"
                        />
                        {/* Progress Circle */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke={
                            opportunity.confidence_score >= 8000 
                              ? 'rgb(34 197 94)' // green-400
                              : opportunity.confidence_score >= 6000 
                              ? 'rgb(250 204 21)' // yellow-400  
                              : 'rgb(248 113 113)' // red-400
                          }
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - opportunity.confidence_score / 10000)}`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      {/* Score Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`font-bold text-sm ${
                            opportunity.confidence_score >= 8000 
                              ? 'text-green-400' 
                              : opportunity.confidence_score >= 6000 
                              ? 'text-yellow-400' 
                              : 'text-red-400'
                          }`}>
                            {(opportunity.confidence_score / 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-white/60">
                            {getConfidenceText(opportunity.confidence_score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Information Card - 50% Width */}
              <div className="flex-[2] bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
                <h3 className="text-white/90 font-medium text-lg mb-4 flex items-center gap-2">
                  <Zap size={18} />
                  Price Information
                </h3>
                
                {/* 2x2 Grid Layout */}
                <div className="grid grid-cols-2 gap-3 h-48 font-raleway">
                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">Stablecoin Price</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.stablecoinPrice}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      ${formatPrice(opportunity.base_opportunity.stablecoin_price)}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">Fiat Exchange Rate</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.fiatRate}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      ${formatPrice(opportunity.base_opportunity.fiat_rate)}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">TWAP Price</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.twapPrice}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      {opportunity.twap_price ? `$${formatPrice(opportunity.twap_price)}` : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">Max Trade Size</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.maxTradeSize}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      ${formatLargeNumber(opportunity.max_trade_size)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Recommendations */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
              <h3 className="text-white/90 font-medium text-lg mb-4 flex items-center gap-2">
                <Building size={18} />
                Recommended Trading Venues
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {opportunity.venue_recommendations.map((venue, index) => (
                  <div key={index} className="bg-black/20 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        venue.enabled ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <div className="text-white/90 font-medium text-sm">{venue.name}</div>
                        <div className="text-white/50 text-xs">
                          Fee: {(venue.fee_bps / 100).toFixed(2)}% • Min: ${formatLargeNumber(venue.liquidity_threshold)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-white/5 bg-black/10">
          
          <button 
            className="
              bg-white text-black rounded-lg
              px-4 py-2 text-sm font-medium
              transition-all duration-300 ease-out
              hover:bg-white/90 hover:shadow-md
              focus:bg-white/90 focus:ring-2 focus:ring-white/20
              active:scale-[0.98]
              font-raleway
            "
          >
            Execute Trade
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdvancedOpportunitiesModal
