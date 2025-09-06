'use client'
import React, { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'

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
  const [tradeAmount, setTradeAmount] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<{
    success: boolean
    message: string
    transactionXdr?: string
  } | null>(null)
  
  const { address: userAddress, walletKit } = useWallet()

  useEffect(() => {
    if (isOpen && opportunity) {
      setExecutionResult(null)
      setTradeAmount('')
    }
  }, [isOpen, opportunity])

  if (!isOpen || !opportunity || !opportunity.base_opportunity || !opportunity.base_opportunity.pair) {
    return null
  }

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price) / 1e7
    if (numPrice >= 1) {
      return numPrice.toFixed(2)
    }
    return numPrice.toFixed(4)
  }

  const formatDeviationBps = (bps: number) => {
    return (bps / 100).toFixed(2) + '%'
  }

  const getConfidenceStrokeColor = (score: number) => {
    if (score >= 8000) return '#4ade80'
    if (score >= 6000) return '#facc15'
    return '#f87171' 
  }

  const getConfidencePercentage = (score: number) => {
    return Math.min(score / 100, 100)
  }

  const calculateTradePreview = () => {
    if (!tradeAmount || parseFloat(tradeAmount) <= 0) return null
    const amount = parseFloat(tradeAmount)
    const estimatedProfitRaw = parseFloat(opportunity.base_opportunity.estimated_profit) / 1e7
    const direction = opportunity.base_opportunity.trade_direction
    const baseAsset = opportunity.base_opportunity.pair.base_asset_symbol
    const quoteAsset = opportunity.base_opportunity.pair.quote_asset_symbol
    const price = parseFloat(opportunity.base_opportunity.stablecoin_price) / 1e7
    
    return {
      sellAsset: direction === 'SELL' ? baseAsset : quoteAsset,
      buyAsset: direction === 'SELL' ? quoteAsset : baseAsset,
      sellAmount: amount,
      buyAmount: direction === 'SELL' ? amount * price : amount / price,
      estimatedProfit: (estimatedProfitRaw * amount) / 100, 
      price: price,
      direction
    }
  }

  const CircularProgress: React.FC<{ value: number; size: number; strokeWidth: number }> = ({ value, size, strokeWidth }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (value / 100) * circumference
    const center = size / 2

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-white/10"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={getConfidenceStrokeColor(opportunity.confidence_score)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{filter: `drop-shadow(0 0 6px ${getConfidenceStrokeColor(opportunity.confidence_score)}40)`}}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-white/90">
            {Math.round(getConfidencePercentage(opportunity.confidence_score))}
          </span>
        </div>
      </div>
    )
  }

  const handleExecute = async () => {
    if (!userAddress || !opportunity || !tradeAmount) {
      alert('Please connect your wallet and enter a trade amount')
      return
    }
    if (!walletKit) {
      alert('Wallet not connected. Please connect your wallet first.')
      return
    }
  
    setIsExecuting(true)
    setExecutionResult(null)
  
    try {
      const opportunityWithHardcodedVenue = {
        base_opportunity: {
          pair: opportunity.base_opportunity.pair,
          stablecoin_price: opportunity.base_opportunity.stablecoin_price,
          fiat_rate: opportunity.base_opportunity.fiat_rate,
          deviation_bps: opportunity.base_opportunity.deviation_bps,
          estimated_profit: opportunity.base_opportunity.estimated_profit,
          trade_direction: opportunity.base_opportunity.trade_direction,
          timestamp: opportunity.base_opportunity.timestamp
        },
        confidence_score: opportunity.confidence_score,
        max_trade_size: opportunity.max_trade_size,
        twap_price: opportunity.twap_price,
        venue_recommendations: [
          {
            address: "CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS",
            enabled: true,
            fee_bps: 30,
            liquidity_threshold: "1000000000000",
            name: "SoroswapTestnet"
          }
        ]
      }
  
      console.log('🚀 Starting arbitrage execution:', {
        userAddress,
        tradeAmount,
        opportunity: opportunityWithHardcodedVenue,
        venueAddress: "CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS"
      })
  
      console.log('📝 Step 1: Preparing contract transaction...')
      const prepareResponse = await fetch('/api/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_user_arbitrage',
          userAddress,
          tradeAmount,
          opportunity: opportunityWithHardcodedVenue,
          venueAddress: "CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS"
        }),
      })
  
      const prepareResult = await prepareResponse.json()
      if (!prepareResult.success) {
        setExecutionResult({
          success: false,
          message: `❌ Failed to prepare arbitrage: ${prepareResult.error}`
        })
        return
      }
  
      const transactionXdr = prepareResult.data.transactionXdr
      const transactionFee = prepareResult.data.transactionFee
      const tradeDetails = prepareResult.data.tradeDetails
  
      console.log('✅ Transaction prepared successfully:', {
        hasXdr: !!transactionXdr,
        estimatedFee: transactionFee?.xlm,
        tradeAmount: tradeDetails?.amount,
        direction: tradeDetails?.direction
      })
  
      console.log('🔐 Step 2: Requesting wallet signature...')
      const walletResponse = await walletKit.signTransaction(transactionXdr, {
        networkPassphrase: "Test SDF Network ; September 2015"
      })
  
      console.log('✅ Arbitrage transaction signed successfully')
  
      console.log('📡 Step 3: Submitting transaction to Stellar network...')
      const submitResponse = await fetch('/api/contract/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedXdr: walletResponse.signedTxXdr
        }),
      })
  
      const arbitrageSubmitResult = await submitResponse.json()
  
      if (arbitrageSubmitResult.success) {
        console.log('🎉 ARBITRAGE EXECUTED SUCCESSFULLY!')
        setExecutionResult({
          success: true,
          message: `✅ Arbitrage executed successfully! 
            
  🎯 Transaction Details:
  • Arbitrage Hash: ${arbitrageSubmitResult.data.hash}
  • Status: ${arbitrageSubmitResult.data.status}
  • Trade Amount: ${tradeAmount}
  • Estimated Profit: ${parseFloat(prepareResult.data.estimatedProfit || '0') / 1e7}
  • Fee Paid: ${transactionFee?.xlm || 'Unknown'} XLM
  
  🚀 The contract has executed your arbitrage trade on the Stellar network!`,
          transactionXdr: walletResponse.signedTxXdr
        })
  
        console.log('🎉 Arbitrage trade executed successfully!', {
          hash: arbitrageSubmitResult.data.hash,
          status: arbitrageSubmitResult.data.status,
          contractStatus: arbitrageSubmitResult.data.contractStatus,
          tradeDetails: tradeDetails
        })
      } else {
        setExecutionResult({
          success: false,
          message: `❌ Failed to submit transaction: ${arbitrageSubmitResult.error || 'Unknown error'}
          
  The transaction was signed but could not be submitted to the network. Please try again.`
        })
      }
    } catch (error) {
      console.error('❌ Error executing real arbitrage trade:', error)
  
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
  
        if (errorMessage.includes('User declined')) {
          errorMessage = 'Transaction was cancelled by user'
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error - please check your connection and try again'
        } else if (errorMessage.includes('insufficient')) {
          errorMessage = 'Insufficient funds to execute this trade'
        }
      }
  
      setExecutionResult({
        success: false,
        message: `❌ Error: ${errorMessage}
        
  Please check your wallet connection and try again. If the problem persists, the arbitrage opportunity may have expired.`
      })
    } finally {
      setIsExecuting(false)
    }
  }
  

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20 flex-shrink-0">
          <div>
            <h2 className="text-white/90 text-lg font-medium mb-1">
              Arbitrage Opportunity
            </h2>
            <p className="text-white/50 text-sm">
              {opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'}/{opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white/80 transition-all duration-200 p-2 hover:bg-white/5 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Key Metrics Container - Enhanced 2x2 Grid */}
          <div className="bg-black backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-lg">
            <div className="grid grid-cols-2 gap-6">
              
              {/* Trade Direction - Enhanced */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/10 backdrop-blur-sm">
                <div className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">Direction</div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    opportunity.base_opportunity.trade_direction === 'BUY' 
                      ? 'bg-green-400/20 text-green-400' 
                      : 'bg-red-400/20 text-red-400'
                  }`}>
                    {opportunity.base_opportunity.trade_direction === 'BUY' 
                      ? <TrendingUp size={20} />
                      : <TrendingDown size={20} />
                    }
                  </div>
                  <div className={`text-lg font-semibold ${
                    opportunity.base_opportunity.trade_direction === 'BUY' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {opportunity.base_opportunity.trade_direction}
                  </div>
                </div>
              </div>

              {/* Confidence Score - Enhanced Circular Progress */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-black/30 to-black/10 backdrop-blur-sm">
                <div className="text-white/40 text-xs font-medium mb-4 uppercase tracking-wider">Confidence</div>
                <CircularProgress 
                  value={getConfidencePercentage(opportunity.confidence_score)} 
                  size={64} 
                  strokeWidth={6} 
                />
              </div>

              {/* Price - Enhanced */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-black/30 to-black/10 backdrop-blur-sm">
                <div className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">Profit</div>
                <div className="text-white/90 text-xl font-semibold">
                  ${formatPrice(opportunity.base_opportunity.estimated_profit)}
                </div>
              </div>

              {/* Deviation - Enhanced */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-black/30 to-black/10 backdrop-blur-sm">
                <div className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">Deviation</div>
                <div className="text-white/90 text-xl font-semibold">
                  {formatDeviationBps(opportunity.base_opportunity.deviation_bps)}
                </div>
              </div>

            </div>
          </div>

          {/* Trade Summary & Input */}
          <div className="space-y-4">            
            {/* Trade Amount Input */}
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-white/5">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm font-medium mb-2">
                    Trade Amount ({opportunity.base_opportunity.trade_direction === 'SELL' 
                      ? opportunity.base_opportunity.pair.base_asset_symbol 
                      : opportunity.base_opportunity.pair.quote_asset_symbol})
                  </label>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder={`Enter amount in ${opportunity.base_opportunity.trade_direction === 'SELL' 
                        ? opportunity.base_opportunity.pair.base_asset_symbol 
                        : opportunity.base_opportunity.pair.quote_asset_symbol}`}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white/90 placeholder-white/40 focus:border-white/30 focus:outline-none transition-all text-base"
                    />
                </div>

                {/* Trade Preview */}
                {tradeAmount && parseFloat(tradeAmount) > 0 && (() => {
                  const preview = calculateTradePreview()
                  if (!preview) return null
                  
                  return (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                        <AlertCircle size={16} />
                        <span>Trade Preview</span>
                      </div>
                      
                      {/* Trade Summary Paragraph */}
                      <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                        <p className="text-white/80 text-sm leading-relaxed">
                          This arbitrage opportunity involves {preview.direction === 'SELL' ? 'selling' : 'buying'} {' '}
                          <span className="text-blue-400 font-medium">{preview.sellAsset}</span> and {' '}
                          {preview.direction === 'SELL' ? 'buying' : 'selling'} {' '}
                          <span className="text-blue-400 font-medium">{preview.buyAsset}</span>. {' '}
                          You will exchange <span className="text-white/90 font-medium">{preview.sellAmount.toFixed(4)} {preview.sellAsset}</span> {' '}
                          to receive approximately <span className="text-white/90 font-medium">{preview.buyAmount.toFixed(4)} {preview.buyAsset}</span>.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="text-center p-3 bg-black/20 rounded-lg border border-white/5">
                          <div className="text-white/50 mb-1 text-xs">You Sell</div>
                          <div className="text-red-400 font-medium text-sm">
                            {preview.sellAmount.toFixed(4)} {preview.sellAsset}
                          </div>
                        </div>
                        
                        <div className="text-center p-3 bg-black/20 rounded-lg border border-white/5">
                          <div className="text-white/50 mb-1 text-xs">You Buy</div>
                          <div className="text-green-400 font-medium text-sm">
                            {preview.buyAmount.toFixed(4)} {preview.buyAsset}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-white/50 text-xs bg-black/20 rounded-lg p-3 border border-white/5">
                        <div className="font-medium text-white/70 mb-2">Trade Details:</div>
                        <div>• Exchange rate: 1 {preview.sellAsset} = {(preview.buyAmount / preview.sellAmount).toFixed(6)} {preview.buyAsset}</div>
                        <div>• Market price: ${preview.price.toFixed(4)} per {opportunity.base_opportunity.pair.base_asset_symbol}</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Execution Result */}
                {executionResult && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-3 text-sm mb-3 text-white/80">
                      <AlertCircle size={16} />
                      <span className="font-medium">
                        {executionResult.success ? 'Transaction Successful' : 'Execution Failed'}
                      </span>
                    </div>
                    <div className="text-xs whitespace-pre-line leading-relaxed text-white/70">
                      {executionResult.message}
                    </div>
                    {executionResult.success && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-white/80 mb-2 font-medium">Next Steps:</div>
                        <div className="text-xs text-white/60 space-y-1">
                          <div>• Your arbitrage trade has been submitted to the Stellar network</div>
                          <div>• You can view the transaction details using the hash above</div>
                          <div>• Check your wallet balance to see the updated funds</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 self-end">
              <button
                onClick={handleExecute}
                disabled={!tradeAmount || parseFloat(tradeAmount) <= 0 || !userAddress || isExecuting}
                className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-blue-500/30 hover:border-blue-500/40 text-sm"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    Execute Trade
                  </>
                )}
              </button>
        </div>
      </div>
    </div>
  )
}

export default AdvancedOpportunitiesModal