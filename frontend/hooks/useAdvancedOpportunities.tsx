'use client'
import { useState } from 'react'

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

const useAdvancedOpportunities = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null)

  const openModal = (opportunity: ArbitrageOpportunity) => {
    setSelectedOpportunity(opportunity)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOpportunity(null)
  }

  return {
    isModalOpen,
    selectedOpportunity,
    openModal,
    closeModal
  }
}

export default useAdvancedOpportunities
