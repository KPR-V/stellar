'use client'
import React, { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown, Clock, Target, Zap, Building, ExternalLink, Info, AlertCircle, CheckCircle } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'
import { TransactionBuilder, Networks } from '@stellar/stellar-sdk'

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
  const { address, walletKit } = useWallet()
  const [selectedVenue, setSelectedVenue] = useState<string>('')
  const [tradeAmount, setTradeAmount] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [executionError, setExecutionError] = useState<string>('')

  // Venue address mapping
  const venueAddressMap: { [key: string]: string } = {
    'Soroswap': 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS',
    'Soroswap Router': 'CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH'
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedVenue('')
      setTradeAmount('')
      setIsExecuting(false)
      setExecutionResult(null)
      setExecutionError('')
    }
  }, [isOpen])

  // Tooltip information for each value
  const tooltipInfo = {
    direction: "Indicates whether to BUY or SELL to capitalize on the arbitrage opportunity. BUY when stablecoin is underpriced, SELL when overpriced.",
    deviation: "The percentage difference between the current stablecoin price and its target peg value. Higher deviation means greater arbitrage potential.",
    estimatedProfit: "The estimated profit from executing this arbitrage trade, calculated based on price differences and trade size.",
    confidence: "A score from 0-100% indicating the reliability of this opportunity based on liquidity, historical performance, and market conditions.",
    stablecoinPrice: "Current market price of the stablecoin in USD, used to calculate the deviation from the target peg.",
    fiatRate: "Current exchange rate of the paired fiat currency against USD, providing the reference rate for arbitrage calculations.",
    twapPrice: "Time-Weighted Average Price over a recent period, providing a more stable price reference to reduce noise from temporary spikes.",
    maxTradeSize: "Maximum recommended trade amount for this opportunity, calculated based on available liquidity and risk management parameters."
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen || !opportunity) return null

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

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString()
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

  const shortenAddress = (address: string) => {
    if (address === 'UNKNOWN_ADDRESS') return address
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  const executeArbitrage = async () => {
    if (!address) {
      setExecutionError('Please connect your wallet first')
      return
    }

    if (!selectedVenue) {
      setExecutionError('Please select a trading venue')
      return
    }

    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
      setExecutionError('Please enter a valid trade amount')
      return
    }

    // Convert USD amount to stablecoin amount based on current price
    const stablecoinPriceUsd = parseFloat(opportunity.base_opportunity.stablecoin_price) / 1e7
    const usdAmount = parseFloat(tradeAmount)
    const stablecoinAmount = usdAmount / stablecoinPriceUsd
    const tradeAmountScaled = Math.floor(stablecoinAmount * 1e7).toString()
    const venueAddress = venueAddressMap[selectedVenue]
    
    console.log('💱 Currency conversion:', {
      usdInput: usdAmount,
      stablecoinPriceUsd: stablecoinPriceUsd.toFixed(6),
      stablecoinAmount: stablecoinAmount.toFixed(6),
      tradeAmountScaled: tradeAmountScaled,
      symbol: opportunity.base_opportunity.pair.stablecoin_symbol
    })

    setIsExecuting(true)
    setExecutionError('')
    setExecutionResult(null)

    try {
      console.log('Executing arbitrage trade with params:', {
        userAddress: address,
        opportunity,
        tradeAmount: tradeAmountScaled,
        venueAddress,
        selectedVenue
      })

      // Step 0: Check if user is initialized before attempting trade
      console.log('🔍 Checking user initialization status...')
      const initCheckResponse = await fetch('/api/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_user_initialized',
          userAddress: address
        }),
      })
      
      const initCheckData = await initCheckResponse.json()
      console.log('📋 User initialization check:', initCheckData)
      
      if (!initCheckData.success || !initCheckData.data?.isInitialized) {
        setExecutionError('❌ User account not initialized. Please initialize your account first from the Profile page.')
        return
      }

      // Step 0.5: Additional pre-trade checks
      console.log('💰 Checking user balances and configuration...')
      try {
        const [balanceResponse, configResponse] = await Promise.all([
          fetch('/api/contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get_user_balances',
              userAddress: address
            }),
          }),
          fetch('/api/contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get_user_config',
              userAddress: address
            }),
          })
        ])
        
        const balanceData = await balanceResponse.json()
        const configData = await configResponse.json()
        
        console.log('💳 User balances:', balanceData.data)
        console.log('⚙️ User config:', configData.data)
        
        // Check if trading is enabled
        if (configData.success && !configData.data?.config?.enabled) {
          setExecutionError('❌ Trading is disabled in your configuration. Please enable it in the Profile page.')
          return
        }
      } catch (preCheckError) {
        console.log('⚠️ Pre-trade checks failed:', preCheckError)
        // Continue anyway - these are just diagnostic checks
      }

      // Step 1: Prepare the transaction
      const response = await fetch('/api/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_user_arbitrage',
          userAddress: address,
          opportunity: opportunity,
          tradeAmount: tradeAmountScaled,
          venueAddress: venueAddress,
        }),
      })

      const data = await response.json()
      console.log('✅ Execute User Arbitrage API Response:')
      console.log('📊 Response Status:', response.status)
      console.log('💫 Response Data:', {
        success: data.success,
        message: data.data?.message,
        tradeDetails: {
          userAddress: address,
          selectedVenue: selectedVenue,
          venueAddress: venueAddress,
          tradeAmount: tradeAmountScaled,
          opportunityPair: `${opportunity.base_opportunity.pair.stablecoin_symbol}/${opportunity.base_opportunity.pair.fiat_symbol}`
        }
      })
      console.log('🔐 Transaction XDR Length:', data.data?.transactionXdr?.length || 'N/A')

      if (data.success && data.data.transactionXdr) {
        console.log('✅ Transaction prepared successfully, prompting wallet to sign...')
        
        // Step 2: Sign the transaction with user's wallet
        if (!walletKit) {
          setExecutionError('Wallet not connected properly')
          return
        }

        try {
          // Sign the transaction
          const signedTransaction = await walletKit.signTransaction(data.data.transactionXdr, {
            networkPassphrase: 'Test SDF Network ; September 2015'
          })

          console.log('✅ Transaction signed successfully:', signedTransaction)
          
          // Step 3: Submit the signed transaction using our enhanced submit endpoint
          try {
            // Validate signed XDR before submission
            try {
              console.log('Validating signed XDR before submission...');
              const validatedTx = TransactionBuilder.fromXDR(signedTransaction.signedTxXdr, Networks.TESTNET);
              console.log('Signed XDR validation successful');
              console.log('Signed XDR first 200 chars:', signedTransaction.signedTxXdr.substring(0, 200));
            } catch (validationError) {
              console.error('CRITICAL: Signed XDR is corrupted!', validationError);
              throw new Error(`Wallet returned corrupted XDR: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`);
            }

            // Submit the signed transaction using our enhanced submit endpoint
            const submitResponse = await fetch('/api/contract/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ signedXdr: signedTransaction.signedTxXdr }),
            })

            const submitResult = await submitResponse.json()

            if (submitResult.success) {
              console.log('✅ Arbitrage transaction confirmed:', submitResult.data)
              
              // Check contract execution status first
              const contractStatus = submitResult.data?.contractStatus || submitResult.data?.result?.status
              
              if (contractStatus && contractStatus !== 'SUCCESS') {
                // Transaction was successful on blockchain, but contract execution failed
                console.log('⚠️ Contract execution failed with status:', contractStatus)
                
                let contractErrorMessage = ''
                if (contractStatus === 'INSUFFICIENT_USER_BALANCE') {
                  contractErrorMessage = `❌ Insufficient Balance in Contract

The transaction was submitted successfully, but your arbitrage bot account doesn't have enough funds deposited to execute this trade.

💰 USD Amount: $${tradeAmount}
🪙 Required: ${(usdAmount / stablecoinPriceUsd).toFixed(6)} ${opportunity.base_opportunity.pair.stablecoin_symbol}
💵 Token Price: $${stablecoinPriceUsd.toFixed(6)} per ${opportunity.base_opportunity.pair.stablecoin_symbol}

📝 To deposit funds:
1. Click on your Profile (top-right corner)
2. Go to the "Activity" tab  
3. Use the "Deposit" section to add ${opportunity.base_opportunity.pair.stablecoin_symbol} tokens
4. Deposit at least ${(usdAmount / stablecoinPriceUsd).toFixed(6)} ${opportunity.base_opportunity.pair.stablecoin_symbol}
5. Return here to execute the trade

🔗 Transaction Hash: ${submitResult.data.hash}`
                } else {
                  contractErrorMessage = `❌ Contract Execution Failed: ${contractStatus}

The transaction was submitted successfully, but the contract execution failed.

Please check your account configuration in the Profile page.

🔗 Transaction Hash: ${submitResult.data.hash}`
                }
                
                setExecutionError(contractErrorMessage)
                return
              }
              
              // Automatically fetch updated trade history after successful execution
              try {
                console.log('📊 Fetching updated user trade history...')
                const historyResponse = await fetch('/api/contract', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'get_user_trade_history',
                    userAddress: address,
                    limit: 5 // Get last 5 trades
                  }),
                })

                const historyData = await historyResponse.json()
                if (historyData.success) {
                  console.log('✅ Updated trade history:', historyData.data)
                  console.log('📈 Total trades count:', historyData.data.count)
                  
                  if (historyData.data.count === 0) {
                    console.log('⚠️ WARNING: Trade history is empty after successful transaction!')
                    console.log('🔍 This indicates the contract execution may have failed internally')
                    console.log('� Common causes:')
                    console.log('   - User account not properly initialized')
                    console.log('   - Insufficient balance in contract')
                    console.log('   - Risk limits exceeded')
                    console.log('   - Contract validation failed')
                    console.log('📝 Transaction Hash for investigation:', submitResult.data.hash)
                  } else {
                    console.log('�💰 Latest trade details:', historyData.data.trades[historyData.data.trades.length - 1])
                  }
                } else {
                  console.log('⚠️ Could not fetch updated trade history:', historyData.error)
                }
              } catch (historyError) {
                console.log('⚠️ Error fetching trade history:', historyError)
              }
              
              // Handle different success statuses
              if (submitResult.data.status === 'SUCCESS_BUT_RESULT_UNPARSEABLE') {
                setExecutionResult({
                  ...data.data,
                  transactionHash: submitResult.data.hash,
                  status: 'SUCCESS',
                  stablecoinAmount: stablecoinAmount,
                  message: `Arbitrage transaction completed successfully! 

Hash: ${submitResult.data.hash}

Note: Due to a Horizon server issue, we couldn't retrieve the full transaction details, but the transaction likely succeeded. You can check the status on Stellar Expert.`
                })
              } else {
                setExecutionResult({
                  ...data.data,
                  transactionHash: submitResult.data.hash,
                  status: submitResult.data.status,
                  stablecoinAmount: stablecoinAmount,
                  message: 'Arbitrage transaction completed successfully!',
                  finalResult: submitResult.data
                })
              }
            } else {
              console.error('❌ Arbitrage transaction failed:', submitResult)
              
              // Enhanced error handling with specific checks for contract execution status
              let errorMessage = submitResult.error || 'Transaction failed'
              let isContractError = false
              
              // Parse contract execution errors from the transaction result
              const contractStatus = submitResult.data?.contractStatus || submitResult.data?.result?.status
              
              if (contractStatus && contractStatus !== 'SUCCESS') {
                isContractError = true
                console.log('Contract execution status:', contractStatus)
                
                if (contractStatus === 'INSUFFICIENT_USER_BALANCE') {
                  errorMessage = `❌ Insufficient Balance in Contract

Your arbitrage bot account doesn't have enough funds deposited to execute this trade.

💰 USD Amount: $${tradeAmount}
🪙 Required: ${(usdAmount / stablecoinPriceUsd).toFixed(6)} ${opportunity.base_opportunity.pair.stablecoin_symbol}
💵 Token Price: $${stablecoinPriceUsd.toFixed(6)} per ${opportunity.base_opportunity.pair.stablecoin_symbol}

📝 To deposit funds:
1. Click on your Profile (top-right corner)
2. Go to the "Activity" tab
3. Use the "Deposit" section to add ${opportunity.base_opportunity.pair.stablecoin_symbol} tokens
4. Deposit at least ${(usdAmount / stablecoinPriceUsd).toFixed(6)} ${opportunity.base_opportunity.pair.stablecoin_symbol}
5. Return here to execute the trade

Note: The transaction was submitted successfully, but the trade couldn't be executed due to insufficient contract balance.`
                } else if (contractStatus === 'USER_INACTIVE') {
                  errorMessage = '❌ Your arbitrage bot account is inactive. Please activate it in your Profile settings.'
                } else if (contractStatus === 'USER_POSITION_TOO_LARGE') {
                  errorMessage = '❌ Trade amount exceeds your maximum position size limit. Please reduce the trade amount or update your risk limits in Profile settings.'
                } else if (contractStatus === 'USER_DAILY_LIMIT_EXCEEDED') {
                  errorMessage = '❌ This trade would exceed your daily volume limit. Please wait until tomorrow or increase your daily limit in Profile settings.'
                } else if (contractStatus === 'USER_BOT_DISABLED') {
                  errorMessage = '❌ Your arbitrage bot is disabled. Please enable it in your Profile configuration.'
                } else {
                  errorMessage = `❌ Contract execution failed with status: ${contractStatus}. Please check your account configuration.`
                }
              }
              
              // Fallback for non-contract errors
              if (!isContractError) {
                if (errorMessage.includes('not initialized')) {
                  errorMessage = '❌ Account not initialized. Please initialize your account first from the Profile page.'
                } else if (errorMessage.includes('insufficient')) {
                  errorMessage = '❌ Insufficient balance or allowance for this transaction.'
                } else if (errorMessage.includes('auth')) {
                  errorMessage = '❌ Authentication failed. Please check your wallet connection.'
                }
              }
              
              setExecutionError(errorMessage)
              
              // Log detailed error information for debugging
              if (submitResult.details) {
                console.error('Detailed error information:', submitResult.details)
              }
            }
            
          } catch (submitError) {
            console.error('❌ Transaction submission failed:', submitError)
            setExecutionError(`Transaction submission failed: ${submitError instanceof Error ? submitError.message : 'Unknown error'}`)
          }

        } catch (signError) {
          console.error('❌ Transaction signing failed:', signError)
          if (signError instanceof Error && signError.message.includes('User declined')) {
            setExecutionError('Transaction was cancelled by user')
          } else {
            setExecutionError(`Transaction signing failed: ${signError instanceof Error ? signError.message : 'Unknown error'}`)
          }
        }

      } else {
        setExecutionError(data.error || 'Failed to prepare arbitrage transaction')
        console.error('❌ Transaction preparation failed:', data.error)
      }
    } catch (err) {
      console.error('❌ Network error during arbitrage execution:', err)
      setExecutionError('Network error while executing arbitrage')
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="
        bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl
        w-[850px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col
        transition-all ease-out
        animate-in fade-in-0 zoom-in-95 duration-300
        shadow-xl shadow-black/20
        font-raleway
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
          <div>
            <h2 className="text-white/90 text-xl font-medium">
              Arbitrage Opportunity Details
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {opportunity.base_opportunity.pair.stablecoin_symbol} vs {opportunity.base_opportunity.pair.fiat_symbol}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white/80 transition-colors duration-200 p-2 hover:bg-white/5 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 bg-black/30 overflow-y-auto faq-scrollbar">
          <div className="p-6 space-y-6">
            
            {/* Overview and Price Information Cards - Horizontal Layout */}
            <div className="flex gap-6 h-72">
              
              {/* Overview Card - 50% Width */}
              <div className="flex-[2] bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
                <h3 className="text-white/90 font-medium text-lg mb-4 flex items-center gap-2">
                  <Target size={18} />
                  Opportunity Overview
                </h3>
                
                {/* 2x2 Grid Layout */}
                <div className="grid grid-cols-2 gap-4 h-32">
                  {/* Direction */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Direction</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.direction}
                        </div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${
                      opportunity.base_opportunity.trade_direction === 'BUY' 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {opportunity.base_opportunity.trade_direction === 'BUY' 
                        ? <TrendingUp size={20} /> 
                        : <TrendingDown size={20} />
                      }
                      <span className="font-medium text-lg text-white">
                        {opportunity.base_opportunity.trade_direction}
                      </span>
                    </div>
                  </div>

                  {/* Deviation */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Deviation</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.deviation}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 font-medium text-lg">
                      {formatDeviationBps(opportunity.base_opportunity.deviation_bps)}
                    </div>
                  </div>

                  {/* Est. Profit */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Est. Profit</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.estimatedProfit}
                        </div>
                      </div>
                    </div>
                    <div className="text-white font-medium text-lg">
                      ${formatPrice(opportunity.base_opportunity.estimated_profit)}
                    </div>
                  </div>

                  {/* Confidence Score - Circular Progress */}
                  <div className="flex flex-col items-center justify-center bg-black/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-white/50 text-xs">Confidence</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.confidence}
                        </div>
                      </div>
                    </div>
                    <div className="relative w-16 h-16">
                      {/* Background Circle */}
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="rgb(255 255 255 / 0.1)"
                          strokeWidth="4"
                          fill="none"
                        />
                        {/* Progress Circle */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke={
                            opportunity.confidence_score >= 8000 
                              ? 'rgb(34 197 94)' // green-400
                              : opportunity.confidence_score >= 6000 
                              ? 'rgb(250 204 21)' // yellow-400  
                              : 'rgb(248 113 113)' // red-400
                          }
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - opportunity.confidence_score / 10000)}`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      {/* Score Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`font-bold text-sm ${
                            opportunity.confidence_score >= 8000 
                              ? 'text-green-400' 
                              : opportunity.confidence_score >= 6000 
                              ? 'text-yellow-400' 
                              : 'text-red-400'
                          }`}>
                            {(opportunity.confidence_score / 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-white/60">
                            {getConfidenceText(opportunity.confidence_score)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Information Card - 50% Width */}
              <div className="flex-[2] bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
                <h3 className="text-white/90 font-medium text-lg mb-4 flex items-center gap-2">
                  <Zap size={18} />
                  Price Information
                </h3>
                
                {/* 2x2 Grid Layout */}
                <div className="grid grid-cols-2 gap-3 h-48 font-raleway">
                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">Stablecoin Price</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.stablecoinPrice}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      ${formatPrice(opportunity.base_opportunity.stablecoin_price)}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">Fiat Exchange Rate</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.fiatRate}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      ${formatPrice(opportunity.base_opportunity.fiat_rate)}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">TWAP Price</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute left-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.twapPrice}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      {opportunity.twap_price ? `$${formatPrice(opportunity.twap_price)}` : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-lg p-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-white/50 text-xs">Max Trade Size</div>
                      <div className="group relative">
                        <Info size={10} className="text-white/40 hover:text-white/60 cursor-help" />
                        <div className="absolute right-5 top-0 w-64 p-2 bg-black/90 text-white/80 text-xs rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                          {tooltipInfo.maxTradeSize}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/90 text-lg">
                      ${formatLargeNumber(opportunity.max_trade_size)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Recommendations */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
              <h3 className="text-white/90 font-medium text-lg mb-2 flex items-center gap-2">
                <Building size={18} />
                Recommended Trading Venues
              </h3>
              <p className="text-white/60 text-xs mb-4">
                <Info size={12} className="inline mr-1" />
                Note: You must select one venue before executing the trade
              </p>
              
              <div className="space-y-3">
                {/* Hardcoded venues for testnet */}
                {[
                  { name: 'Soroswap', enabled: true, fee_bps: 30, liquidity_threshold: '1000000000000' },
                  { name: 'Soroswap Router', enabled: true, fee_bps: 25, liquidity_threshold: '500000000000' }
                ].map((venue, index) => (
                  <div key={index} className="bg-black/20 rounded-lg p-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="venue"
                          value={venue.name}
                          checked={selectedVenue === venue.name}
                          onChange={(e) => setSelectedVenue(e.target.value)}
                          className="w-4 h-4 text-blue-500 bg-transparent border-2 border-white/30 rounded-full focus:ring-blue-500 focus:ring-2"
                        />
                        <div className={`w-2 h-2 rounded-full ${
                          venue.enabled ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <div>
                          <div className="text-white/90 font-medium text-sm">{venue.name}</div>
                          <div className="text-white/50 text-xs">
                            Fee: {(venue.fee_bps / 100).toFixed(2)}% • Min: ${formatLargeNumber(venue.liquidity_threshold)}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade Amount Input */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 border border-white/15">
              <h3 className="text-white/90 font-medium text-lg mb-4 flex items-center gap-2">
                <Target size={18} />
                Trade Amount (USD)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formatLargeNumber(opportunity.max_trade_size)}
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="Enter trade amount in USD"
                    className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:border-white/40 focus:ring-1 focus:ring-white/20 focus:outline-none"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-2">
                    <span>Min: $1.00</span>
                    <span>Max: ${formatLargeNumber(opportunity.max_trade_size)}</span>
                  </div>
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2">
                  {[25, 50, 100, 250].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTradeAmount(amount.toString())}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white/70 transition-all"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Execution Status */}
            {executionResult && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle size={16} />
                  <span className="text-sm font-medium">Transaction Status: {executionResult.status || 'PREPARED'}</span>
                </div>
                <p className="text-green-300 text-sm mb-3">{executionResult.message}</p>
                <div className="text-xs text-white/60">
                  <p><strong>Trade Details:</strong></p>
                  <p>• USD Amount: ${tradeAmount}</p>
                  <p>• Token Amount: {executionResult.stablecoinAmount?.toFixed(6)} {opportunity.base_opportunity.pair.stablecoin_symbol}</p>
                  <p>• Venue: {selectedVenue}</p>
                  <p>• Pair: {executionResult.tradeDetails?.opportunityPair}</p>
                  {executionResult.transactionHash && (
                    <p>• Transaction: <a 
                      href={`https://stellar.expert/explorer/testnet/tx/${executionResult.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      {executionResult.transactionHash.substring(0, 12)}...
                    </a></p>
                  )}
                </div>
              </div>
            )}

            {executionError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Execution Error</span>
                </div>
                <p className="text-red-300 text-sm">{executionError}</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-white/5 bg-black/10">
          
          <button 
            onClick={executeArbitrage}
            disabled={isExecuting || !address || !selectedVenue || !tradeAmount}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg
              transition-all duration-300 ease-out
              focus:ring-2 focus:ring-white/20
              active:scale-[0.98]
              font-raleway
              ${isExecuting || !address || !selectedVenue || !tradeAmount
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-white text-black hover:bg-white/90 hover:shadow-md focus:bg-white/90'
              }
            `}
          >
            {isExecuting ? 'Executing...' : 'Execute Trade'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdvancedOpportunitiesModal
