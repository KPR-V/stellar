'use client'
import React, { useState, useEffect } from 'react'
import { Clock, TrendingUp, AlertCircle } from 'lucide-react'
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
        const opportunities = data.data?.opportunities || []
        setOpportunities(opportunities)
        setLastUpdated(new Date())
        
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

  useEffect(() => {
    fetchOpportunities()
    const interval = setInterval(() => {
      fetchOpportunities()
    }, 120000)
     return () => clearInterval(interval)
  }, [onOpportunitiesChange])

  const formatDeviationBps = (bps: number) => {
    return (bps / 100).toFixed(2) + '%'
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

  return (
    <div className="p-6 space-y-6 font-raleway">
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
      </div>  
      {error && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 text-white/70">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-white/60 text-sm mt-1">{error}</p>
        </div>
      )}

      {isLoading && opportunities.length === 0 && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50 text-base">Scanning for opportunities...</p>
        </div>
      )}

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

      {opportunities.length > 0 && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <div className="flex items-center px-6 py-3 border-b border-white/5 bg-black/20">
            <div className="flex-1 text-white/60 text-sm font-medium">Pair</div>
            <div className="w-24 text-center text-white/60 text-sm font-medium">Direction</div>
            <div className="w-28 text-right text-white/60 text-sm font-medium">Profit</div>
            <div className="w-24 text-right text-white/60 text-sm font-medium">Deviation</div>
          </div>

          <div className="divide-y divide-white/5">
            {opportunities.map((opportunity, index) => {
              if (!opportunity?.base_opportunity?.pair) {
                console.warn(`Opportunity ${index} is missing required data:`, opportunity)
                return null
              }              
              return (
              <div
                key={index}
                onClick={() => openModal(opportunity)}
                className="flex items-center px-6 py-4 hover:bg-black/30 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white/80 font-medium text-base group-hover:text-white/90 transition-colors">
                    {opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'}/{opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}
                  </div>
                  <div className="text-white/40 text-sm mt-0.5 group-hover:text-white/50 transition-colors">
                    {opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'} → {opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}
                  </div>
                </div>

                <div className="w-24 flex justify-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    opportunity.base_opportunity.trade_direction === 'BUY' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {opportunity.base_opportunity.trade_direction || 'N/A'}
                  </div>
                </div>

                <div className="w-28 text-right">
                  <div className="text-white/80 font-medium text-base group-hover:text-white/90 transition-colors">
                    ${formatLargeNumber(opportunity.base_opportunity.estimated_profit || '0')}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5 group-hover:text-white/40 transition-colors">
                    Estimated
                  </div>
                </div>

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

    <AdvancedOpportunitiesModal
      isOpen={isModalOpen}
      onClose={closeModal}
      opportunity={selectedOpportunity}
    />
    
    </div>
  )
}

export default ScanAdvancedOpportunities
