'use client'

import React, { useState, useEffect } from 'react'

interface Proposal {
  id: number
  proposer: string
  proposal_type: string
  title: string
  description: string
  target_contract: string
  created_at: number
  voting_ends_at: number
  execution_earliest: number
  yes_votes: string | number
  no_votes: string | number
  status: string
  quorum_required: string | number
  executed_at?: number | null
  cancelled_at?: number | null
  proposal_data?: any 
}

interface ProposalsListProps {
  refreshKey: number
  onVote?: (proposalId: number, voteYes: boolean) => void
  onExecute?: (proposalId: number) => void
  onCancel?: (proposalId: number) => void
  onViewProposal?: (proposal: Proposal) => void
}

const ProposalsList: React.FC<ProposalsListProps> = ({ 
  refreshKey, 
  onVote, 
  onExecute, 
  onCancel,
  onViewProposal 
}) => {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const fetchProposals = async () => {
    setLoading(true)
    setError(null)

    try {
      const action = showActiveOnly ? 'get_active_proposals' : 'get_all_proposals'
      
      const response = await fetch('/api/dao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const result = await response.json()
      if (result.success) {
        const proposalsWithDefaults = (result.data.proposals || []).map((proposal: any, index: number) => ({
          id: proposal.id ?? index,
          proposer: proposal.proposer ?? '',
          proposal_type: proposal.proposal_type ?? 'Unknown',
          title: proposal.title ?? 'Untitled Proposal',
          description: proposal.description ?? 'No description provided',
          target_contract: proposal.target_contract ?? '',
          created_at: proposal.created_at ?? 0,
          voting_ends_at: proposal.voting_ends_at ?? 0,
          execution_earliest: proposal.execution_earliest ?? 0,
          yes_votes: proposal.yes_votes ?? '0',
          no_votes: proposal.no_votes ?? '0',
          status: proposal.status ?? 'Active',
          quorum_required: proposal.quorum_required ?? '0',
          executed_at: proposal.executed_at ?? null,
          cancelled_at: proposal.cancelled_at ?? null,
          proposal_data: proposal.proposal_data ?? null,
        }))
        setProposals(proposalsWithDefaults)
      } else {
        setError(result.error || 'Failed to fetch proposals')
      }
    } catch (err) {
      console.error('Error fetching proposals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [refreshKey, showActiveOnly])

  const getProposalTypeDisplay = (type: string) => {
    switch (type) {
      case 'UpdateConfig':
        return 'Update Configuration'
      case 'AddTradingPair':
        return 'Add Trading Pair'
      case 'AddTradingVenue':
        return 'Add Trading Venue'
      case 'PausePair':
        return 'Pause Trading Pair'
      case 'UpdateRiskManager':
        return 'Update Risk Manager'
      case 'EmergencyStop':
        return 'Emergency Stop'
      case 'TransferAdmin':
        return 'Transfer Admin'
      default:
        return type
    }
  }

  const formatDate = (timestamp: number | undefined | null) => {
    if (!timestamp || timestamp === 0) return 'N/A'
    try {
      return new Date(timestamp * 1000).toLocaleDateString()
    } catch (error) {
      return 'Invalid Date'
    }
  }

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold font-raleway">
            {showActiveOnly ? 'Active Proposals' : 'All Proposals'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-black/20 rounded-lg p-1">
              <button
                onClick={() => setShowActiveOnly(true)}
                className={`px-3 py-1 text-sm font-raleway rounded transition-all duration-300 ${
                  showActiveOnly
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setShowActiveOnly(false)}
                className={`px-3 py-1 text-sm font-raleway rounded transition-all duration-300 ${
                  !showActiveOnly
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white/60 font-raleway">Loading proposals...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold font-raleway">
            {showActiveOnly ? 'Active Proposals' : 'All Proposals'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-black/20 rounded-lg p-1">
              <button
                onClick={() => setShowActiveOnly(true)}
                className={`px-3 py-1 text-sm font-raleway rounded transition-all duration-300 ${
                  showActiveOnly
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setShowActiveOnly(false)}
                className={`px-3 py-1 text-sm font-raleway rounded transition-all duration-300 ${
                  !showActiveOnly
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                All
              </button>
            </div>
            <button
              onClick={fetchProposals}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm font-raleway transition-all duration-300"
            >
              Retry
            </button>
          </div>
        </div>
        <div className="text-center py-12">
          <button
            onClick={fetchProposals}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-raleway transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-xl font-semibold font-raleway">
          {showActiveOnly ? 'Active Proposals' : 'All Proposals'} ({proposals.length})
        </h2>
        <div className="flex items-center gap-4 ">
          <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/25">
            <button
              onClick={() => setShowActiveOnly(true)}
              className={`px-3 py-1 text-sm font-raleway rounded transition-all duration-300 ${
                showActiveOnly
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowActiveOnly(false)}
              className={`px-3 py-1 text-sm font-raleway rounded transition-all duration-300 ${
                !showActiveOnly
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              All
            </button>
          </div>
          <button
            onClick={fetchProposals}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm font-raleway transition-all duration-300"
          >
             Refresh
          </button>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-white/60 mb-4 font-raleway">
            {showActiveOnly ? 'No active proposals found' : 'No proposals found'}
          </div>
          <div className="text-white/40 text-sm font-raleway">
            {showActiveOnly 
              ? 'Switch to "All" to see completed proposals' 
              : 'Create the first proposal to get started'
            }
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300 group"
            >
              <div className="mb-4">
                <h3 className="text-white font-semibold font-raleway text-lg mb-2 group-hover:text-white/90 line-clamp-1">
                  {proposal.title || 'Untitled Proposal'}
                </h3>
                <p className="text-white/70 text-sm font-raleway leading-relaxed mb-3 line-clamp-1">
                  {proposal.description || 'No description provided'}
                </p>
                <span className="text-xs font-raleway text-white/70 bg-white/5 px-3 py-1 rounded-lg">
                  {getProposalTypeDisplay(proposal.proposal_type || 'Unknown')}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-xs text-white/50 font-raleway">
                  Created: {formatDate(proposal.created_at || 0)}
                </div>
                <div className="text-xs text-white/50 font-raleway">
                  Voting ends: {formatDate(proposal.voting_ends_at || 0)}
                </div>
                <div className="flex justify-between text-xs font-raleway">
                  <span className="text-green-400">Yes: {Math.floor(Number(proposal.yes_votes || '0') / 900000000)}</span>
                  <span className="text-red-400">No: {Math.floor(Number(proposal.no_votes || '0') / 900000000)}</span>
                </div>
              </div>

              <button
                onClick={() => onViewProposal?.(proposal)}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 px-4 py-3 rounded-lg text-sm font-raleway transition-all duration-300"
              >
                View Proposal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProposalsList
