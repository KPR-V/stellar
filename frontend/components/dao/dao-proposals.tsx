'use client'
import React, { useEffect, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'

type ProposalStatus = 'Active' | 'Passed' | 'Failed' | 'Executed' | 'Cancelled'
type ProposalType = 'UpdateConfig' | 'AddTradingPair' | 'AddTradingVenue' | 'PausePair' | 'UpdateRiskManager' | 'EmergencyStop' | 'TransferAdmin'

interface Proposal {
  id: number
  proposer: string
  proposal_type: ProposalType
  title: string
  description: string
  created_at: number
  voting_ends_at: number
  yes_votes: string
  no_votes: string
  status: ProposalStatus
  quorum_required: string
}

interface Props {
  onRequireStake: () => void
}

const DaoProposals: React.FC<Props> = ({ onRequireStake }) => {
  const { address } = useWallet()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [hasStake, setHasStake] = useState<boolean>(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    proposal_type: 'UpdateConfig' as ProposalType,
  })

  const fetchProposals = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_active_proposals' })
      })
      const data = await res.json()
      if (data.success) {
        setProposals(data.data.proposals as Proposal[])
      } else {
        setError(data.error || 'Failed to load proposals')
      }
    } catch (e) {
      setError('Network error while loading proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [])

  useEffect(() => {
    const checkStake = async () => {
      if (!address) {
        setHasStake(false)
        return
      }
      try {
        const res = await fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_stake', user: address })
        })
        const data = await res.json()
        if (data.success) {
          const amt = BigInt(data.data.amount || '0')
          setHasStake(amt > 0n)
        } else {
          setHasStake(false)
        }
      } catch {
        setHasStake(false)
      }
    }
    checkStake()
  }, [address])

  const handleVote = async (proposalId: number, voteYes: boolean) => {
    if (!address || !hasStake) return onRequireStake()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          voter: address,
          proposal_id: proposalId,
          vote_yes: voteYes,
        })
      })
      const data = await res.json()
      if (!data.success) setError(data.error || 'Failed to vote')
      await fetchProposals()
    } catch (e) {
      setError('Network error while voting')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!address || !hasStake) return onRequireStake()
    if (!form.title.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_proposal',
          proposer: address,
          title: form.title,
          description: form.description,
          proposal_type: form.proposal_type,
          proposal_data: {},
        })
      })
      const data = await res.json()
      if (!data.success) setError(data.error || 'Failed to create proposal')
      setForm({ title: '', description: '', proposal_type: 'UpdateConfig' })
      await fetchProposals()
    } catch (e) {
      setError('Network error while creating proposal')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white/90 text-lg font-medium">Governance Proposals</h3>
        <button
          onClick={fetchProposals}
          className="text-xs text-white/70 hover:text-white/90"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Proposal title"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20"
        />
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Proposal description"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 min-h-[80px]"
        />
        <div className="flex items-center gap-3">
          <select
            value={form.proposal_type}
            onChange={e => setForm(f => ({ ...f, proposal_type: e.target.value as ProposalType }))}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20"
          >
            {['UpdateConfig','AddTradingPair','AddTradingVenue','PausePair','UpdateRiskManager','EmergencyStop','TransferAdmin'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={hasStake ? handleCreate : onRequireStake}
            disabled={creating}
            className={`px-4 py-2 rounded-lg text-sm transition-colors border ${hasStake ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
          >
            {creating ? 'Preparing...' : hasStake ? 'Create Proposal' : 'Stake to Create'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-xs p-3 bg-red-400/10 rounded-lg">{error}</div>
      )}

      <div className="space-y-3">
        {loading && proposals.length === 0 && (
          <div className="text-white/60 text-sm">Loading proposals...</div>
        )}
        {(!loading && proposals.length === 0) && (
          <div className="text-white/60 text-sm">No active proposals.</div>
        )}

        {proposals.map(p => (
          <div key={p.id} className="p-4 bg-black/30 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/90 font-medium">{p.title}</div>
                <div className="text-white/50 text-xs">{p.proposal_type} • ID #{p.id}</div>
              </div>
              <div className="text-white/50 text-xs">Ends at ledger {p.voting_ends_at}</div>
            </div>
            <p className="text-white/70 text-sm mt-2">{p.description}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-white/60">Yes: {p.yes_votes} • No: {p.no_votes}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote(p.id, true)}
                  className="px-3 py-1.5 rounded-md text-xs bg-green-500/15 text-green-300 border border-green-400/20 hover:bg-green-500/20"
                >Yes</button>
                <button
                  onClick={() => handleVote(p.id, false)}
                  className="px-3 py-1.5 rounded-md text-xs bg-red-500/15 text-red-300 border border-red-400/20 hover:bg-red-500/20"
                >No</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DaoProposals

