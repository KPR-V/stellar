'use client'

import React, { useState } from 'react'
import { useProposals, Proposal } from '../../hooks/useProposals'

interface ProposalsListProps {
  onVote?: (proposalId: number, voteYes: boolean) => Promise<void>
  onExecute?: (proposalId: number) => Promise<void>
  onCancel?: (proposalId: number) => Promise<void>
  userAddress?: string
  hasStake?: boolean
  voting?: number | null
  executing?: number | null
  cancelling?: number | null
}

const ProposalsList: React.FC<ProposalsListProps> = ({
  onVote,
  onExecute,
  onCancel,
  userAddress,
  hasStake = false,
  voting,
  executing,
  cancelling
}) => {
  const { activeProposals, allProposals, loading, error, refetch } = useProposals()
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active')

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  const formatStakeAmount = (amount: string): string => {
    try {
      const num = Number(amount) / 10000000
      return num.toFixed(2)
    } catch {
      return '0.00'
    }
  }

  const isVotingEnded = (votingEndsAt: number) => {
    return Date.now() / 1000 > votingEndsAt
  }

  const canExecute = (proposal: Proposal) => {
    return proposal.status === 'Passed' && Date.now() / 1000 >= proposal.execution_earliest
  }

  const canCancel = (proposal: Proposal) => {
    return proposal.status === 'Active' && proposal.proposer === userAddress
  }

  const currentProposals = viewMode === 'active' ? activeProposals : allProposals

  if (loading) {
    return (
      <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60"></div>
          <span className="ml-4 text-white/80 font-raleway">Loading proposals...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black/30 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
        <div className="text-center py-16">
          <div className="text-white/40 mb-6">
            <svg className="w-20 h-20 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white/90 mb-3 font-raleway">
            Cannot fetch proposals
          </h3>
          <button
            onClick={refetch}
            className="bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white/90 px-6 py-3 rounded-xl text-sm transition-all duration-300 font-raleway"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white/90 font-raleway">DAO Proposals</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode('active')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
              viewMode === 'active'
                ? 'bg-black/30 text-white border border-white/20'
                : 'bg-black/20 text-white/70 hover:text-white hover:bg-black/40 border border-white/10'
            } font-raleway`}
          >
            Active ({activeProposals.length})
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
              viewMode === 'all'
                ? 'bg-black/30 text-white border border-white/20'
                : 'bg-black/20 text-white/70 hover:text-white hover:bg-black/40 border border-white/10'
            } font-raleway`}
          >
            All ({allProposals.length})
          </button>
          <button
            onClick={refetch}
            className="bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-6 py-3 rounded-xl text-sm transition-all duration-300 font-raleway"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Proposals List */}
      {currentProposals.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-white/40 mb-6">
            <svg className="w-20 h-20 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white/90 mb-3 font-raleway">
            No {viewMode} proposals found
          </h3>
          <p className="text-white/60 text-sm font-raleway">
            {viewMode === 'active' 
              ? 'There are currently no active proposals to vote on.' 
              : 'No proposals have been created yet.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentProposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-black/30 backdrop-blur-lg border border-white/10 hover:border-white/20 rounded-2xl p-8 space-y-6 transition-all duration-300 shadow-xl"
            >
              {/* Proposal Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <h3 className="text-xl font-semibold text-white/90 font-raleway">
                      #{proposal.id}: {proposal.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
                      proposal.status === 'Active' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' :
                      proposal.status === 'Passed' ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' :
                      proposal.status === 'Failed' ? 'bg-red-600/20 text-red-400 border-red-500/30' :
                      proposal.status === 'Executed' ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' :
                      'bg-gray-600/20 text-gray-400 border-gray-500/30'
                    } font-raleway`}>
                      {proposal.status}
                    </span>
                    <span className="px-3 py-1 bg-white/10 text-white/70 border border-white/20 rounded-full text-xs font-medium backdrop-blur-sm font-raleway">
                      {proposal.proposal_type}
                    </span>
                  </div>
                  <p className="text-white/70 text-sm mb-4 font-raleway leading-relaxed">{proposal.description}</p>
                  <div className="text-xs text-white/50 space-y-2 font-raleway">
                    <p>Proposer: <span className="text-white/70">{proposal.proposer}</span></p>
                    <p>Created: <span className="text-white/70">{formatTimestamp(proposal.created_at)}</span></p>
                    <p>Voting ends: <span className="text-white/70">{formatTimestamp(proposal.voting_ends_at)}</span></p>
                    {proposal.status === 'Passed' && (
                      <p>Execution earliest: <span className="text-white/70">{formatTimestamp(proposal.execution_earliest)}</span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Voting Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-t border-white/10">
                <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-emerald-400 text-xl font-bold font-raleway">{formatStakeAmount(proposal.yes_votes)}</p>
                  <p className="text-xs text-white/60 font-raleway mt-1">YES Votes</p>
                </div>
                <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-red-400 text-xl font-bold font-raleway">{formatStakeAmount(proposal.no_votes)}</p>
                  <p className="text-xs text-white/60 font-raleway mt-1">NO Votes</p>
                </div>
                <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-blue-400 text-xl font-bold font-raleway">{formatStakeAmount(proposal.quorum_required)}</p>
                  <p className="text-xs text-white/60 font-raleway mt-1">Quorum Required</p>
                </div>
                <div className="text-center bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className={`text-xl font-bold font-raleway ${
                    Number(proposal.yes_votes) + Number(proposal.no_votes) >= Number(proposal.quorum_required)
                      ? 'text-emerald-400' : 'text-yellow-400'
                  }`}>
                    {((Number(proposal.yes_votes) + Number(proposal.no_votes)) / Number(proposal.quorum_required) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-white/60 font-raleway mt-1">Participation</p>
                </div>
              </div>

              {/* Actions */}
              {userAddress && (
                <div className="flex flex-wrap gap-3 pt-6 border-t border-white/10">
                  {/* Voting Buttons */}
                  {proposal.status === 'Active' && !isVotingEnded(proposal.voting_ends_at) && onVote && (
                    <>
                      <button
                        onClick={() => onVote(proposal.id, true)}
                        disabled={!hasStake || voting === proposal.id}
                        className="bg-black/20 hover:bg-black/40 disabled:bg-black/10 backdrop-blur-sm text-emerald-400 hover:text-emerald-300 disabled:text-white/30 border border-emerald-400/30 hover:border-emerald-400/50 disabled:border-white/10 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed font-raleway transform hover:scale-[1.02] disabled:hover:scale-100"
                      >
                        {voting === proposal.id ? 'Voting...' : 'Vote YES'}
                      </button>
                      <button
                        onClick={() => onVote(proposal.id, false)}
                        disabled={!hasStake || voting === proposal.id}
                        className="bg-black/20 hover:bg-black/40 disabled:bg-black/10 backdrop-blur-sm text-red-400 hover:text-red-300 disabled:text-white/30 border border-red-400/30 hover:border-red-400/50 disabled:border-white/10 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed font-raleway transform hover:scale-[1.02] disabled:hover:scale-100"
                      >
                        {voting === proposal.id ? 'Voting...' : 'Vote NO'}
                      </button>
                    </>
                  )}

                  {/* Execute Button */}
                  {canExecute(proposal) && onExecute && (
                    <button
                      onClick={() => onExecute(proposal.id)}
                      disabled={executing === proposal.id}
                      className="bg-black/20 hover:bg-black/40 disabled:bg-black/10 backdrop-blur-sm text-blue-400 hover:text-blue-300 disabled:text-white/30 border border-blue-400/30 hover:border-blue-400/50 disabled:border-white/10 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed font-raleway transform hover:scale-[1.02] disabled:hover:scale-100"
                    >
                      {executing === proposal.id ? 'Executing...' : 'Execute'}
                    </button>
                  )}

                  {/* Cancel Button */}
                  {canCancel(proposal) && onCancel && (
                    <button
                      onClick={() => onCancel(proposal.id)}
                      disabled={cancelling === proposal.id}
                      className="bg-black/20 hover:bg-black/40 disabled:bg-gray-600/50 backdrop-blur-sm border border-white/20 text-white/90 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed font-raleway transform hover:scale-[1.02] disabled:hover:scale-100"
                    >
                      {cancelling === proposal.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}

                  {/* Voting ended message */}
                  {proposal.status === 'Active' && isVotingEnded(proposal.voting_ends_at) && (
                    <span className="text-yellow-400/90 text-sm font-medium px-4 py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl backdrop-blur-sm font-raleway">
                      Voting period ended - awaiting finalization
                    </span>
                  )}

                  {/* Stake requirement message */}
                  {!hasStake && proposal.status === 'Active' && !isVotingEnded(proposal.voting_ends_at) && (
                    <span className="text-red-400/90 text-sm font-medium px-4 py-3 bg-red-400/10 border border-red-400/30 rounded-xl backdrop-blur-sm font-raleway">
                      Stake KALE tokens to vote
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProposalsList
