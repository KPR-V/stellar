'use client'
import React, { useState, useEffect } from 'react'
import { Clock, TrendingUp, TrendingDown, AlertCircle, Info, X } from 'lucide-react'
import useAdvancedOpportunities from '../../hooks/useAdvancedOpportunities'
import AdvancedOpportunitiesModal from './advanced-opportunities-modal'

interface VenueRecommendation {
  address: string
  name: string
  enabled: boolean
  fee_bps: number
  liquidity_threshold: string
}

interface StablecoinPair {
  base_asset_address: string
  base_asset_symbol: string
  deviation_threshold_bps: number
  quote_asset_address: string
  quote_asset_symbol: string
  target_peg: string
}

interface BaseOpportunity {
  pair: StablecoinPair
  stablecoin_price: string
  fiat_rate: string
  deviation_bps: number
  estimated_profit: string
  trade_direction: string
  timestamp: number
}

interface ArbitrageOpportunity {
  base_opportunity: BaseOpportunity
  twap_price: string | null
  confidence_score: number
  max_trade_size: string
  venue_recommendations: VenueRecommendation[]
}

interface ScanAdvancedOpportunitiesProps {
  onOpportunitiesChange?: (hasOpportunities: boolean) => void
}

const ScanAdvancedOpportunities: React.FC<ScanAdvancedOpportunitiesProps> = ({
  onOpportunitiesChange
}) => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPairsTooltip, setShowPairsTooltip] = useState(false)
  const [pairs, setPairs] = useState<StablecoinPair[]>([])
  const [isPairsLoading, setIsPairsLoading] = useState(false)
  
  // Use the advanced opportunities hook
  const { isModalOpen, selectedOpportunity, openModal, closeModal } = useAdvancedOpportunities()

  const fetchOpportunities = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'scan_advanced_opportunities',
        }),
      })

      const data = await response.json()
      
      console.log('API Response:', data) // Debug log
      
      if (data.success) {
        // Handle the correct response structure
        const opportunities = data.data?.opportunities || []
        console.log('Parsed opportunities:', opportunities) // Debug log
        setOpportunities(opportunities)
        setLastUpdated(new Date())
        
        // Notify parent about opportunities availability
        if (onOpportunitiesChange) {
          onOpportunitiesChange(opportunities.length > 0)
        }
      } else {
        setError(data.error || 'Failed to fetch opportunities')
        setOpportunities([])
        if (onOpportunitiesChange) {
          onOpportunitiesChange(false)
        }
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err)
      setError('Network error while fetching opportunities')
      setOpportunities([])
      if (onOpportunitiesChange) {
        onOpportunitiesChange(false)
      }
    } finally {
      setIsLoading(false)
    }
  }



  // Auto-refresh every 120 seconds
  useEffect(() => {
    // Initial fetch
    fetchOpportunities()

    const interval = setInterval(() => {
      fetchOpportunities()
    }, 120000) // 120 seconds

    return () => clearInterval(interval)
  }, [onOpportunitiesChange])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString()
  }

  const formatDeviationBps = (bps: number) => {
    return (bps / 100).toFixed(2) + '%'
  }

  const formatPrice = (price: string) => {
    // Convert from contract format (scaled by 10^7) to USD
    const numPrice = parseFloat(price) / 1e7
    if (numPrice >= 1) {
      return numPrice.toFixed(2)
    }
    return numPrice.toFixed(4)
  }

  const formatLargeNumber = (value: string) => {
    // Convert from contract format to readable USD format
    const num = parseFloat(value) / 1e7
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toFixed(2)
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

  return (
    <div className="p-6 space-y-6 font-raleway">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white/80 text-lg font-medium mb-1">
            Arbitrage Opportunities
          </h3>
          <div className="flex items-center gap-2 relative">
            <p className="text-white/40 text-sm">
              Real-time opportunities across configured pairs
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 text-sm text-white/50">
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={14} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            opportunities.length > 0 ? 'bg-white/50' : 'bg-white/20'
          }`} />
          {opportunities.length} opportunities found
        </div>
      </div>      {/* Error */}
      {error && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 text-white/70">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-white/60 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && opportunities.length === 0 && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50 text-base">Scanning for opportunities...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && opportunities.length === 0 && (
        <div className="text-center py-16">
          <TrendingUp className="w-16 h-16 text-white/20 mx-auto mb-6" />
          <h4 className="text-white/60 font-medium text-lg mb-3">No Opportunities Found</h4>
          <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
            No arbitrage opportunities detected at the moment.<br />
            The system will continue monitoring for new opportunities.
          </p>
        </div>
      )}

      {/* Opportunities Table - Modern Search Modal Style */}
      {opportunities.length > 0 && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center px-6 py-3 border-b border-white/5 bg-black/20">
            <div className="flex-1 text-white/60 text-sm font-medium">Pair</div>
            <div className="w-24 text-center text-white/60 text-sm font-medium">Direction</div>
            <div className="w-28 text-right text-white/60 text-sm font-medium">Profit</div>
            <div className="w-24 text-right text-white/60 text-sm font-medium">Deviation</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {opportunities.map((opportunity, index) => {
              // Safety check for opportunity structure
              if (!opportunity?.base_opportunity?.pair) {
                console.warn(`Opportunity ${index} is missing required data:`, opportunity)
                return null
              }
              
              return (
              <div
                key={index}
                onClick={() => openModal(opportunity)}
                className="
                  flex items-center
                  px-6 py-4
                  hover:bg-black/30 
                  transition-all 
                  duration-200
                  cursor-pointer
                  group
                "
              >
                {/* Pair */}
                <div className="flex-1 min-w-0">
                  <div className="text-white/80 font-medium text-base group-hover:text-white/90 transition-colors">
                    {opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'}/{opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}
                  </div>
                  <div className="text-white/40 text-sm mt-0.5 group-hover:text-white/50 transition-colors">
                    {opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'} → {opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}
                  </div>
                </div>

                {/* Direction */}
                <div className="w-24 flex justify-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    opportunity.base_opportunity.trade_direction === 'BUY' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {opportunity.base_opportunity.trade_direction || 'N/A'}
                  </div>
                </div>

                {/* Estimated Profit */}
                <div className="w-28 text-right">
                  <div className="text-white/80 font-medium text-base group-hover:text-white/90 transition-colors">
                    ${formatLargeNumber(opportunity.base_opportunity.estimated_profit || '0')}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5 group-hover:text-white/40 transition-colors">
                    Estimated
                  </div>
                </div>

                {/* Deviation */}
                <div className="w-24 text-right">
                  <div className="text-white/80 font-medium text-base group-hover:text-white/90 transition-colors">
                    {formatDeviationBps(opportunity.base_opportunity.deviation_bps || 0)}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5 group-hover:text-white/40 transition-colors">
                    Deviation
                  </div>
                </div>
              </div>
              )
            }).filter(Boolean)}
          </div>
        </div>
      )}

    {/* Advanced Opportunities Modal */}
    <AdvancedOpportunitiesModal
      isOpen={isModalOpen}
      onClose={closeModal}
      opportunity={selectedOpportunity}
    />
    
    </div>
  )
}

export default ScanAdvancedOpportunities
