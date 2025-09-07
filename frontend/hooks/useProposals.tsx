'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from './useWallet'

export interface Proposal {
  id: number
  proposer: string
  proposal_type: string
  title: string
  description: string
  target_contract: string
  created_at: number
  voting_ends_at: number
  execution_earliest: number
  yes_votes: string
  no_votes: string
  status: string
  quorum_required: string
  executed_at: number | null
  cancelled_at: number | null
}

export interface UseProposalsReturn {
  activeProposals: Proposal[]
  allProposals: Proposal[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useProposals = (): UseProposalsReturn => {
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([])
  const [allProposals, setAllProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching proposals from API...')
      
      // Fetch both active and all proposals in parallel
      const [activeRes, allRes] = await Promise.all([
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_active_proposals' })
        }),
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_all_proposals' })
        })
      ])
      
      const [activeData, allData] = await Promise.all([
        activeRes.json(),
        allRes.json()
      ])
      
      console.log('📋 Active proposals response:', activeData)
      console.log('📋 All proposals response:', allData)
      
      // Handle active proposals
      if (activeData.success && activeData.proposals) {
        console.log('✅ Setting active proposals:', activeData.proposals.length)
        setActiveProposals(activeData.proposals)
      } else {
        console.log('⚠️ No active proposals or error:', activeData.error)
        setActiveProposals([])
      }
      
      // Handle all proposals
      if (allData.success && allData.proposals) {
        console.log('✅ Setting all proposals:', allData.proposals.length)
        setAllProposals(allData.proposals)
      } else {
        console.log('⚠️ No all proposals or error:', allData.error)
        setAllProposals([])
      }
      
    } catch (e) {
      console.error('❌ Fetch proposals error:', e)
      setError(e instanceof Error ? e.message : 'Network error while loading proposals')
      setActiveProposals([])
      setAllProposals([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchProposals()
  }, [fetchProposals])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  return {
    activeProposals,
    allProposals,
    loading,
    error,
    refetch
  }
}
