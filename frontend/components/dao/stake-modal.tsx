'use client'
import React, { useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const StakeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { address, walletKit } = useWallet()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const stake = async () => {
    if (!address) {
      setError('Connect wallet first')
      return
    }
    const amt = amount.trim()
    if (!amt || Number(amt) <= 0) {
      setError('Enter a valid amount')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      // 1) Prepare transaction XDR via API
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stake_kale', staker: address, amount: amt })
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to prepare stake transaction')
        return
      }

      const preparedXdr: string = data.data.transactionXdr

      // 2) Sign with connected wallet
      if (!walletKit) {
        setError('Wallet not connected')
        return
      }

      const { signedTxXdr } = await walletKit.signTransaction(preparedXdr, {
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      // 3) Submit signed transaction
      const submitRes = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', signedXdr: signedTxXdr })
      })
      const submitData = await submitRes.json()
      if (!submitData.success) {
        setError(submitData.error || 'Failed to submit transaction')
        return
      }
      setSuccess('Transaction submitted. Hash: ' + submitData.data.hash)
    } catch (e) {
      setError('Network error while staking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 font-raleway">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg">Stake KALE</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white/90 text-sm">Close</button>
        </div>

        <div className="space-y-3">
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount in KALE"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20"
          />

          <button
            onClick={stake}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Preparing...' : 'Stake'}
          </button>

          {error && <div className="text-red-400 text-xs p-2 bg-red-400/10 rounded-lg">{error}</div>}
          {success && <div className="text-emerald-400 text-xs p-2 bg-emerald-400/10 rounded-lg">{success}</div>}
        </div>
      </div>
    </div>
  )
}

export default StakeModal

