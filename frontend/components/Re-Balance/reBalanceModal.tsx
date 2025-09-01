'use client'
import React, { useRef, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useRebalance } from '../../hooks/useRebalance'
import BotStatistics from './bot-statistics'
import ScanAdvancedOpportunities from './scan-advanced-opportunities'

interface ReBalanceModalProps {
  className?: string
  portfolioValue?: string
  balancesWithPrices?: {[key: string]: { balance: string, usdValue: number, price: number }}
  tokenPrices?: {[key: string]: number}
  isLoading?: boolean
  lastUpdated?: Date | null
  userAddress?: string
}

const ReBalanceModal: React.FC<ReBalanceModalProps> = ({ 
  className = '',
  portfolioValue = '0.00',
  balancesWithPrices = {},
  tokenPrices = {},
  isLoading = false,
  lastUpdated = null,
  userAddress = ''
}) => {
  const { isModalOpen, closeModal } = useRebalance()
  const modalRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState('Arbitrage-Bot')
  const [hasOpportunities, setHasOpportunities] = useState(false)

  // Handle opportunities change callback
  const handleOpportunitiesChange = (hasOpps: boolean) => {
    setHasOpportunities(hasOpps)
  }

  const tabs = ['Arbitrage-Bot', 'Arbitrage-Manual', 'CalibreX Stats']

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Arbitrage-Bot':
        return (
          <ScanAdvancedOpportunities 
            onOpportunitiesChange={handleOpportunitiesChange} 
          />
        )

      case 'Arbitrage-Manual':
        return (
          <div className="p-6">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-white/8 transition-all duration-300">
              <div className="text-center py-12">
                <div className="text-white/40 mb-2">⚖️</div>
                <div className="text-white/60 text-sm mb-1">Manual Arbitrage</div>
                <div className="text-white/40 text-xs mb-4">Execute arbitrage trades manually with custom parameters</div>
                <button 
                  disabled
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-white/10 text-white/50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        )

      case 'CalibreX Stats':
        return (
          <div className="p-6">
            <BotStatistics className="w-full" />
          </div>
        )

      default:
        return (
          <div className="p-6">
            <div className="text-center py-12 text-white/50">
              Select a tab to view content
            </div>
          </div>
        )
    }
  }

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
          w-[900px] max-w-[95vw] h-[700px] max-h-[95vh] overflow-hidden
          transition-all ease-out
          animate-in fade-in-0 zoom-in-95 duration-300
          shadow-xl shadow-black/20
          font-raleway
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
          <div>
            <h2 className="text-white/90 text-xl font-medium">Re-Balance Portfolio</h2>
            <p className="text-white/50 text-sm mt-1">
              Manage your portfolio allocation and trading strategies
            </p>
          </div>
          <button 
            onClick={closeModal}
            className="text-white/50 hover:text-white/80 transition-colors duration-200 p-2 hover:bg-white/5 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Horizontal Tabs */}
        <div className="flex border-b border-white/5 bg-black/10">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                relative px-6 py-3 transition-all duration-300 ease-out font-raleway font-medium text-sm
                ${activeTab === tab
                  ? 'text-white/95 bg-white/5'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/3'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {tab}
                
                {/* Blinking green dot for Arbitrage-Bot when opportunities exist */}
                {tab === 'Arbitrage-Bot' && hasOpportunities && (
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                )}
              </div>
              
              {/* Active indicator */}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content - Scrollable */}
        <div className="flex-1 bg-black/30 h-[580px] overflow-y-auto faq-scrollbar">
          {renderTabContent()}
        </div>

        {/* Action Buttons - Only show for certain tabs */}
        {activeTab === 'Arbitrage-Manual' && (
          <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-white/5 bg-black/10">
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
              onClick={() => {
                // Add your re-balance/execute trade logic here
              }}
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
              Execute Trade
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReBalanceModal
