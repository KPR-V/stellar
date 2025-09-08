'use client'
import { useState, useCallback } from 'react'

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

export const useProposals = () => {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openProposalModal = useCallback((proposal: Proposal) => {
    setSelectedProposal(proposal)
    setIsModalOpen(true)
  }, [])

  const closeProposalModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedProposal(null)
  }, [])

  const refreshProposal = useCallback((updatedProposal: Proposal) => {
    setSelectedProposal(updatedProposal)
  }, [])

  return {
    selectedProposal,
    isModalOpen,
    openProposalModal,
    closeProposalModal,
    refreshProposal
  }
}
