'use client'
import React, { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Clock, DollarSign, Percent, Target, AlertCircle } from 'lucide-react'
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
  
  // Get wallet context
  const { address: userAddress, walletKit } = useWallet()

  // Clear execution result when modal opens with new opportunity
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

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
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
      // Create the opportunity object with hardcoded venue recommendations and real data
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

      // Step 1: Prepare the transaction for the contract's execute_user_arbitrage function
      console.log('� Step 1: Preparing contract transaction...')
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
          message: prepareResult.error || 'Failed to prepare transaction'
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

      // Step 2: Sign the transaction with the user's wallet
      console.log('🔐 Step 2: Requesting wallet signature...')
      
      const walletResponse = await walletKit.signTransaction(transactionXdr, {
        networkPassphrase: "Test SDF Network ; September 2015"
      })

      console.log('✅ Transaction signed successfully, now submitting to network...')

      // Step 3: Submit the signed transaction to the network
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

      const submitResult = await submitResponse.json()

      if (submitResult.success) {
        setExecutionResult({
          success: true,
          message: `✅ Arbitrage trade executed successfully! 
            
🎯 Transaction Details:
• Hash: ${submitResult.data.hash}
• Status: ${submitResult.data.status}
• Direction: ${tradeDetails?.direction}
• Amount: ${parseFloat(tradeDetails?.amount || '0') / 1e7} ${tradeDetails?.baseAsset}
• Estimated Profit: ${parseFloat(prepareResult.data.estimatedProfit || '0') / 1e7}
• Fee Paid: ${transactionFee?.xlm || 'Unknown'} XLM

🚀 The contract has executed your arbitrage trade on the Stellar network!`,
          transactionXdr: walletResponse.signedTxXdr
        })
        
        console.log('🎉 Arbitrage trade executed successfully!', {
          hash: submitResult.data.hash,
          status: submitResult.data.status,
          contractStatus: submitResult.data.contractStatus,
          tradeDetails: tradeDetails
        })
      } else {
        setExecutionResult({
          success: false,
          message: `❌ Failed to submit transaction: ${submitResult.error || 'Unknown error'}
          
The transaction was signed but could not be submitted to the network. Please try again.`
        })
      }
    } catch (error) {
      console.error('❌ Error executing real arbitrage trade:', error)
      
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Handle specific wallet errors
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
      <div className="bg-black/90 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {(opportunity.base_opportunity.pair.base_asset_symbol || 'N/A').slice(0, 2)}
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">
                Arbitrage Opportunity
              </h2>
              <p className="text-white/60 text-sm">
                {opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'}/{opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Trade Direction */}
            <div className="bg-black/20 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {opportunity.base_opportunity.trade_direction === 'BUY' 
                  ? <TrendingUp size={16} className="text-green-400" />
                  : <TrendingDown size={16} className="text-red-400" />
                }
                <span className="text-white/60 text-sm">Trade Direction</span>
              </div>
              <div className={`text-lg font-semibold ${
                opportunity.base_opportunity.trade_direction === 'BUY' 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {opportunity.base_opportunity.trade_direction}
              </div>
            </div>

            {/* Confidence Score */}
            <div className="bg-black/20 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-blue-400" />
                <span className="text-white/60 text-sm">Confidence</span>
              </div>
              <div className={`text-lg font-semibold ${getConfidenceColor(opportunity.confidence_score)}`}>
                {getConfidenceText(opportunity.confidence_score)} ({(opportunity.confidence_score / 100).toFixed(0)}%)
              </div>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Profit */}
            <div className="bg-black/20 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-green-400" />
                <span className="text-white/60 text-sm">Estimated Profit</span>
              </div>
              <div className="text-green-400 text-lg font-semibold">
                ${formatLargeNumber(opportunity.base_opportunity.estimated_profit)}
              </div>
            </div>

            {/* Deviation */}
            <div className="bg-black/20 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent size={16} className="text-orange-400" />
                <span className="text-white/60 text-sm">Deviation</span>
              </div>
              <div className="text-orange-400 text-lg font-semibold">
                {formatDeviationBps(opportunity.base_opportunity.deviation_bps)}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">Additional Details</h3>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Max Trade Size */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">Max Trade Size</span>
                <span className="text-white font-medium">${formatLargeNumber(opportunity.max_trade_size)}</span>
              </div>

              {/* Timestamp */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">Timestamp</span>
                <span className="text-white font-medium">{formatTimestamp(opportunity.base_opportunity.timestamp)}</span>
              </div>

              {/* Base Asset */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">Base Asset</span>
                <span className="text-white font-medium">{opportunity.base_opportunity.pair.base_asset_symbol || 'N/A'}</span>
              </div>

              {/* Quote Asset */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">Quote Asset</span>
                <span className="text-white font-medium">{opportunity.base_opportunity.pair.quote_asset_symbol || 'N/A'}</span>
              </div>

              {/* TWAP Price */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/60">TWAP Price</span>
                <span className="text-white font-medium">
                  {opportunity.twap_price ? `$${formatPrice(opportunity.twap_price)}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Trade Input */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">Execute Trade</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-white/60 text-sm mb-2">
                  Trade Amount ({opportunity.base_opportunity.trade_direction === 'SELL' 
                    ? opportunity.base_opportunity.pair.base_asset_symbol 
                    : opportunity.base_opportunity.pair.quote_asset_symbol})
                  <span className="text-white/40 text-xs ml-2">
                    ({opportunity.base_opportunity.trade_direction === 'SELL' 
                      ? `Selling ${opportunity.base_opportunity.pair.base_asset_symbol}` 
                      : `Buying ${opportunity.base_opportunity.pair.base_asset_symbol} with ${opportunity.base_opportunity.pair.quote_asset_symbol}`})
                  </span>
                </label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder={`Enter amount in ${opportunity.base_opportunity.trade_direction === 'SELL' 
                    ? opportunity.base_opportunity.pair.base_asset_symbol 
                    : opportunity.base_opportunity.pair.quote_asset_symbol}`}
                  className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:border-blue-400 focus:outline-none transition-colors"
                />
                <div className="text-xs text-white/40 mt-1">
                  {opportunity.base_opportunity.trade_direction === 'SELL' 
                    ? `You will sell ${tradeAmount || '0'} ${opportunity.base_opportunity.pair.base_asset_symbol} to get ${opportunity.base_opportunity.pair.quote_asset_symbol}` 
                    : `You will spend ${tradeAmount || '0'} ${opportunity.base_opportunity.pair.quote_asset_symbol} to buy ${opportunity.base_opportunity.pair.base_asset_symbol}`}
                </div>
              </div>
              
              {tradeAmount && !executionResult && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <AlertCircle size={16} />
                    <span>Trade preview will be calculated here</span>
                  </div>
                </div>
              )}

              {/* Execution Result */}
              {executionResult && (
                <div className={`border rounded-lg p-4 ${
                  executionResult.success 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className={`flex items-center gap-2 text-sm mb-2 ${
                    executionResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <AlertCircle size={16} />
                    <span className="font-medium">
                      {executionResult.success ? 'Transaction Successful' : 'Execution Failed'}
                    </span>
                  </div>
                  <div className={`text-sm whitespace-pre-line ${
                    executionResult.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {executionResult.message}
                  </div>
                  {executionResult.success && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <div className="text-xs text-green-400 mb-1">Next Steps:</div>
                      <div className="text-xs text-green-300">
                        • Your arbitrage trade has been submitted to the Stellar network
                        • You can view the transaction details using the hash above
                        • Check your wallet balance to see the updated funds
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/30">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">
              {!userAddress ? (
                <span className="text-yellow-400">⚠️ Please connect your wallet first</span>
              ) : (
                'Review the details carefully before executing'
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={!tradeAmount || parseFloat(tradeAmount) <= 0 || !userAddress || isExecuting}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Executing Real Trade...
                  </>
                ) : (
                  '🚀 Execute Real Trade'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedOpportunitiesModal
