'use client'
import React, { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import type { StakeInfo } from '../../daobindings/src'

interface Props {
  isOpen: boolean
  onClose: () => void
  onStakeUpdate?: () => void
  showMessage?: (message: string) => void
}

const StakeModal: React.FC<Props> = ({ isOpen, onClose, onStakeUpdate, showMessage }) => {
  const { address, walletKit } = useWallet()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake')
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null)
  const [currentStake, setCurrentStake] = useState<string>('0')
  const [totalStaked, setTotalStaked] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && address) {
      fetchStakeInfo()
    }
  }, [isOpen, address])

  // Cleanup
  useEffect(() => {
    return () => {
      setError(null)
      setAmount('')
    }
  }, [isOpen])

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
      
      if (onStakeUpdate) {
        onStakeUpdate()
      }
    } catch (e) {
      console.error('Failed to fetch stake info:', e)
    }
  }
  if (!isOpen) return null

  const handleStake = async () => {
    if (!address || !walletKit) {
      setError('Please connect your wallet first')
      return
    }
    
    const amt = amount.trim()
    if (!amt || Number(amt) <= 0) {
      setError('Enter a valid amount')
      return
    }
    
    setError(null)
    setIsLoading(true)
    
    try {
      console.log(`Preparing ${mode} transaction for`, amt, 'KALE')
      const action = mode === 'stake' ? 'stake_kale' : 'unstake_kale'
      
      // Step 1: Prepare transaction
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
        setError(prepareData.error || `Failed to prepare ${mode} transaction`)
        return
      }

      // Step 2: Sign transaction
      const signResult = await walletKit.signTransaction(prepareData.data.transactionXdr, {
        address,
        networkPassphrase: 'Test SDF Network ; September 2015',
      })

      console.log('Transaction signed, submitting...')

      // Step 3: Submit signed transaction using contract API (same as deposit/withdraw)
      const submitResponse = await fetch('/api/contract/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr: signResult.signedTxXdr }),
      })
      
      const submitData = await submitResponse.json()
      console.log('Submit response:', submitData)
      
      if (submitData.success) {
        const action = mode === 'stake' ? 'Staked' : 'Unstaked'
        if (showMessage) {
          if (submitData.data.status === 'SUCCESS') {
            showMessage(`✅ ${action} ${amt} KALE successfully!`)
          } else {
            showMessage(`✅ ${action} transaction submitted successfully! Hash: ${submitData.data.hash}`)
          }
        }
        
        setAmount('')
        await fetchStakeInfo()
        
        // Close modal after short delay
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(submitData.error || 'Failed to submit transaction')
      }
      
    } catch (e) {
      console.error('Transaction error:', e)
      setError(e instanceof Error ? e.message : 'Network error during transaction')
    } finally {
      setIsLoading(false)
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-lg">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 font-raleway shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white/90 text-xl font-medium">Manage KALE Stake</h3>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="text-white/50 hover:text-white/90 text-sm disabled:opacity-50 p-2 hover:bg-white/5 rounded-xl transition-all duration-300"
          >
            ✕
          </button>
        </div>

        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
          <div className="text-white/70 mb-3 font-medium">Current Stake Info:</div>
          <div className="text-white/90 text-lg font-raleway font-medium">Amount: {formatStakeAmount(currentStake)} KALE</div>
          <div className="text-white/60 text-sm mt-1">Total Staked: {formatStakeAmount(totalStaked)} KALE</div>
          {stakeInfo && (
            <div className="text-white/50 text-xs mt-3 space-y-1 pt-3 border-t border-white/10">
              <div>Staked: <span className="text-white/70">{formatTimestamp(stakeInfo.staked_at)}</span></div>
              <div>Last Update: <span className="text-white/70">{formatTimestamp(stakeInfo.last_stake_update)}</span></div>
              {mode === 'unstake' && (
                <div className={`font-medium ${canUnstake() ? 'text-emerald-400' : 'text-red-400'}`}>
                  {canUnstake() ? '✓ Can unstake' : '⏳ Cooldown period (7 days) not met'}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex rounded-xl border border-white/10 overflow-hidden mb-6 bg-black/20">
          <button
            onClick={() => setMode('stake')}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 text-sm disabled:opacity-50 transition-all duration-300 font-medium ${
              mode === 'stake' 
                ? 'bg-black/30 text-white border-r border-white/20' : 'text-white/60 hover:text-white/90 hover:bg-white/5'
            }`}
          >
            Stake
          </button>
          <button
            onClick={() => setMode('unstake')}
            disabled={Number(currentStake) === 0 || isLoading}
            className={`flex-1 px-4 py-3 text-sm disabled:opacity-50 transition-all duration-300 font-medium ${
              mode === 'unstake' 
                ? 'bg-black/30 text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/5'
            }`}
          >
            Unstake
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-white/70 text-sm font-medium">
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
              disabled={isLoading}
              className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none transition-all duration-300 disabled:opacity-50 font-raleway"
            />
          </div>

          {mode === 'unstake' && stakeInfo && (
            <div className="text-xs text-white/60 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl backdrop-blur-sm font-raleway">
              <span className="text-yellow-400">⚠️</span> Note: Unstaking has a 7-day cooldown period from your last stake update.
            </div>
          )}

          <button
            onClick={handleStake}
            disabled={isLoading || !address || !amount.trim() || (mode === 'unstake' && !canUnstake())}
            className="w-full bg-black/20 hover:bg-black/40 disabled:bg-black/10 backdrop-blur-sm border border-white/15 hover:border-white/30 disabled:border-white/5 text-white/90 hover:text-white disabled:text-white/30 px-6 py-4 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed font-raleway"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : !address ? 'Connect Wallet' : 
            mode === 'unstake' && !canUnstake() ? 'Cooldown Period Active' :
            `${mode === 'stake' ? 'Stake' : 'Unstake'} KALE`}
          </button>

          {error && (
            <div className="text-red-400/90 text-sm p-3 bg-red-400/10 rounded-xl border border-red-400/30 backdrop-blur-sm font-raleway">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StakeModal
