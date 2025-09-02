'use client'
import React, { useEffect, useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit'
import type { 
  Proposal, 
  ProposalType, 
  ProposalStatus, 
  StakeInfo, 
  DAOConfig,
  Vote 
} from '../../daobindings/src'

interface Props {
  onRequireStake: () => void
}

const DaoProposals: React.FC<Props> = ({ onRequireStake }) => {
  const { address, walletKit } = useWallet()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [allProposals, setAllProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [voting, setVoting] = useState<number | null>(null)
  const [finalizing, setFinalizing] = useState<number | null>(null)
  const [executing, setExecuting] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [hasStake, setHasStake] = useState<boolean>(false)
  const [stakeAmount, setStakeAmount] = useState<string>('0')
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null)
  const [totalStaked, setTotalStaked] = useState<string>('0')
  const [daoConfig, setDaoConfig] = useState<DAOConfig | null>(null)
  const [admin, setAdmin] = useState<string>('')
  const [stakeValidation, setStakeValidation] = useState<string>('')
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active')
  const [userVotes, setUserVotes] = useState<Map<number, Vote | null>>(new Map())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    proposal_type: 'UpdateConfig' as string,
    // DAO Config fields for UpdateConfig proposals
    dao_config_data: {
      min_stake_to_propose: '',
      voting_duration_ledgers: '',
      quorum_percentage: '',
      execution_delay: '',
      proposal_threshold_bps: '',
    },
    // Trading pair fields
    trading_pair_data: {
      stablecoin_symbol: '',
      stablecoin_address: '',
      target_peg: '',
    },
    // Venue fields
    venue_data: {
      name: '',
      address: '',
      fee_bps: '',
      liquidity_threshold: '',
    },
    admin_address: '',
    symbol_data: '',
  })

  // Helper functions for type handling
  const getProposalTypeTag = (proposalType: ProposalType): string => {
    return proposalType.tag
  }

  const getProposalStatusTag = (status: ProposalStatus): string => {
    return status.tag
  }

  const createProposalType = (typeString: string): ProposalType => {
    const validTypes: Record<string, ProposalType> = {
      'UpdateConfig': { tag: 'UpdateConfig', values: undefined as void },
      'AddTradingPair': { tag: 'AddTradingPair', values: undefined as void },
      'AddTradingVenue': { tag: 'AddTradingVenue', values: undefined as void },
      'PausePair': { tag: 'PausePair', values: undefined as void },
      'UpdateRiskManager': { tag: 'UpdateRiskManager', values: undefined as void },
      'EmergencyStop': { tag: 'EmergencyStop', values: undefined as void },
      'TransferAdmin': { tag: 'TransferAdmin', values: undefined as void },
    }
    return validTypes[typeString] || validTypes['UpdateConfig']
  }

  const formatBigInt = (value: bigint | string | number): string => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return String(value)
  }

  const formatTimestamp = (timestamp: bigint | number): string => {
    const timestampNumber = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
    return new Date(timestampNumber * 1000).toLocaleDateString()
  }

  const formatStakeAmount = (amount: bigint | string): string => {
    try {
      const amountStr = typeof amount === 'bigint' ? amount.toString() : String(amount)
      const num = Number(amountStr) / 10000000
      return num.toFixed(2)
    } catch {
      return '0.00'
    }
  }

  // Convert BigInt ID to number for state management
  const toNumberId = (id: bigint | number): number => {
    return typeof id === 'bigint' ? Number(id) : id
  }

  const fetchProposals = async () => {
    setLoading(true)
    setError(null)
    try {
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
      
      const [activeData, allData] = await Promise.all([activeRes.json(), allRes.json()])
      
      if (activeData.success) {
        setProposals(activeData.data.proposals as Proposal[])
      }
      if (allData.success) {
        setAllProposals(allData.data.proposals as Proposal[])
      }
    } catch (e) {
      console.error('Fetch proposals error:', e)
      setError('Network error while loading proposals')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdditionalData = async () => {
    try {
      const [totalRes, configRes, adminRes] = await Promise.all([
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_total_staked' })
        }),
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_dao_config' })
        }),
        fetch('/api/dao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_admin' })
        })
      ])
      
      const [totalData, configData, adminData] = await Promise.all([
        totalRes.json(), configRes.json(), adminRes.json()
      ])
      
      if (totalData.success) {
        setTotalStaked(totalData.data.totalStaked)
      }
      if (configData.success) {
        setDaoConfig(configData.data.config)
      }
      if (adminData.success) {
        setAdmin(adminData.data.admin)
      }
    } catch (e) {
      console.error('Failed to fetch additional data:', e)
    }
  }

  useEffect(() => {
    fetchProposals()
    fetchAdditionalData()
  }, [])

  // Enhanced stake checking with full stake info
  useEffect(() => {
    const checkStake = async () => {
      if (!address) {
        setHasStake(false)
        setStakeAmount('0')
        setStakeInfo(null)
        setStakeValidation('')
        return
      }
      try {
        const [stakeRes, stakeInfoRes] = await Promise.all([
          fetch('/api/dao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_stake', user: address })
          }),
          fetch('/api/dao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_stake_info', user: address })
          })
        ])
        
        const [stakeData, stakeInfoData] = await Promise.all([stakeRes.json(), stakeInfoRes.json()])
        
        if (stakeData.success) {
          const amt = stakeData.data.amount || '0'
          setStakeAmount(amt)
          setHasStake(BigInt(amt) > 0n)
        }
        
        if (stakeInfoData.success) {
          setStakeInfo(stakeInfoData.data.stakeInfo)
        }
        
        // Validate against DAO requirements
        if (daoConfig?.min_stake_to_propose) {
          const minRequired = BigInt(daoConfig.min_stake_to_propose)
          const current = BigInt(stakeAmount || '0')
          
          if (current < minRequired) {
            const requiredFormatted = (Number(minRequired) / 10000000).toFixed(2)
            const currentFormatted = (Number(current) / 10000000).toFixed(2)
            setStakeValidation(`❌ Need ${requiredFormatted} KALE to create proposals (you have ${currentFormatted})`)
          } else {
            setStakeValidation(`✅ Sufficient stake for proposals (${(Number(current) / 10000000).toFixed(2)} KALE)`)
          }
        }
      } catch (e) {
        console.error('Check stake error:', e)
        setHasStake(false)
        setStakeAmount('0')
        setStakeInfo(null)
      }
    }
    
    checkStake()
    const interval = setInterval(checkStake, 30000)
    
    return () => clearInterval(interval)
  }, [address, daoConfig, stakeAmount])

  // Fetch user votes for displayed proposals
  useEffect(() => {
    const fetchUserVotes = async () => {
      if (!address) return
      
      const currentProposals = viewMode === 'active' ? proposals : allProposals
      const votePromises = currentProposals.map(async (proposal) => {
        try {
          const res = await fetch('/api/dao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'get_user_vote', 
              user: address, 
              proposal_id: proposal.id 
            })
          })
          const data = await res.json()
          if (data.success && data.data.vote) {
            return { proposalId: proposal.id, vote: data.data.vote }
          }
        } catch (e) {
          console.error(`Failed to fetch vote for proposal ${proposal.id}:`, e)
        }
        return null
      })
      
      const votes = await Promise.all(votePromises)
      const voteMap = new Map()
      votes.forEach(voteData => {
        if (voteData) {
          voteMap.set(voteData.proposalId, voteData.vote)
        }
      })
      setUserVotes(voteMap)
    }
    
    fetchUserVotes()
  }, [address, proposals, allProposals, viewMode])

  const handleVote = async (proposalId: number, voteYes: boolean) => {
    if (!address || !hasStake) return onRequireStake()
    if (!walletKit) return
    
    setVoting(proposalId)
    setError(null)
    
    try {
      console.log(`Voting ${voteYes ? 'YES' : 'NO'} on proposal ${proposalId}`)
      
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
      if (!data.success) {
        setError(data.error || 'Failed to prepare vote')
        return
      }

      const signResult = await walletKit.signTransaction(data.data.transactionXdr, {
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      const submitRes = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit', 
          signedXdr: signResult.signedTxXdr 
        })
      })
      
      const submitData = await submitRes.json()
      if (!submitData.success) {
        setError(submitData.error || 'Failed to submit vote')
        return
      }
      
      await fetchProposals()
      
    } catch (e) {
      console.error('Vote error:', e)
      setError(e instanceof Error ? e.message : 'Network error while voting')
    } finally {
      setVoting(null)
    }
  }

  const handleFinalize = async (proposalId: number) => {
    if (!walletKit) return
    
    setFinalizing(proposalId)
    setError(null)
    
    try {
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize_proposal',
          proposal_id: proposalId,
        })
      })
      
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to prepare finalize')
        return
      }

      const signResult = await walletKit.signTransaction(data.data.transactionXdr, {
        // @ts-ignore
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      const submitRes = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit', 
          signedXdr: signResult.signedTxXdr 
        })
      })
      
      const submitData = await submitRes.json()
      if (!submitData.success) {
        setError(submitData.error || 'Failed to submit finalize')
        return
      }
      
      await fetchProposals()
      
    } catch (e) {
      console.error('Finalize error:', e)
      setError(e instanceof Error ? e.message : 'Network error while finalizing')
    } finally {
      setFinalizing(null)
    }
  }

  const handleExecute = async (proposalId: number) => {
    if (!address || !walletKit) return
    
    setExecuting(proposalId)
    setError(null)
    
    try {
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_proposal',
          executor: address,
          proposal_id: proposalId,
        })
      })
      
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to prepare execution')
        return
      }

      const signResult = await walletKit.signTransaction(data.data.transactionXdr, {
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      const submitRes = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit', 
          signedXdr: signResult.signedTxXdr 
        })
      })
      
      const submitData = await submitRes.json()
      if (!submitData.success) {
        setError(submitData.error || 'Failed to submit execution')
        return
      }
      
      await fetchProposals()
      
    } catch (e) {
      console.error('Execute error:', e)
      setError(e instanceof Error ? e.message : 'Network error while executing')
    } finally {
      setExecuting(null)
    }
  }

  const handleCancel = async (proposalId: number) => {
    if (!address || !walletKit) return
    
    setCancelling(proposalId)
    setError(null)
    
    try {
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_proposal',
          proposer: address,
          proposal_id: proposalId,
        })
      })
      
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to prepare cancellation')
        return
      }

      const signResult = await walletKit.signTransaction(data.data.transactionXdr, {
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      const submitRes = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit', 
          signedXdr: signResult.signedTxXdr 
        })
      })
      
      const submitData = await submitRes.json()
      if (!submitData.success) {
        setError(submitData.error || 'Failed to submit cancellation')
        return
      }
      
      await fetchProposals()
      
    } catch (e) {
      console.error('Cancel error:', e)
      setError(e instanceof Error ? e.message : 'Network error while cancelling')
    } finally {
      setCancelling(null)
    }
  }

  const handleCreate = async () => {
    if (!address || !hasStake) return onRequireStake()
    
    if (daoConfig?.min_stake_to_propose) {
      const minStakeRequired = BigInt(daoConfig.min_stake_to_propose)
      const currentStake = BigInt(stakeAmount || '0')
      
      if (currentStake < minStakeRequired) {
        const requiredFormatted = (Number(minStakeRequired) / 10000000).toFixed(2)
        const currentFormatted = (Number(currentStake) / 10000000).toFixed(2)
        setError(`Insufficient stake. Required: ${requiredFormatted} KALE, Current: ${currentFormatted} KALE`)
        return
      }
    }
    
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!walletKit) return
    
    // Prepare proposal data based on type with proper validation
    let proposalData: any = {}
    
    switch (form.proposal_type) {
      case 'AddTradingPair':
        if (!form.trading_pair_data.stablecoin_symbol || !form.trading_pair_data.stablecoin_address) {
          setError('Stablecoin symbol and address are required for trading pair proposals')
          return
        }
        
        proposalData = {
          pair_data: {
            base: {
              stablecoin_symbol: form.trading_pair_data.stablecoin_symbol,
              stablecoin_address: form.trading_pair_data.stablecoin_address,
              target_peg: form.trading_pair_data.target_peg ? 
                String(Number(form.trading_pair_data.target_peg) * 1000000) :
                "1000000",
              fiat_symbol: 'USD',
              deviation_threshold_bps: 100,
            },
            enabled: true,
            fee_config: {
              trading_fee_bps: 10,
              keeper_fee_bps: 5,
              gas_fee_bps: 3,
              bridge_fee_bps: 2,
            },
            risk_config: {
              max_position_size: String(1000000 * 1000000),
              max_daily_volume: String(10000000 * 1000000),
              volatility_threshold_bps: 500,
              correlation_limit: String(800000),
            },
            price_sources: {
              min_sources_required: 1,
              fallback_enabled: true,
              fiat_sources: [],
              stablecoin_sources: [],
            },
            twap_config: {
              enabled: false,
              periods: 5,
              min_deviation_bps: 50,
            }
          }
        }
        break
        
      case 'AddTradingVenue':
        if (!form.venue_data.name || !form.venue_data.address) {
          setError('Venue name and address are required for venue proposals')
          return
        }
        
        proposalData = {
          venue_data: {
            name: form.venue_data.name,
            address: form.venue_data.address,
            fee_bps: form.venue_data.fee_bps ? Number(form.venue_data.fee_bps) : 30,
            liquidity_threshold: form.venue_data.liquidity_threshold ? 
              String(Number(form.venue_data.liquidity_threshold) * 1000000) :
              String(1000000 * 1000000),
            enabled: true,
          }
        }
        break
        
      case 'TransferAdmin':
        if (!form.admin_address) {
          setError('New admin address is required for admin transfer proposals')
          return
        }
        
        if (form.admin_address.length !== 56 || !form.admin_address.match(/^G[A-Z0-9]{55}$/)) {
          setError('Please enter a valid Stellar address (56 characters starting with G)')
          return
        }
        
        proposalData = {
          admin_address: form.admin_address
        }
        break
        
      case 'PausePair':
        if (!form.symbol_data) {
          setError('Stablecoin symbol is required for pause pair proposals')
          return
        }
        
        proposalData = {
          symbol_data: form.symbol_data
        }
        break
        
      case 'UpdateConfig':
        // ✅ FIXED: For DAO config updates, create proper DAOConfig structure
        if (!daoConfig) {
          setError('DAO config not loaded')
          return
        }
        
        proposalData = {
          config_data: {
            min_stake_to_propose: form.dao_config_data.min_stake_to_propose ? 
              String(Number(form.dao_config_data.min_stake_to_propose) * 10000000) :
              String(daoConfig.min_stake_to_propose),
            voting_duration_ledgers: form.dao_config_data.voting_duration_ledgers ? 
              Number(form.dao_config_data.voting_duration_ledgers) :
              Number(daoConfig.voting_duration_ledgers),
            quorum_percentage: form.dao_config_data.quorum_percentage ? 
              Number(form.dao_config_data.quorum_percentage) :
              Number(daoConfig.quorum_percentage),
            execution_delay: form.dao_config_data.execution_delay ? 
              Number(form.dao_config_data.execution_delay) :
              Number(daoConfig.execution_delay),
            proposal_threshold_bps: form.dao_config_data.proposal_threshold_bps ? 
              Number(form.dao_config_data.proposal_threshold_bps) :
              Number(daoConfig.proposal_threshold_bps || 0),
          }
        }
        break
        
      case 'UpdateRiskManager':
      case 'EmergencyStop':
        proposalData = {}
        break
        
      default:
        proposalData = {}
    }
    
    setCreating(true)
    setError(null)
    
    try {
      console.log('Creating proposal:', form.title, 'Type:', form.proposal_type, 'Data:', proposalData)
      
      const res = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_proposal',
          proposer: address,
          title: form.title,
          description: form.description,
          proposal_type: form.proposal_type,
          proposal_data: proposalData,
        })
      })
      
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to prepare proposal')
        return
      }

      const signResult = await walletKit.signTransaction(data.data.transactionXdr, {
        address,
        networkPassphrase: WalletNetwork.TESTNET,
      })

      const submitRes = await fetch('/api/dao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submit', 
          signedXdr: signResult.signedTxXdr 
        })
      })
      
      const submitData = await submitRes.json()
      if (!submitData.success) {
        setError(submitData.error || 'Failed to submit proposal')
        return
      }
      
      // Reset form
      setForm({ 
        title: '', 
        description: '', 
        proposal_type: 'UpdateConfig',
        dao_config_data: {
          min_stake_to_propose: '',
          voting_duration_ledgers: '',
          quorum_percentage: '',
          execution_delay: '',
          proposal_threshold_bps: '',
        },
        trading_pair_data: {
          stablecoin_symbol: '',
          stablecoin_address: '',
          target_peg: '',
        },
        venue_data: {
          name: '',
          address: '',
          fee_bps: '',
          liquidity_threshold: '',
        },
        admin_address: '',
        symbol_data: '',
      })
      setShowCreateForm(false)
      await fetchProposals()
      
    } catch (e) {
      console.error('Create proposal error:', e)
      setError(e instanceof Error ? e.message : 'Network error while creating proposal')
    } finally {
      setCreating(false)
    }
  }

  const isVotingEnded = (votingEndsAt: bigint | number) => {
    const timestamp = typeof votingEndsAt === 'bigint' ? Number(votingEndsAt) : votingEndsAt
    return Date.now() / 1000 > timestamp
  }

  const canExecute = (proposal: Proposal) => {
    const statusTag = getProposalStatusTag(proposal.status)
    const execTime = typeof proposal.execution_earliest === 'bigint' 
      ? Number(proposal.execution_earliest) 
      : proposal.execution_earliest
    return statusTag === 'Passed' && Date.now() / 1000 >= execTime
  }

  const currentProposals = viewMode === 'active' ? proposals : allProposals

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white/90 text-lg font-medium">Governance Proposals</h3>
        <div className="flex items-center gap-3">
          {address && (
            <div className="text-xs text-white/60">
              Stake: {formatStakeAmount(stakeAmount)} KALE
            </div>
          )}
          <div className="text-xs text-white/60">
            Total: {formatStakeAmount(totalStaked)} KALE
          </div>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('active')}
              className={`px-3 py-1 text-xs ${
                viewMode === 'active' 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 text-xs ${
                viewMode === 'all' 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              All
            </button>
          </div>
          <button
            onClick={fetchProposals}
            className="text-xs text-white/70 hover:text-white/90"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stake validation display */}
      {stakeValidation && (
        <div className={`text-xs p-2 rounded-lg ${
          stakeValidation.includes('✅') 
            ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' 
            : 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
        }`}>
          {stakeValidation}
        </div>
      )}

      {/* Enhanced DAO Info */}
      {daoConfig && (
        <div className="text-xs text-white/50 p-2 bg-white/5 rounded-lg space-y-1">
          <div>Min Stake to Propose: {(Number(daoConfig.min_stake_to_propose || 0) / 10000000).toFixed(2)} KALE</div>
          <div>Voting Duration: {daoConfig.voting_duration_ledgers || 0} ledgers • Quorum: {daoConfig.quorum_percentage || 0}%</div>
          <div>Execution Delay: {daoConfig.execution_delay || 0}s • Admin: {admin ? `${admin.slice(0, 8)}...` : 'N/A'}</div>
        </div>
      )}

      <div className="space-y-4">
        {/* Create Proposal Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!address || creating}
            className={`px-4 py-2 rounded-lg text-sm transition-colors border ${
              address && !creating
                ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white' 
                : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            {showCreateForm ? 'Hide Form' : 'Create New Proposal'}
          </button>
          {!address && (
            <span className="text-white/60 text-xs">Connect wallet to create proposals</span>
          )}
        </div>

        {/* Enhanced Proposal Creation Form */}
        {showCreateForm && (
          <div className="p-4 bg-black/30 border border-white/10 rounded-lg space-y-4">
            <h4 className="text-white/90 text-lg font-medium">Create New Proposal</h4>
            
            {/* Basic Fields */}
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Proposal title"
                disabled={creating}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
              />
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Proposal description"
                disabled={creating}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 min-h-[80px] disabled:opacity-50"
              />
              <select
                value={form.proposal_type}
                onChange={e => setForm(f => ({ ...f, proposal_type: e.target.value }))}
                disabled={creating}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
              >
                <option value="UpdateConfig">Update DAO Config</option>
                <option value="AddTradingPair">Add Trading Pair</option>
                <option value="AddTradingVenue">Add Trading Venue</option>
                <option value="PausePair">Pause Pair</option>
                <option value="UpdateRiskManager">Update Risk Manager</option>
                <option value="EmergencyStop">Emergency Stop</option>
                <option value="TransferAdmin">Transfer Admin</option>
              </select>
            </div>

            {/* Conditional Fields Based on Proposal Type */}
            {form.proposal_type === 'UpdateConfig' && (
              <div className="space-y-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h5 className="text-blue-300 text-sm font-medium">⚙️ DAO Configuration Update</h5>
                <div className="text-xs text-blue-200/80 mb-2">
                  Update the DAO's governance parameters. Leave fields empty to keep current values.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Min Stake to Propose (KALE)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.dao_config_data.min_stake_to_propose}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        dao_config_data: { ...f.dao_config_data, min_stake_to_propose: e.target.value }
                      }))}
                      placeholder={`Current: ${formatStakeAmount(daoConfig?.min_stake_to_propose || '0')} KALE`}
                      disabled={creating}
                      className="w-full bg-black/30 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Voting Duration (ledgers)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.dao_config_data.voting_duration_ledgers}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        dao_config_data: { ...f.dao_config_data, voting_duration_ledgers: e.target.value }
                      }))}
                      placeholder={`Current: ${daoConfig?.voting_duration_ledgers || 0}`}
                      disabled={creating}
                      className="w-full bg-black/30 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Quorum Percentage (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={form.dao_config_data.quorum_percentage}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        dao_config_data: { ...f.dao_config_data, quorum_percentage: e.target.value }
                      }))}
                      placeholder={`Current: ${daoConfig?.quorum_percentage || 0}%`}
                      disabled={creating}
                      className="w-full bg-black/30 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Execution Delay (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.dao_config_data.execution_delay}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        dao_config_data: { ...f.dao_config_data, execution_delay: e.target.value }
                      }))}
                      placeholder={`Current: ${daoConfig?.execution_delay || 0}s`}
                      disabled={creating}
                      className="w-full bg-black/30 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Proposal Threshold (basis points)</label>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={form.dao_config_data.proposal_threshold_bps}
                      onChange={e => setForm(f => ({ 
                        ...f, 
                        dao_config_data: { ...f.dao_config_data, proposal_threshold_bps: e.target.value }
                      }))}
                      placeholder={`Current: ${daoConfig?.proposal_threshold_bps || 0} bps`}
                      disabled={creating}
                      className="w-full bg-black/30 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>
                
                <div className="text-xs text-white/60 space-y-1 pt-2 border-t border-blue-500/20">
                  <div className="font-medium">⚠️ Note:</div>
                  <div>This updates DAO governance parameters like minimum stake, voting duration, etc.</div>
                  <div>To change the minimum stake requirement, enter the new amount in KALE.</div>
                </div>
              </div>
            )}

            {form.proposal_type === 'AddTradingPair' && (
              <div className="space-y-3 p-3 bg-white/5 rounded-lg">
                <h5 className="text-white/80 text-sm font-medium">Trading Pair Details</h5>
                <div className="text-xs text-white/60 mb-2">
                  Add a new stablecoin trading pair to the arbitrage system
                </div>
                <input
                  value={form.trading_pair_data.stablecoin_symbol}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    trading_pair_data: { ...f.trading_pair_data, stablecoin_symbol: e.target.value }
                  }))}
                  placeholder="Stablecoin Symbol (e.g., USDC)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
                <input
                  value={form.trading_pair_data.stablecoin_address}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    trading_pair_data: { ...f.trading_pair_data, stablecoin_address: e.target.value }
                  }))}
                  placeholder="Stablecoin Contract Address (56 chars, starts with C)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
                <input
                  type="number"
                  step="0.000001"
                  value={form.trading_pair_data.target_peg}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    trading_pair_data: { ...f.trading_pair_data, target_peg: e.target.value }
                  }))}
                  placeholder="Target Peg (e.g., 1.0 for $1.00, leave empty for default)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
              </div>
            )}

            {form.proposal_type === 'AddTradingVenue' && (
              <div className="space-y-3 p-3 bg-white/5 rounded-lg">
                <h5 className="text-white/80 text-sm font-medium">Trading Venue Details</h5>
                <div className="text-xs text-white/60 mb-2">
                  Add a new DEX or trading venue for arbitrage opportunities
                </div>
                <input
                  value={form.venue_data.name}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    venue_data: { ...f.venue_data, name: e.target.value }
                  }))}
                  placeholder="Venue Name (e.g., StellarX, AquaDEX)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
                <input
                  value={form.venue_data.address}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    venue_data: { ...f.venue_data, address: e.target.value }
                  }))}
                  placeholder="Venue Contract Address"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={form.venue_data.fee_bps}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    venue_data: { ...f.venue_data, fee_bps: e.target.value }
                  }))}
                  placeholder="Fee in basis points (e.g., 30 = 0.3%)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
                <input
                  type="number"
                  min="0"
                  value={form.venue_data.liquidity_threshold}
                  onChange={e => setForm(f => ({ 
                    ...f, 
                    venue_data: { ...f.venue_data, liquidity_threshold: e.target.value }
                  }))}
                  placeholder="Min Liquidity Threshold (in tokens, e.g., 1000000)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />
              </div>
            )}

            {form.proposal_type === 'TransferAdmin' && (
              <div className="space-y-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <h5 className="text-orange-300 text-sm font-medium">⚠️ Admin Transfer Details</h5>
                <div className="text-xs text-orange-200/80 mb-2">
                  Transfer admin control to a new address. This is a critical operation!
                </div>
                <input
                  value={form.admin_address}
                  onChange={e => setForm(f => ({ ...f, admin_address: e.target.value }))}
                  placeholder="New Admin Address (G... format, 56 characters)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-orange-500/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50 disabled:opacity-50"
                />
                {form.admin_address && !form.admin_address.match(/^G[A-Z0-9]{55}$/) && (
                  <div className="text-xs text-red-400">
                    Invalid Stellar address format
                  </div>
                )}
              </div>
            )}

            {form.proposal_type === 'PausePair' && (
              <div className="space-y-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <h5 className="text-yellow-300 text-sm font-medium">⏸️ Pause Trading Pair</h5>
                <div className="text-xs text-yellow-200/80 mb-2">
                  Temporarily disable arbitrage for a specific stablecoin pair
                </div>
                <input
                  value={form.symbol_data}
                  onChange={e => setForm(f => ({ ...f, symbol_data: e.target.value }))}
                  placeholder="Stablecoin Symbol to Pause (e.g., USDC)"
                  disabled={creating}
                  className="w-full bg-black/30 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50 disabled:opacity-50"
                />
              </div>
            )}

            {(form.proposal_type === 'UpdateRiskManager' || form.proposal_type === 'EmergencyStop') && (
              <div className="space-y-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <h5 className="text-red-300 text-sm font-medium">
                  {form.proposal_type === 'EmergencyStop' ? '🚨 Emergency Stop' : '🛡️ Risk Manager Update'}
                </h5>
                <div className="text-xs text-red-200/80">
                  {form.proposal_type === 'EmergencyStop' 
                    ? 'Immediately halt all arbitrage operations. Use only in critical situations.'
                    : 'Update the risk management parameters for the arbitrage system.'
                  }
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={hasStake ? handleCreate : onRequireStake}
                disabled={creating || !address}
                className={`px-4 py-2 rounded-lg text-sm transition-colors border ${
                  hasStake && address && !creating
                    ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white' 
                    : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                {creating ? 'Creating...' : hasStake ? 'Create Proposal' : 'Stake to Create'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm border border-white/10 text-white/70 hover:text-white/90 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-xs p-3 bg-red-400/10 rounded-lg border border-red-400/20">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading && currentProposals.length === 0 && (
          <div className="text-white/60 text-sm">Loading proposals...</div>
        )}
        {(!loading && currentProposals.length === 0) && (
          <div className="text-white/60 text-sm">
            No {viewMode === 'active' ? 'active' : ''} proposals.
          </div>
        )}

        {currentProposals.map(p => {
          const proposalId = toNumberId(p.id)
          const userVote = userVotes.get(proposalId)
          const isProposer = address === p.proposer
          const votingEnded = isVotingEnded(p.voting_ends_at)
          const statusTag = getProposalStatusTag(p.status)
          const proposalTypeTag = getProposalTypeTag(p.proposal_type)
          
          return (
            <div key={proposalId} className="p-4 bg-black/30 border border-white/10 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/90 font-medium">{p.title}</div>
                  <div className="text-white/50 text-xs">
                    {proposalTypeTag} • ID #{proposalId} • by {p.proposer.slice(0, 8)}...
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  statusTag === 'Active' ? 'bg-green-400/10 text-green-400' :
                  statusTag === 'Passed' ? 'bg-blue-400/10 text-blue-400' :
                  statusTag === 'Executed' ? 'bg-purple-400/10 text-purple-400' :
                  statusTag === 'Failed' ? 'bg-red-400/10 text-red-400' :
                  'bg-gray-400/10 text-gray-400'
                }`}>
                  {statusTag}
                </div>
              </div>
              
              <p className="text-white/70 text-sm">{p.description}</p>
              
              <div className="text-xs text-white/60 space-y-1">
                <div>Created: {formatTimestamp(p.created_at)} • Voting Ends: {formatTimestamp(p.voting_ends_at)}</div>
                <div>Yes: {formatStakeAmount(p.yes_votes)} • No: {formatStakeAmount(p.no_votes)} • Quorum: {formatStakeAmount(p.quorum_required)}</div>
                {p.execution_earliest && (
                  <div>Execution Available: {formatTimestamp(p.execution_earliest)}</div>
                )}
              </div>

              {userVote && (
                <div className="text-xs p-2 bg-blue-400/10 text-blue-400 rounded-lg border border-blue-400/20">
                  You voted: {userVote.vote_yes ? 'YES' : 'NO'} ({formatStakeAmount(userVote.voting_power)} KALE)
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Voting buttons */}
                  {statusTag === 'Active' && !votingEnded && !userVote && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(proposalId, true)}
                        disabled={voting === proposalId || !hasStake || !address}
                        className="px-3 py-1.5 rounded-md text-xs bg-green-500/15 text-green-300 border border-green-400/20 hover:bg-green-500/20 disabled:opacity-50"
                      >
                        {voting === proposalId ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => handleVote(proposalId, false)}
                        disabled={voting === proposalId || !hasStake || !address}
                        className="px-3 py-1.5 rounded-md text-xs bg-red-500/15 text-red-300 border border-red-400/20 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {voting === proposalId ? '...' : 'No'}
                      </button>
                    </div>
                  )}

                  {/* Finalize button */}
                  {statusTag === 'Active' && votingEnded && (
                    <button
                      onClick={() => handleFinalize(proposalId)}
                      disabled={finalizing === proposalId}
                      className="px-3 py-1.5 rounded-md text-xs bg-blue-500/15 text-blue-300 border border-blue-400/20 hover:bg-blue-500/20 disabled:opacity-50"
                    >
                      {finalizing === proposalId ? 'Finalizing...' : 'Finalize'}
                    </button>
                  )}

                  {/* Execute button */}
                  {canExecute(p) && (
                    <button
                      onClick={() => handleExecute(proposalId)}
                      disabled={executing === proposalId}
                      className="px-3 py-1.5 rounded-md text-xs bg-purple-500/15 text-purple-300 border border-purple-400/20 hover:bg-purple-500/20 disabled:opacity-50"
                    >
                      {executing === proposalId ? 'Executing...' : 'Execute'}
                    </button>
                  )}
                </div>

                {/* Cancel button for proposers */}
                {isProposer && statusTag === 'Active' && (
                  <button
                    onClick={() => handleCancel(proposalId)}
                    disabled={cancelling === proposalId}
                    className="px-3 py-1.5 rounded-md text-xs bg-gray-500/15 text-gray-300 border border-gray-400/20 hover:bg-gray-500/20 disabled:opacity-50"
                  >
                    {cancelling === proposalId ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DaoProposals
