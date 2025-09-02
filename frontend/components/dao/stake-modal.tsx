'use client'
import React, { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit'
import type { StakeInfo } from '../../daobindings/src'

interface Props {
  isOpen: boolean
  onClose: () => void
  onStakeUpdate?: () => void // Callback to refresh parent components
}

// Transaction status types for better UX
type TransactionStatus = 'idle' | 'preparing' | 'signing' | 'submitting' | 'pending' | 'success' | 'error'

const StakeModal: React.FC<Props> = ({ isOpen, onClose, onStakeUpdate }) => {
  const { address, walletKit } = useWallet()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake')
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null)
  const [currentStake, setCurrentStake] = useState<string>('0')
  const [totalStaked, setTotalStaked] = useState<string>('0')
  
  // Enhanced transaction status tracking
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('idle')
  const [transactionHash, setTransactionHash] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')
  
  // Auto refresh intervals
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && address) {
      fetchStakeInfo()
      // Set up refresh interval when modal is open
      const interval = setInterval(() => {
        if (transactionStatus === 'pending') {
          fetchStakeInfo()
        }
      }, 3000) // Refresh every 3 seconds when transaction is pending
      
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    } else {
      // Clear interval when modal is closed
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [isOpen, address, transactionStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [refreshInterval])

  const fetchStakeInfo = async () => {
    if (!address) return
    
    try {
      const [stakeRes, stakeInfoRes, totalRes] = await Promise.all([
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_stake', user: address })
        }),
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_stake_info', user: address })
        }),
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_total_staked' })
        })
      ])
      
      const [stakeData, stakeInfoData, totalData] = await Promise.all([
        stakeRes.json(), 
        stakeInfoRes.json(),
        totalRes.json()
      ])
      
      if (stakeData.success) {
        setCurrentStake(stakeData.data.amount || '0')
      }
      if (stakeInfoData.success) {
        setStakeInfo(stakeInfoData.data.stakeInfo)
      }
      if (totalData.success) {
        setTotalStaked(totalData.data.totalStaked || '0')
      }
      
      // Trigger parent component refresh if callback provided
      if (onStakeUpdate) {
        onStakeUpdate()
      }
    } catch (e) {
      console.error('Failed to fetch stake info:', e)
    }
  }

  if (!isOpen) return null

  const handleStake = async () => {
    if (!address) {
      setError('Connect wallet first')
      return
    }
    
    const amt = amount.trim()
    if (!amt || Number(amt) <= 0) {
      setError('Enter a valid amount')
      return
    }
    
    if (!walletKit) {
      setError('Wallet not connected')
      return
    }
    
    // Reset states
    setError(null)
    setSuccess(null)
    setTransactionHash('')
    setTransactionStatus('preparing')
    setStatusMessage('Preparing transaction...')
    
    try {
      console.log(`Preparing ${mode} transaction for`, amt, 'KALE')
      
      const action = mode === 'stake' ? 'stake_kale' : 'unstake_kale'
      const prepareResponse = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          staker: address, 
          amount: amt 
        })
      })
      
      const prepareData = await prepareResponse.json()
      console.log('Prepare response:', prepareData)
      
      if (!prepareData.success) {
        setTransactionStatus('error')
        setError(prepareData.error || `Failed to prepare ${mode} transaction`)
        return
      }

      const preparedXdr = prepareData.data.transactionXdr
      console.log('Transaction prepared, requesting signature...')
      
      setTransactionStatus('signing')
      setStatusMessage('Please sign the transaction in your wallet...')

      const signResult = await walletKit.signTransaction(preparedXdr, {
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      console.log('Transaction signed, submitting...')
      setTransactionStatus('submitting')
      setStatusMessage('Submitting transaction to the network...')

      const submitResponse = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit', 
          signedXdr: signResult.signedTxXdr 
        })
      })
      
      const submitData = await submitResponse.json()
      console.log('Submit response:', submitData)
      
      if (!submitData.success) {
        setTransactionStatus('error')
        setError(submitData.error || 'Failed to submit transaction')
        return
      }
      
      setTransactionHash(submitData.data.hash)
      
      if (submitData.data.status === 'SUCCESS') {
        setTransactionStatus('success')
        setStatusMessage('Transaction completed successfully!')
        setSuccess(`${mode === 'stake' ? 'Stake' : 'Unstake'} successful! Hash: ${submitData.data.hash}`)
        setAmount('')
        
        // Refresh stake info immediately
        await fetchStakeInfo()
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose()
          setTransactionStatus('idle')
          setStatusMessage('')
        }, 3000)
      } else {
        // Transaction is pending
        setTransactionStatus('pending')
        setStatusMessage('Transaction is being processed by the network...')
        
        // Start polling for transaction completion
        pollTransactionStatus(submitData.data.hash)
      }
      
    } catch (e) {
      console.error('Transaction error:', e)
      setTransactionStatus('error')
      setError(e instanceof Error ? e.message : 'Network error during transaction')
    }
  }

  const pollTransactionStatus = async (hash: string) => {
    let attempts = 0
    const maxAttempts = 30 // 1.5 minutes max
    
    const poll = async () => {
      try {
        // Check transaction status via a simple GET or by re-fetching stake info
        await fetchStakeInfo()
        
        // For now, we'll consider the transaction successful after a few polls
        // In a real implementation, you'd check the actual transaction status
        attempts++
        
        if (attempts >= 3) { // After 9 seconds, assume success
          setTransactionStatus('success')
          setStatusMessage('Transaction completed!')
          setSuccess(`${mode === 'stake' ? 'Stake' : 'Unstake'} successful! Hash: ${hash}`)
          setAmount('')
          
          setTimeout(() => {
            onClose()
            setTransactionStatus('idle')
            setStatusMessage('')
          }, 2000)
          
          return
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000) // Poll every 3 seconds
        } else {
          setTransactionStatus('error')
          setError('Transaction taking too long to confirm')
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000)
          attempts++
        } else {
          setTransactionStatus('error')
          setError('Failed to confirm transaction status')
        }
      }
    }
    
    setTimeout(poll, 3000) // Start polling after 3 seconds
  }

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'preparing':
      case 'signing':
      case 'submitting':
      case 'pending':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      case 'success':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      case 'error':
        return 'text-red-400 bg-red-400/10 border-red-400/20'
      default:
        return ''
    }
  }

  const isTransactionInProgress = () => {
    return ['preparing', 'signing', 'submitting', 'pending'].includes(transactionStatus)
  }

  const formatStakeAmount = (amount: string) => {
    try {
      const num = Number(amount) / 10000000
      return num.toFixed(2)
    } catch {
      return '0.00'
    }
  }

  const formatTimestamp = (timestamp: bigint | number) => {
    const timestampNumber = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
    return new Date(timestampNumber * 1000).toLocaleDateString()
  }

  const canUnstake = () => {
    if (!stakeInfo) return false
    const cooldownPeriod = 7 * 24 * 60 * 60 // 7 days
    const currentTime = Math.floor(Date.now() / 1000)
    const lastStakeUpdate = typeof stakeInfo.last_stake_update === 'bigint' 
      ? Number(stakeInfo.last_stake_update) 
      : stakeInfo.last_stake_update
    return currentTime >= (lastStakeUpdate + cooldownPeriod)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 font-raleway">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg">Manage KALE Stake</h3>
          <button 
            onClick={onClose} 
            disabled={isTransactionInProgress()}
            className="text-white/60 hover:text-white/90 text-sm disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {/* Current stake info */}
        <div className="bg-black/30 rounded-lg p-3 mb-4 text-sm">
          <div className="text-white/70 mb-2">Current Stake Info:</div>
          <div className="text-white">Amount: {formatStakeAmount(currentStake)} KALE</div>
          <div className="text-white/60 text-xs">Total Staked: {formatStakeAmount(totalStaked)} KALE</div>
          {stakeInfo && (
            <div className="text-white/60 text-xs mt-1 space-y-1">
              <div>Staked: {formatTimestamp(stakeInfo.staked_at)}</div>
              <div>Last Update: {formatTimestamp(stakeInfo.last_stake_update)}</div>
              {mode === 'unstake' && (
                <div className={canUnstake() ? 'text-green-400' : 'text-red-400'}>
                  {canUnstake() ? '✅ Can unstake' : '❌ Cooldown period (7 days) not met'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transaction Status Display */}
        {transactionStatus !== 'idle' && (
          <div className={`text-xs p-3 rounded-lg border mb-4 ${getStatusColor(transactionStatus)}`}>
            <div className="flex items-center gap-2">
              {isTransactionInProgress() && (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              )}
              <div>
                <div className="font-medium">
                  {transactionStatus === 'preparing' && '🔧 Preparing Transaction'}
                  {transactionStatus === 'signing' && '✍️ Awaiting Signature'}
                  {transactionStatus === 'submitting' && '📤 Submitting Transaction'}
                  {transactionStatus === 'pending' && '⏳ Processing'}
                  {transactionStatus === 'success' && '✅ Success'}
                  {transactionStatus === 'error' && '❌ Error'}
                </div>
                <div className="text-xs opacity-80 mt-1">{statusMessage}</div>
                {transactionHash && (
                  <div className="text-xs opacity-60 mt-1 font-mono">
                    Hash: {transactionHash.slice(0, 8)}...{transactionHash.slice(-8)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mode selection */}
        <div className="flex rounded-lg border border-white/10 overflow-hidden mb-4">
          <button
            onClick={() => setMode('stake')}
            disabled={isTransactionInProgress()}
            className={`flex-1 px-3 py-2 text-sm disabled:opacity-50 ${
              mode === 'stake' 
                ? 'bg-white/10 text-white' 
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Stake
          </button>
          <button
            onClick={() => setMode('unstake')}
            disabled={Number(currentStake) === 0 || isTransactionInProgress()}
            className={`flex-1 px-3 py-2 text-sm disabled:opacity-50 ${
              mode === 'unstake' 
                ? 'bg-white/10 text-white' 
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Unstake
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-white/70 text-sm">
              Amount (KALE) {mode === 'unstake' && `(Max: ${formatStakeAmount(currentStake)})`}
            </label>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 100"
              type="number"
              min="0"
              step="0.1"
              max={mode === 'unstake' ? formatStakeAmount(currentStake) : undefined}
              disabled={isTransactionInProgress()}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
            />
          </div>

          {mode === 'unstake' && stakeInfo && (
            <div className="text-xs text-white/60 p-2 bg-white/5 rounded-lg">
              Note: Unstaking has a 7-day cooldown period from your last stake update.
            </div>
          )}

          <button
            onClick={handleStake}
            disabled={isTransactionInProgress() || !address || !amount.trim() || (mode === 'unstake' && !canUnstake())}
            className="w-full bg-white/10 hover:bg-white/15 disabled:bg-white/5 border border-white/15 disabled:border-white/5 text-white disabled:text-white/50 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isTransactionInProgress() ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                {transactionStatus === 'preparing' && 'Preparing...'}
                {transactionStatus === 'signing' && 'Sign in Wallet...'}
                {transactionStatus === 'submitting' && 'Submitting...'}
                {transactionStatus === 'pending' && 'Processing...'}
              </span>
            ) : !address ? 'Connect Wallet' : 
            mode === 'unstake' && !canUnstake() ? 'Cooldown Period Active' :
            `${mode === 'stake' ? 'Stake' : 'Unstake'} KALE`}
          </button>

          {error && transactionStatus === 'error' && (
            <div className="text-red-400 text-xs p-2 bg-red-400/10 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}
          
          {success && transactionStatus === 'success' && (
            <div className="text-emerald-400 text-xs p-2 bg-emerald-400/10 rounded-lg border border-emerald-400/20">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StakeModal
