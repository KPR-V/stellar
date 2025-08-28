'use client'
import React, { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useRebalance } from '../../hooks/useRebalance'
import PortfolioPieChart from '../piechart'

interface ReBalanceModalProps {
  className?: string
  portfolioValue?: string
  balancesWithPrices?: {[key: string]: { balance: string, usdValue: number, price: number }}
  tokenPrices?: {[key: string]: number}
  isLoading?: boolean
  lastUpdated?: Date | null
}

const ReBalanceModal: React.FC<ReBalanceModalProps> = ({ 
  className = '',
  portfolioValue = '0.00',
  balancesWithPrices = {},
  tokenPrices = {},
  isLoading = false,
  lastUpdated = null
}) => {
  const { isModalOpen, closeModal } = useRebalance()
  const modalRef = useRef<HTMLDivElement>(null)

  // Enhanced token mapping with comprehensive list
  const getTokenInfo = (tokenAddress: string) => {
    const tokenMap: { [key: string]: { symbol: string, name: string } } = {
      // Native
      'native': { symbol: 'XLM', name: 'Stellar Lumens' },
      
      // Current active SAC addresses
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGCN6FM': { symbol: 'XLM', name: 'Stellar Lumens' },
      'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': { symbol: 'USDC', name: 'USD Coin' },
      'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ': { symbol: 'EURC', name: 'Euro Coin' },
      
      // Alternative SAC addresses
      'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2DA2KTP5PS': { symbol: 'USDC', name: 'USD Coin' },
      
      // Known testnet issuer addresses
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': { symbol: 'USDC', name: 'USD Coin' },
      'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': { symbol: 'EURC', name: 'Euro Coin' },
      
      // Mainnet common tokens
      'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA': { symbol: 'USDC', name: 'USD Coin (Mainnet)' },
      'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU': { symbol: 'USDC', name: 'USD Coin' }
    }
    
    const cleanAddress = tokenAddress.trim();
    
    if (tokenMap[cleanAddress]) {
      return tokenMap[cleanAddress];
    }
    
    for (const [key, value] of Object.entries(tokenMap)) {
      if (key.startsWith(cleanAddress.slice(0, 8)) || cleanAddress.startsWith(key.slice(0, 8))) {
        return value;
      }
    }
    
    return { 
      symbol: tokenAddress.slice(0, 8) + '...', 
      name: 'Unknown Token' 
    }
  }

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeModal()
      }
    }

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModalOpen, closeModal])

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isModalOpen])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isModalOpen, closeModal])

  if (!isModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div 
        ref={modalRef}
        className={`
          bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl
          p-6 w-[700px] max-w-[90vw] max-h-[90vh] overflow-auto faq-scrollbar
          transition-all ease-out
          animate-in fade-in-0 zoom-in-95 duration-300
          shadow-xl shadow-black/20
          font-raleway
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-white/90 text-xl font-medium">Re-Balance Portfolio</h2>
            <p className="text-white/50 text-sm mt-1">
              {lastUpdated && !isLoading && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              {isLoading && 'Updating...'}
            </p>
          </div>
          <button 
            onClick={closeModal}
            className="text-white/50 hover:text-white/80 transition-colors duration-200 p-2 hover:bg-white/5 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Portfolio Overview */}
        <div className="mb-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side - Portfolio Value */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white/80 text-sm font-medium">Current Portfolio Value</h3>
                  <div className="flex items-center gap-2">
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>
                <div className="text-3xl font-light text-white/95 mb-2">
                  ${portfolioValue}
                </div>
                <div className="text-xs text-white/50 mb-6">
                  {Object.keys(balancesWithPrices).length} assets
                </div>
              </div>
              
              {/* Right side - Pie Chart */}
              <div className="flex items-center justify-center">
                <PortfolioPieChart
                  balancesWithPrices={balancesWithPrices}
                  portfolioValue={portfolioValue}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rebalance Strategy Section */}
        <div className="mb-6">
          <h3 className="text-white/80 text-sm font-medium mb-4">Rebalance Strategy</h3>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
            <div className="text-white/60 text-sm text-center py-8">
              <div className="mb-2">⚖️</div>
              <div>Rebalance strategy controls will be implemented here</div>
              <div className="text-xs text-white/40 mt-2">Set target allocations, risk parameters, and automated rebalancing rules</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button 
            onClick={closeModal}
            className="
              px-4 py-2 text-sm font-medium rounded-lg
              text-white/70 bg-white/5 border border-white/10
              transition-all duration-200
              hover:bg-white/10 hover:text-white/90 hover:border-white/20
              active:scale-[0.98]
              font-raleway
            "
          >
            Cancel
          </button>
          <button 
            disabled={Object.keys(balancesWithPrices).length === 0}
            className="
              bg-white text-black rounded-lg
              px-4 py-2 text-sm font-medium
              transition-all duration-300 ease-out
              hover:bg-white/90 hover:shadow-md
              focus:bg-white/90 focus:ring-2 focus:ring-white/20
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
              font-raleway
            "
          >
            Re-Balance Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReBalanceModal
