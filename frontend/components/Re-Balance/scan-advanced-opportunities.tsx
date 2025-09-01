'use client'
import React, { useState, useEffect } from 'react'
import { RefreshCw, Clock, TrendingUp, TrendingDown, ExternalLink, AlertCircle } from 'lucide-react'
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
  const [autoRefresh, setAutoRefresh] = useState(true)
  
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
      
      if (data.success) {
        setOpportunities(data.data.opportunities || [])
        setLastUpdated(new Date())
        
        // Notify parent about opportunities availability
        if (onOpportunitiesChange) {
          onOpportunitiesChange((data.data.opportunities || []).length > 0)
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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    // Initial fetch
    fetchOpportunities()

    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchOpportunities()
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, onOpportunitiesChange])

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleTimeString()
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white/90 text-lg font-medium mb-1">
            Advanced Arbitrage Opportunities
          </h3>
          <p className="text-white/50 text-sm">
            Real-time arbitrage opportunities across all configured pairs
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/10 text-white/50 border border-white/20'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchOpportunities}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-white/70 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 text-sm text-white/60">
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <Clock size={14} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            opportunities.length > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
          }`} />
          {opportunities.length} opportunities found
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-red-300 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && opportunities.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-white/40 animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Scanning for opportunities...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && opportunities.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h4 className="text-white/60 font-medium mb-2">No Opportunities Found</h4>
          <p className="text-white/40 text-sm">
            No arbitrage opportunities detected at the moment.<br />
            The system will continue monitoring for new opportunities.
          </p>
        </div>
      )}

      {/* Opportunities Table - Search Modal Style */}
      {opportunities.length > 0 && (
        <div>

          <div className="space-y-1">
            {opportunities.map((opportunity, index) => (
            <div
              key={index}
              onClick={() => openModal(opportunity)}
              className="
                flex items-center justify-between
                p-3 
                bg-black/10 
                hover:bg-black/30 
                border border-white/5 
                hover:border-white/15 
                rounded-lg 
                transition-all 
                duration-300
                cursor-pointer
                group
                hover:scale-[1.02]
                transform-gpu
              "
            >
              {/* Pair */}
              <div className="flex-1 min-w-0">
                <div 
                  className="cursor-help"
                  title={`Stablecoin: $${formatPrice(opportunity.base_opportunity.stablecoin_price)} | Fiat Rate: $${formatPrice(opportunity.base_opportunity.fiat_rate)} | TWAP: $${opportunity.twap_price ? formatPrice(opportunity.twap_price) : 'N/A'} | Confidence: ${getConfidenceText(opportunity.confidence_score)} (${(opportunity.confidence_score / 100).toFixed(0)}%) | Max Size: $${formatLargeNumber(opportunity.max_trade_size)} | Venues: ${opportunity.venue_recommendations.map(v => v.name).join(', ')}`}
                >
                  <div className="text-white font-medium text-sm">
                    {opportunity.base_opportunity.pair.stablecoin_symbol}
                  </div>
                  <div className="text-white/60 text-xs">
                    vs {opportunity.base_opportunity.pair.fiat_symbol}
                  </div>
                </div>
              </div>

              {/* Direction */}
              <div className="flex-1 min-w-0 ml-4">
                <div className={`flex items-center gap-2 ${
                  opportunity.base_opportunity.trade_direction === 'BUY' 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {opportunity.base_opportunity.trade_direction === 'BUY' 
                    ? <TrendingUp size={14} /> 
                    : <TrendingDown size={14} />
                  }
                  <span className="text-sm font-medium">
                    {opportunity.base_opportunity.trade_direction}
                  </span>
                </div>
              </div>

              {/* Deviation */}
              <div className="flex-1 min-w-0 ml-4">
                <div className="text-white/90 font-medium text-sm">
                  {formatDeviationBps(opportunity.base_opportunity.deviation_bps)}
                </div>
                <div className="text-white/60 text-xs">
                  Deviation
                </div>
              </div>

              {/* Estimated Profit */}
              <div className="flex-1 min-w-0 ml-4 text-right">
                <div className="text-green-400 font-medium text-sm">
                  ${formatPrice(opportunity.base_opportunity.estimated_profit)}
                </div>
                <div className="text-white/60 text-xs">
                  Est. profit
                </div>
              </div>
            </div>
          ))}
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
