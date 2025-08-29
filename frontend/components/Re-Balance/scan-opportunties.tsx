'use client'
import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Clock, DollarSign, BarChart3 } from 'lucide-react'

interface ArbitrageOpportunity {
  base_opportunity: {
    pair: {
      stablecoin_symbol: string
      stablecoin_address: string
      fiat_symbol: string
    }
    stablecoin_price: string
    fiat_rate: string
    deviation_bps: number
    estimated_profit: string
    trade_direction: string
    timestamp: string
  }
  cross_rate_data: {
    primary_rate: string
    secondary_rate: string
    deviation_bps: number
    confidence_score: number
  }
  risk_assessment: {
    liquidity_score: number
    volatility_score: number
    market_impact_bps: number
    recommended_size: string
  }
  venue_recommendations: Array<{
    venue_address: string
    venue_name: string
    expected_slippage_bps: number
    gas_estimate: string
    priority_score: number
  }>
}

interface ScanOpportunitiesProps {
  className?: string
  userAddress?: string
}

const ScanOpportunities: React.FC<ScanOpportunitiesProps> = ({ 
  className = '',
  userAddress = ''
}) => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch opportunities from the API
  const fetchOpportunities = async () => {
    if (!userAddress) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'scan_advanced_opportunities',
          userAddress: userAddress
        }),
      })

      const result = await response.json()
      
      console.log('=== SCAN_ADVANCED_OPPORTUNITIES RESULT ===')
      console.log('Full API Response:', result)
      console.log('Success:', result.success)
      console.log('Data:', result.data)
      
      if (result.success) {
        const opportunities = result.data.opportunities || []
        console.log('Number of opportunities found:', opportunities.length)
        console.log('Opportunities array:', opportunities)
        
        // Log each opportunity in detail
        opportunities.forEach((opportunity: ArbitrageOpportunity, index: number) => {
          console.log(`--- Opportunity ${index + 1} ---`)
          console.log('Base Opportunity:', opportunity.base_opportunity)
          console.log('Cross Rate Data:', opportunity.cross_rate_data)
          console.log('Risk Assessment:', opportunity.risk_assessment)
          console.log('Venue Recommendations:', opportunity.venue_recommendations)
        })
        
        setOpportunities(opportunities)
        setLastUpdated(new Date())
      } else {
        console.error('API Error:', result.error)
        setError(result.error || 'Failed to fetch opportunities')
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err)
      setError('Failed to connect to the server')
    } finally {
      setIsLoading(false)
    }
  }

  // Set up polling every minute
  useEffect(() => {
    if (userAddress) {
      fetchOpportunities() // Initial fetch
      
      const interval = setInterval(() => {
        fetchOpportunities()
      }, 60000) // 60 seconds

      return () => clearInterval(interval)
    }
  }, [userAddress])

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num)
  }

  const formatPercentage = (bps: number) => {
    return `${(bps / 100).toFixed(2)}%`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000)
    return date.toLocaleTimeString()
  }

  const getDirectionIcon = (direction: string) => {
    return direction === 'BUY' ? (
      <TrendingUp className="w-4 h-4 text-green-400" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-400" />
    )
  }

  const getDirectionColor = (direction: string) => {
    return direction === 'BUY' ? 'text-green-400' : 'text-red-400'
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (error) {
    return (
      <div className={`bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️</div>
          <div className="text-white/70 text-sm mb-2">Failed to load opportunities</div>
          <div className="text-white/50 text-xs">{error}</div>
          <button 
            onClick={() => fetchOpportunities()}
            className="mt-4 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 hover:border-white/8 transition-all duration-300 ${className}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-white/60" />
            <h3 className="text-white/80 text-sm font-medium">Arbitrage Opportunities</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Clock className="w-3 h-3" />
            {isLoading ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                <span>Scanning...</span>
              </div>
            ) : lastUpdated ? (
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            ) : (
              <span>No data</span>
            )}
          </div>
        </div>

        {/* Table or Empty State */}
        {opportunities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/40 mb-2">📊</div>
            <div className="text-white/60 text-sm mb-1">
              {isLoading ? 'Scanning for opportunities...' : 'No opportunities found'}
            </div>
            <div className="text-white/40 text-xs">
              {isLoading ? 'This may take a moment' : 'Market conditions may not favor arbitrage right now'}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto faq-scrollbar">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Pair
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Deviation
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Est. Profit
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Max Size
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opportunity, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="py-3 px-2">
                        <div className="flex flex-col">
                          <span className="text-white/80 text-sm font-medium">
                            {opportunity.base_opportunity.pair.stablecoin_symbol}
                          </span>
                          <span className="text-white/50 text-xs">
                            vs {opportunity.base_opportunity.pair.fiat_symbol}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className={`flex items-center gap-1 ${getDirectionColor(opportunity.base_opportunity.trade_direction)}`}>
                          {getDirectionIcon(opportunity.base_opportunity.trade_direction)}
                          <span className="text-xs font-medium">
                            {opportunity.base_opportunity.trade_direction}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-white/80 text-sm font-mono">
                          {formatPercentage(opportunity.base_opportunity.deviation_bps)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-green-400 text-sm font-mono">
                          {formatCurrency(opportunity.base_opportunity.estimated_profit)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`text-sm font-medium ${getRiskColor(opportunity.cross_rate_data.confidence_score)}`}>
                          {opportunity.cross_rate_data.confidence_score}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-white/70 text-sm font-mono">
                          {formatCurrency(opportunity.risk_assessment.recommended_size)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-white/50 text-xs">
                          {formatTimestamp(opportunity.base_opportunity.timestamp)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary Footer */}
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-white/50">
              <span>{opportunities.length} opportunities found</span>
              <span>Auto-refresh: 1 min</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScanOpportunities
