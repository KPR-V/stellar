'use client'
import React, { useState, useEffect } from 'react'
import { RefreshCw, Clock, TrendingUp, TrendingDown, ExternalLink, AlertCircle } from 'lucide-react'

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
    const numPrice = parseFloat(price)
    if (numPrice >= 1) {
      return numPrice.toFixed(4)
    }
    return numPrice.toFixed(6)
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

      {/* Opportunities Table */}
      {opportunities.length > 0 && (
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Pair</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Direction</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Deviation</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Est. Profit</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Confidence</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Max Size</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Venues</th>
                  <th className="text-left p-4 text-white/70 font-medium text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    {/* Pair */}
                    <td className="p-4">
                      <div className="text-white/90 font-medium text-sm">
                        {opportunity.base_opportunity.pair.stablecoin_symbol}
                      </div>
                      <div className="text-white/50 text-xs">
                        vs {opportunity.base_opportunity.pair.fiat_symbol}
                      </div>
                    </td>

                    {/* Direction */}
                    <td className="p-4">
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
                    </td>

                    {/* Deviation */}
                    <td className="p-4">
                      <span className="text-white/90 text-sm font-mono">
                        {formatDeviationBps(opportunity.base_opportunity.deviation_bps)}
                      </span>
                    </td>

                    {/* Estimated Profit */}
                    <td className="p-4">
                      <span className="text-green-400 text-sm font-mono">
                        ${formatPrice(opportunity.base_opportunity.estimated_profit)}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="p-4">
                      <div className={`${getConfidenceColor(opportunity.confidence_score)}`}>
                        <span className="text-sm font-medium">
                          {getConfidenceText(opportunity.confidence_score)}
                        </span>
                        <div className="text-xs opacity-70">
                          {(opportunity.confidence_score / 100).toFixed(0)}%
                        </div>
                      </div>
                    </td>

                    {/* Max Trade Size */}
                    <td className="p-4">
                      <span className="text-white/70 text-sm font-mono">
                        ${formatPrice(opportunity.max_trade_size)}
                      </span>
                    </td>

                    {/* Venues */}
                    <td className="p-4">
                      <div className="space-y-1">
                        {opportunity.venue_recommendations.slice(0, 2).map((venue, venueIndex) => (
                          <div key={venueIndex} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${
                              venue.enabled ? 'bg-green-400' : 'bg-gray-500'
                            }`} />
                            <span className="text-white/60">{venue.name}</span>
                          </div>
                        ))}
                        {opportunity.venue_recommendations.length > 2 && (
                          <div className="text-xs text-white/40">
                            +{opportunity.venue_recommendations.length - 2} more
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Time */}
                    <td className="p-4">
                      <span className="text-white/50 text-xs">
                        {formatTimestamp(opportunity.base_opportunity.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanAdvancedOpportunities
