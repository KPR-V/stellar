'use client'
import React, { useState, useEffect } from 'react'
import { X, ThumbsUp, ThumbsDown, Clock, User, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'
import { useMessage } from '../../hooks/useMessage'

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

interface ProposalModalProps {
  proposal: Proposal | null
  isOpen: boolean
  onClose: () => void
  onProposalUpdate?: (updatedProposal: Proposal) => void
}

const ProposalModal: React.FC<ProposalModalProps> = ({
  proposal,
  isOpen,
  onClose,
  onProposalUpdate
}) => {
  const [isVoting, setIsVoting] = useState(false)
  const [voteMessage, setVoteMessage] = useState('')
  const { address, walletKit } = useWallet()
  const { showMessage } = useMessage()

  // Reset vote message when proposal changes or modal opens/closes
  useEffect(() => {
    if (!isOpen || !proposal) {
      setVoteMessage('')
      setIsVoting(false)
    }
  }, [isOpen, proposal?.id])

  if (!isOpen || !proposal) return null

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatAddress = (address: string) => {
    if (!address) return 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  const calculateVotePercentage = (yesVotes: string | number, noVotes: string | number, quorum: string | number) => {
    // Convert from stroops to vote units (30 stroops = 1 vote)
    const yes = Number(yesVotes) / 30000000 || 0
    const no = Number(noVotes) / 30000000 || 0
    const total = yes + no
    const quorumNum = Number(quorum) / 30000000 || 1

    if (total === 0) return { yesPercent: 0, noPercent: 0, quorumPercent: quorumNum }

    return {
      yesPercent: Math.round((yes / total) * 100),
      noPercent: Math.round((no / total) * 100),
      quorumPercent: quorumNum
    }
  }

  const { yesPercent, noPercent, quorumPercent } = calculateVotePercentage(
    proposal.yes_votes, 
    proposal.no_votes, 
    proposal.quorum_required
  )

  const handleVote = async (voteType: 'yes' | 'no') => {
    if (!address) {
      setVoteMessage('Please connect your wallet to vote.')
      return
    }

    if (!walletKit) {
      setVoteMessage('Wallet not properly initialized. Please reconnect.')
      return
    }

    setIsVoting(true)
    setVoteMessage('')

    try {
      const response = await fetch('/api/dao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'vote',
          voter: address,
          proposal_id: proposal.id,
          vote_yes: voteType === 'yes'
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.transactionXdr) {
        // Sign the transaction using wallet
        console.log('Signing vote transaction with wallet...')
        const signedXdr = await walletKit.signTransaction(result.data.transactionXdr, {
          address: address,
          networkPassphrase: 'Test SDF Network ; September 2015',
        })
        
        // Submit the signed transaction
        console.log('Submitting signed vote transaction...')
        const submitResponse = await fetch('/api/dao', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'submit',
            signedXdr: signedXdr
          }),
        })

        const submitResult = await submitResponse.json()

        if (submitResult.success) {
          const successMessage = `Success! Your ${voteType === 'yes' ? 'YES' : 'NO'} vote has been successfully recorded for "${proposal.title}".`
          setVoteMessage(successMessage)
          showMessage(successMessage)
          
          // Refresh proposal data after successful vote
          setTimeout(async () => {
            if (onProposalUpdate) {
              try {
                const updatedResponse = await fetch('/api/dao', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'get_proposal',
                    proposal_id: proposal.id
                  }),
                })

                const updatedResult = await updatedResponse.json()
                if (updatedResult.success && updatedResult.proposal) {
                  onProposalUpdate(updatedResult.proposal)
                }
              } catch (error) {
                console.error('Error refreshing proposal:', error)
              }
            }
          }, 2000)
        } else {
          setVoteMessage(`❌ Error submitting vote: ${submitResult.error || 'Transaction failed'}`)
        }
      } else {
        setVoteMessage(`❌ Error preparing vote: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error voting:', error)
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          setVoteMessage('❌ Vote cancelled by user.')
        } else {
          setVoteMessage(`❌ Error: ${error.message}`)
        }
      } else {
        setVoteMessage('❌ Error submitting vote. Please try again.')
      }
    } finally {
      setIsVoting(false)
    }
  }

  const renderProposedChanges = () => {
    if (!proposal.proposal_data) return null

    const renderConfigData = (configData: any) => {
      if (!configData || typeof configData !== 'object') return null
      
      return (
        <div className="space-y-3">
          {Object.entries(configData).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-2 px-3 bg-black/20 rounded-lg border border-white/5">
              <span className="text-gray-300 capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-white font-raleway text-sm">
                {typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)}
              </span>
            </div>
          ))}
        </div>
      )
    }

    const renderPairData = (pairData: any) => {
      if (!pairData || typeof pairData !== 'object') return null
      
      return (
        <div className="space-y-3">
          {Object.entries(pairData).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-2 px-3 bg-black/20 rounded-lg border border-white/5">
              <span className="text-gray-300 capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-white font-raleway text-sm break-all">
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )
    }

    const renderGenericData = (genericData: any) => {
      if (!genericData) return null
      
      return (
        <div className="bg-black/20 rounded-lg border border-white/5 p-3">
          <pre className="text-white font-raleway text-sm whitespace-pre-wrap break-words">
            {typeof genericData === 'object' ? JSON.stringify(genericData, null, 2) : String(genericData)}
          </pre>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        
        
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-normal text-white flex items-center gap-2 my-2">
          <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
          Proposed Changes
        </h3>
          {proposal.proposal_data.config_data && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-300 mb-3">Configuration Updates</h4>
              {renderConfigData(proposal.proposal_data.config_data)}
            </div>
          )}
          
          {proposal.proposal_data.pair_data && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-green-300 mb-3">Trading Pair Data</h4>
              {renderPairData(proposal.proposal_data.pair_data)}
            </div>
          )}
          
          {proposal.proposal_data.venue_data && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-300 mb-3">Venue Data</h4>
              {renderPairData(proposal.proposal_data.venue_data)}
            </div>
          )}
          
          {proposal.proposal_data.admin_address && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-orange-300 mb-3">Admin Transfer</h4>
              <div className="py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                <span className="text-gray-300">New Admin: </span>
                <span className="text-white font-raleway text-sm break-all">
                  {proposal.proposal_data.admin_address}
                </span>
              </div>
            </div>
          )}
          
          {proposal.proposal_data.symbol_data && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-yellow-300 mb-3">Symbol Data</h4>
              {renderPairData(proposal.proposal_data.symbol_data)}
            </div>
          )}
          
          {proposal.proposal_data.generic_data && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Additional Data</h4>
              {renderGenericData(proposal.proposal_data.generic_data)}
            </div>
          )}
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-400'
      case 'passed':
        return 'text-blue-400'
      case 'failed':
        return 'text-red-400'
      case 'executed':
        return 'text-purple-400'
      case 'cancelled':
        return 'text-gray-400'
      default:
        return 'text-gray-300'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto faq-scrollbar font-raleway">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-white mb-2">{proposal.title}</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className={`px-3 py-1 rounded-full font-normal ${getStatusColor(proposal.status)} bg-white/10`}>
                {proposal.status.toUpperCase()}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-normal">
                {proposal.proposal_type}
              </span>
              <span className="text-gray-400">
                 ID #{proposal.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-normal text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-6 bg-green-500 rounded-full"></div>
              Description
            </h3>
            <p className="text-gray-300 leading-relaxed">{proposal.description}</p>
          </div>

          {/* Proposed Changes */}
          {renderProposedChanges()}

          {/* Proposal Details Grid */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-normal text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
              Proposal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                  <User size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">Proposer:</span>
                  <span className="text-white font-raleway text-xs break-all">
                    {formatAddress(proposal.proposer)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                  <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">{formatTimestamp(proposal.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                  <Clock size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">Voting Ends:</span>
                  <span className="text-white">{formatTimestamp(proposal.voting_ends_at)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-gray-400">Target Contract:</span>
                  <span className="text-white font-raleway text-xs break-all">
                    {formatAddress(proposal.target_contract)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-gray-400">Quorum Required:</span>
                  <span className="text-white font-semibold">{quorumPercent.toFixed(0)} votes</span>
                </div>

                {proposal.executed_at && (
                  <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    <span className="text-gray-400">Executed:</span>
                    <span className="text-white">{formatTimestamp(proposal.executed_at)}</span>
                  </div>
                )}

                {proposal.cancelled_at && (
                  <div className="flex items-center gap-2 text-sm py-2 px-3 bg-black/20 rounded-lg border border-white/5">
                    <XCircle size={16} className="text-red-400 flex-shrink-0" />
                    <span className="text-gray-400">Cancelled:</span>
                    <span className="text-white">{formatTimestamp(proposal.cancelled_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voting Results */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
              Voting Results
            </h3>
            <div className="space-y-4">
              {/* Vote Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center py-3 px-4 bg-black/20 rounded-lg border border-white/5">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ThumbsUp size={18} className="text-green-400" />
                    <span className="text-gray-300 font-medium">Acceptance</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {(Number(proposal.yes_votes) / 990000000).toFixed(0)}
                  </div>
                  <div className="text-sm text-green-400 font-semibold">
                    {yesPercent}%
                  </div>
                </div>

                <div className="text-center py-3 px-4 bg-black/20 rounded-lg border border-white/5">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ThumbsDown size={18} className="text-red-400" />
                    <span className="text-gray-300 font-medium">Rejection</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {(Number(proposal.no_votes) / 990000000).toFixed(0)}
                  </div>
                  <div className="text-sm text-red-400 font-semibold">
                    {noPercent}%
                  </div>
                </div>

                <div className="text-center py-3 px-4 bg-black/20 rounded-lg border border-white/5">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock size={18} className="text-blue-400" />
                    <span className="text-gray-300 font-medium">Quorum</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {quorumPercent.toFixed(0)}
                  </div>
                  <div className="text-sm text-blue-400 font-semibold">
                    Votes Needed
                  </div>
                </div>
              </div>

              {/* Voting Buttons */}
              {proposal.status.toLowerCase() === 'active' && (
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => handleVote('yes')}
                    disabled={isVoting || !address}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 disabled:bg-gray-600/20 disabled:cursor-not-allowed text-green-300 border border-green-500/30 px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:border-green-400/50"
                  >
                    <ThumbsUp size={18} />
                    {isVoting ? 'Processing...' : 'Vote in Favour'}
                  </button>
                  <button
                    onClick={() => handleVote('no')}
                    disabled={isVoting || !address}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 disabled:bg-gray-600/20 disabled:cursor-not-allowed text-red-300 border border-red-500/30 px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:border-red-400/50"
                  >
                    <ThumbsDown size={18} />
                    {isVoting ? 'Processing...' : 'Vote Against'}
                  </button>
                </div>
              )}

              {!address && proposal.status.toLowerCase() === 'active' && (
                <div className="text-center py-3 px-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <span className="text-yellow-300">Connect your wallet to vote on this proposal</span>
                </div>
              )}

              {/* Vote Message */}
              {voteMessage && (
                <div className={`p-4 rounded-lg border ${
                  voteMessage.includes('Error') || voteMessage.includes('cancelled') 
                    ? 'bg-red-500/10 border-red-500/20 text-red-300' 
                    : 'bg-green-500/10 border-green-500/20 text-green-300'
                }`}>
                  {voteMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProposalModal
