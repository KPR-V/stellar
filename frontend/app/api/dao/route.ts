import { NextRequest, NextResponse } from 'next/server'
import { ArbitrageConfig, Client, EnhancedStablecoinPair, networks, ProposalData, ProposalType, TradingVenue } from '../../../daobindings/src'
import { SorobanRpc, TransactionBuilder, scValToNative } from '@stellar/stellar-sdk'

const RPC_URL = 'https://soroban-testnet.stellar.org'
const DAO_CONTRACT = "CCTY5KAMW3SKZD56YMZ7HQTZ6FZKHS3CUDEEFWCS6QC5PSMOFFUGTGCO"
const NETWORK_PASSPHRASE = networks.testnet.networkPassphrase

// ✅ Helper function to sanitize BigInt values for JSON serialization
function sanitizeForJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForJson);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForJson(value);
    }
    return sanitized;
  }
  
  return obj;
}

// ✅ Helper function for proper ProposalType creation
function createProposalType(typeString: string): ProposalType {
  const validTypes: Record<string, ProposalType> = {
    'UpdateConfig': { tag: 'UpdateConfig', values: undefined },
    'AddTradingPair': { tag: 'AddTradingPair', values: undefined },
    'AddTradingVenue': { tag: 'AddTradingVenue', values: undefined },
    'PausePair': { tag: 'PausePair', values: undefined },
    'UpdateRiskManager': { tag: 'UpdateRiskManager', values: undefined },
    'EmergencyStop': { tag: 'EmergencyStop', values: undefined },
    'TransferAdmin': { tag: 'TransferAdmin', values: undefined },
  }
  
  return validTypes[typeString] || validTypes['UpdateConfig']
}

// ✅ FIXED: Helper to create ArbitrageConfig from input
function createArbitrageConfig(configData: any) {
  // Validate and convert config data to ArbitrageConfig structure
  return {
    enabled: Boolean(configData.enabled ?? true),
    min_profit_bps: Number(configData.min_profit_bps || 50),
    max_trade_size: BigInt(configData.max_trade_size || "1000000000000"), // 1M tokens with 7 decimals
    slippage_tolerance_bps: Number(configData.slippage_tolerance_bps || 100),
    max_gas_price: BigInt(configData.max_gas_price || "2000"),
    min_liquidity: BigInt(configData.min_liquidity || "1000000000"), // 100 tokens with 7 decimals
  }
}

// ✅ Helper to create Enhanced Trading Pair
function createEnhancedTradingPair(pairData: any) {
  return {
    base: {
      base_asset_address: pairData.base_asset_address,
      quote_asset_address: pairData.quote_asset_address,
      base_asset_symbol: pairData.base_asset_symbol,
      quote_asset_symbol: pairData.quote_asset_symbol,
      target_peg: BigInt(pairData.target_peg || 10000),
      deviation_threshold_bps: Number(pairData.deviation_threshold_bps || 50),
    },
    enabled: Boolean(pairData.enabled ?? true),
    fee_config: {
      bridge_fee_bps: Number(pairData.bridge_fee_bps || 0),
      gas_fee_bps: Number(pairData.gas_fee_bps || 10),
      keeper_fee_bps: Number(pairData.keeper_fee_bps || 0),
      trading_fee_bps: Number(pairData.trading_fee_bps || 30),
    },
    price_sources: pairData.price_sources || {
      fallback_enabled: true,
      fiat_sources: [],
      min_sources_required: 1,
      stablecoin_sources: [],
    },
    risk_config: {
      correlation_limit: BigInt(pairData.correlation_limit || "50000000000"),
      max_daily_volume: BigInt(pairData.max_daily_volume || "100000000000"),
      max_position_size: BigInt(pairData.max_position_size || "50000000000"),
      volatility_threshold_bps: Number(pairData.volatility_threshold_bps || 10000),
    },
    twap_config: {
      enabled: Boolean(pairData.twap_enabled ?? false),
      min_deviation_bps: Number(pairData.min_deviation_bps || 50),
      periods: Number(pairData.periods || 1),
    },
  }
}

// ✅ Helper to create Trading Venue
function createTradingVenue(venueData: any) {
  return {
    address: venueData.address,
    name: venueData.name,
    enabled: Boolean(venueData.enabled ?? true),
    fee_bps: Number(venueData.fee_bps || 30),
    liquidity_threshold: BigInt(venueData.liquidity_threshold || "1000000000"),
  }
}

// ✅ FIXED: Helper function to create proper proposal data for ARBITRAGE BOT updates
function createSome<T>(val: T): { tag: 'Some', values: [T] } {
  return { tag: 'Some', values: [val] };
}

// ✅ Helper function to create None variant with the correct structure
function createNone(): { tag: 'None' } {
  return { tag: 'None' };
}
// ✅ Helper function to create None variant explicitly typed as Option<T>

// ✅ FIXED: Helper function to create proper proposal data for ARBITRAGE BOT updates
function createProposalData(proposalType: string, customData?: any) {
  const baseData = {
    admin_address: undefined, // Use undefined directly for Option<string>
    config_data: undefined,   // Use undefined directly for Option<ArbitrageConfig>
    generic_data: undefined,  // Use undefined directly for Option<Buffer>
    pair_data: undefined,     // Use undefined directly for Option<EnhancedStablecoinPair>
    symbol_data: undefined,   // Use undefined directly for Option<string>
    venue_data: undefined,
  }

  switch (proposalType) {
    case 'UpdateConfig':
      if (customData?.config_data) {
        const arbitrageConfig = createArbitrageConfig(customData.config_data)
        return {
          ...baseData,
          config_data: arbitrageConfig
        }
      }
      return baseData
      
    case 'AddTradingPair':
      if (customData?.pair_data) {
        const enhancedPair = createEnhancedTradingPair(customData.pair_data)
        return {
          ...baseData,
          pair_data: enhancedPair
        }
      }
      return baseData
      
    case 'AddTradingVenue':
      if (customData?.venue_data) {
        const venue = createTradingVenue(customData.venue_data)
        return {
          ...baseData,
          venue_data: venue
        }
      }
      return baseData
      
    case 'TransferAdmin':
      if (customData?.admin_address) {
        return {
          ...baseData,
          admin_address: customData.admin_address
        }
      }
      return baseData
      
    case 'PausePair':
      if (customData?.symbol_data) {
        return {
          ...baseData,
          symbol_data: customData.symbol_data
        }
      }
      return baseData
      
    case 'UpdateRiskManager':
    case 'EmergencyStop':
      return baseData
      
    default:
      return baseData
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'get_active_proposals':
        return await getActiveProposals()
      case 'get_all_proposals':
        return await getAllProposals()
      case 'get_proposal':
        return await getProposal(body)
      case 'create_proposal':
        return await createProposal(body)
      case 'cancel_proposal':
        return await cancelProposal(body)
      case 'vote':
        return await voteOnProposal(body)
      case 'finalize_proposal':
        return await finalizeProposal(body)
      case 'execute_proposal':
        return await executeProposal(body)
      case 'stake_kale':
        return await stakeKale(body)
      case 'unstake_kale':
        return await unstakeKale(body)
      case 'get_stake':
        return await getStake(body)
      case 'get_stake_info':
        return await getStakeInfo(body)
      case 'get_total_staked':
        return await getTotalStaked()
      case 'get_dao_config':
        return await getDaoConfig()
      case 'get_admin':
        return await getAdmin()
      case 'get_user_vote':
        return await getUserVote(body)
      case 'submit':
        return await submitSigned(body)
      default:
        return NextResponse.json({ success: false, error: 'Invalid DAO action' }, { status: 400 })
    }
  } catch (error) {
    console.error('DAO API Error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

async function getActiveProposals(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_active_proposals({ simulate: true })
    
    const proposals = (result.result || []).map((p: any) => ({
      id: Number(p.id),
      proposer: p.proposer,
      proposal_type: p.proposal_type.tag,
      title: p.title,
      description: p.description,
      target_contract: p.target_contract,
      created_at: Number(p.created_at),
      voting_ends_at: Number(p.voting_ends_at),
      execution_earliest: Number(p.execution_earliest),
      yes_votes: String(p.yes_votes),
      no_votes: String(p.no_votes),
      status: p.status.tag,
      quorum_required: String(p.quorum_required),
      executed_at: p.executed_at ? Number(p.executed_at) : null,
      cancelled_at: p.cancelled_at ? Number(p.cancelled_at) : null,
    }))

    return NextResponse.json({ success: true, data: { proposals } })
  } catch (error) {
    console.error('Get active proposals error:', error)
    return NextResponse.json({ success: true, data: { proposals: [] } })
  }
}

async function getAllProposals(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_all_proposals({ simulate: true })
    
    const proposals = (result.result || []).map((p: any) => ({
      id: Number(p.id),
      proposer: p.proposer,
      proposal_type: p.proposal_type.tag,
      title: p.title,
      description: p.description,
      target_contract: p.target_contract,
      created_at: Number(p.created_at),
      voting_ends_at: Number(p.voting_ends_at),
      execution_earliest: Number(p.execution_earliest),
      yes_votes: String(p.yes_votes),
      no_votes: String(p.no_votes),
      status: p.status.tag,
      quorum_required: String(p.quorum_required),
      executed_at: p.executed_at ? Number(p.executed_at) : null,
      cancelled_at: p.cancelled_at ? Number(p.cancelled_at) : null,
    }))

    return NextResponse.json({ success: true, data: { proposals } })
  } catch (error) {
    console.error('Get all proposals error:', error)
    return NextResponse.json({ success: true, data: { proposals: [] } })
  }
}

async function getProposal(params: any): Promise<NextResponse> {
  const { proposal_id } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_proposal({ proposal_id: BigInt(proposal_id) }, { simulate: true })
    
    const proposal = {
      id: Number(result.result.id),
      proposer: result.result.proposer,
      proposal_type: result.result.proposal_type.tag,
      title: result.result.title,
      description: result.result.description,
      target_contract: result.result.target_contract,
      created_at: Number(result.result.created_at),
      voting_ends_at: Number(result.result.voting_ends_at),
      execution_earliest: Number(result.result.execution_earliest),
      yes_votes: String(result.result.yes_votes),
      no_votes: String(result.result.no_votes),
      status: result.result.status.tag,
      quorum_required: String(result.result.quorum_required),
      executed_at: result.result.executed_at ? Number(result.result.executed_at) : null,
      cancelled_at: result.result.cancelled_at ? Number(result.result.cancelled_at) : null,
    }

    return NextResponse.json({ success: true, data: { proposal } })
  } catch (error) {
    console.error('Get proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Proposal not found' })
  }
}

// ✅ FIXED: Enhanced createProposal for ARBITRAGE BOT updates
async function createProposal(params: any): Promise<NextResponse> {
  const { proposer, title, description, proposal_type, proposal_data } = params
  try {
    // ✅ Enhanced input validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title is required and cannot be empty' 
      })
    }
    
    if (title.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title cannot exceed 100 characters' 
      })
    }
    
    if (description && description.length > 1000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Description cannot exceed 1000 characters' 
      })
    }

    // ✅ Validate proposal type
    const validTypes = ['UpdateConfig', 'AddTradingPair', 'AddTradingVenue', 'PausePair', 'UpdateRiskManager', 'EmergencyStop', 'TransferAdmin']
    if (!validTypes.includes(proposal_type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid proposal type. Must be one of: ${validTypes.join(', ')}`
      })
    }

    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: proposer,
    })

    const proposalType = createProposalType(proposal_type)
    const fullProposalData = createProposalData(proposal_type, proposal_data)

    console.log('Creating arbitrage bot proposal with data:', {
      proposer,
      proposal_type: proposalType,
      title: title.trim(),
      description: (description || '').trim(),
      proposal_data: fullProposalData
    })

    // ✅ Build transaction for signing
    const assembledTx = await client.create_proposal({
      proposer,
      proposal_type: proposalType,
      title: title.trim(),
      description: (description || '').trim(),
      proposal_data: fullProposalData,
    }, { simulate: false })

    const transactionXdr = assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })

  } catch (error) {
    console.error('Create proposal error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to prepare create proposal' 
    })
  }
}

// ✅ Keep all other functions unchanged
async function cancelProposal(params: any): Promise<NextResponse> {
  const { proposer, proposal_id } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: proposer,
    })

    const assembledTx = await client.cancel_proposal({
      proposer,
      proposal_id: BigInt(proposal_id),
    }, { simulate: false })

    const simulatedTx = await assembledTx.simulate()
    const transactionXdr = simulatedTx.built?.toXDR() || assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Cancel proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare cancel proposal' })
  }
}

async function finalizeProposal(params: any): Promise<NextResponse> {
  const { proposal_id } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const assembledTx = await client.finalize_proposal({
      proposal_id: BigInt(proposal_id),
    }, { simulate: false })

    const simulatedTx = await assembledTx.simulate()
    const transactionXdr = simulatedTx.built?.toXDR() || assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Finalize proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare finalize proposal' })
  }
}

async function executeProposal(params: any): Promise<NextResponse> {
  const { executor, proposal_id } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: executor,
    })

    const assembledTx = await client.execute_proposal({
      executor,
      proposal_id: BigInt(proposal_id),
    }, { simulate: false })

    const simulatedTx = await assembledTx.simulate()
    const transactionXdr = simulatedTx.built?.toXDR() || assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Execute proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare execute proposal' })
  }
}

async function voteOnProposal(params: any): Promise<NextResponse> {
  const { voter, proposal_id, vote_yes } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: voter,
    })

    const assembledTx = await client.vote({
      voter,
      proposal_id: BigInt(proposal_id),
      vote_yes: Boolean(vote_yes),
    }, { simulate: false })

    const simulatedTx = await assembledTx.simulate()
    const transactionXdr = simulatedTx.built?.toXDR() || assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare vote' })
  }
}

async function stakeKale(params: any): Promise<NextResponse> {
  const { staker, amount } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: staker,
    })

    const scaledAmount = BigInt(Math.floor(Number(amount) * 10000000))

    const assembledTx = await client.stake_kale({
      staker,
      amount: scaledAmount,
    }, { simulate: false })

    const simulatedTx = await assembledTx.simulate()
    const transactionXdr = simulatedTx.built?.toXDR() || assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Stake error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare stake' })
  }
}

async function unstakeKale(params: any): Promise<NextResponse> {
  const { staker, amount } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: staker,
    })

    const scaledAmount = BigInt(Math.floor(Number(amount) * 10000000))

    const assembledTx = await client.unstake_kale({
      staker,
      amount: scaledAmount,
    }, { simulate: false })

    const simulatedTx = await assembledTx.simulate()
    const transactionXdr = simulatedTx.built?.toXDR() || assembledTx.built?.toXDR()
    
    if (!transactionXdr) {
      throw new Error('Failed to build transaction XDR')
    }

    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Unstake error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare unstake' })
  }
}

async function getStake(params: any): Promise<NextResponse> {
  const { user } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_stake({ user }, { simulate: true })
    const amount = String(result.result || '0')
    
    return NextResponse.json({ success: true, data: { amount } })
  } catch (error) {
    console.error('Get stake error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get stake' })
  }
}

async function getStakeInfo(params: any): Promise<NextResponse> {
  const { user } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_stake_info({ user }, { simulate: true })
    
    if (!result.simulation) {
      return NextResponse.json({ success: true, data: { stakeInfo: null } })
    }
    
    const sim = result.simulation as any
    if (!sim.result || !sim.result.retval) {
      return NextResponse.json({ success: true, data: { stakeInfo: null } })
    }
    
    const scVal = sim.result.retval
    
    if (scVal.switch().name === 'scvVoid') {
      return NextResponse.json({ success: true, data: { stakeInfo: null } })
    }
    
    try {
      const nativeValue = scValToNative(scVal)
      if (nativeValue && typeof nativeValue === 'object') {
        const stakeInfo = sanitizeForJson(nativeValue)
        return NextResponse.json({ success: true, data: { stakeInfo } })
      }
    } catch (scValError) {
      console.log('scValToNative failed as expected for Option<Map>, attempting manual decode')
      
      if (scVal.switch().name === 'scvMap') {
        const map = scVal.map()
        const stakeInfo: any = {}
        
        for (const entry of map) {
          const key = scValToNative(entry.key())
          const value = scValToNative(entry.val())
          
          if (key === 'staked_at' || key === 'last_stake_update') {
            stakeInfo[key] = typeof value === 'bigint' ? Number(value) : (value || null)
          } else if (key === 'amount') {
            stakeInfo[key] = typeof value === 'bigint' ? String(value) : String(value || '0')
          } else if (typeof value === 'bigint') {
            stakeInfo[key] = String(value)
          } else {
            stakeInfo[key] = value
          }
        }
        
        return NextResponse.json({ success: true, data: { stakeInfo } })
      }
    }
    
    return NextResponse.json({ success: true, data: { stakeInfo: null } })
    
  } catch (error) {
    console.error('Get stake info error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get stake info' })
  }
}

async function getTotalStaked(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_total_staked({ simulate: true })
    const totalStaked = String(result.result || '0')
    
    return NextResponse.json({ success: true, data: { totalStaked } })
  } catch (error) {
    console.error('Get total staked error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get total staked' })
  }
}

async function getDaoConfig(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_dao_config({ simulate: true })
    
    const sanitizedConfig = sanitizeForJson(result.result)
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        config: sanitizedConfig,
        min_stake_to_propose: String(result.result?.min_stake_to_propose || '0'),
        voting_duration_ledgers: Number(result.result?.voting_duration_ledgers || 0),
        quorum_percentage: Number(result.result?.quorum_percentage || 0),
        proposal_threshold_bps: Number(result.result?.proposal_threshold_bps || 0),
        execution_delay: Number(result.result?.execution_delay || 0)
      } 
    })
  } catch (error) {
    console.error('Get DAO config error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get DAO config' 
    })
  }
}

async function getAdmin(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_admin({ simulate: true })
    const admin = result.result
    
    return NextResponse.json({ success: true, data: { admin } })
  } catch (error) {
    console.error('Get admin error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get admin' })
  }
}

async function getUserVote(params: any): Promise<NextResponse> {
  const { user, proposal_id } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_user_vote({ 
      user, 
      proposal_id: BigInt(proposal_id) 
    }, { simulate: true })
    
    const vote = sanitizeForJson(result.result)
    
    return NextResponse.json({ success: true, data: { vote } })
  } catch (error) {
    console.error('Get user vote error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get user vote' })
  }
}

async function submitSigned(params: any): Promise<NextResponse> {
  const { signedXdr } = params
  if (!signedXdr) {
    return NextResponse.json({ success: false, error: 'signedXdr is required' }, { status: 400 })
  }
  
  try {
    const server = new SorobanRpc.Server(RPC_URL, { allowHttp: true })
    const transaction = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
    const sendResponse = await server.sendTransaction(transaction)
    
    if (sendResponse.status === 'ERROR') {
      console.error('❌ Transaction submission error:', sendResponse)
      
      let errorMessage = 'Transaction failed during execution'
      const errorDetails: any = {
        hash: sendResponse.hash,
        status: sendResponse.status,
        latestLedger: sendResponse.latestLedger
      }
      
      try {
        const txDetails = await server.getTransaction(sendResponse.hash)
        console.error('📊 Detailed transaction result:', txDetails)
        
        if (txDetails.status === 'FAILED') {
          errorDetails.failureReason = 'Contract execution failed'
          if (txDetails.resultMetaXdr) {
            errorDetails.hasResultMeta = true
            errorMessage = 'Contract execution failed. Check stake requirements and proposal data.'
          }
        }
      } catch (detailError) {
        console.error('Failed to get transaction details:', detailError)
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        details: errorDetails,
        troubleshooting: [
          'Check if you have sufficient stake for proposal creation',
          'Verify proposal data format matches contract requirements',
          'Ensure DAO contract is properly initialized',
          'Try with simpler proposal parameters first'
        ]
      }, { status: 500 })
    }

    if (sendResponse.status === 'PENDING') {
      let attempts = 0
      const maxAttempts = 60
      
      while (attempts < maxAttempts) {
        try {
          const getResponse = await server.getTransaction(sendResponse.hash)
          
          if (getResponse.status === 'SUCCESS') {
            return NextResponse.json({ 
              success: true, 
              data: { 
                hash: sendResponse.hash, 
                status: 'SUCCESS',
                result: 'Transaction completed successfully',
                ledger: getResponse.ledger
              } 
            })
          } else if (getResponse.status === 'FAILED') {
            return NextResponse.json({ 
              success: false, 
              error: 'Transaction failed during execution', 
              details: getResponse 
            }, { status: 500 })
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000))
          attempts++
        } catch (error) {
          if (attempts === maxAttempts - 1) {
            return NextResponse.json({ 
              success: true, 
              data: { 
                hash: sendResponse.hash, 
                status: 'PENDING',
                result: 'Transaction submitted, taking longer than expected to process'
              } 
            })
          }
          await new Promise(resolve => setTimeout(resolve, 2000))
          attempts++
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        hash: sendResponse.hash, 
        status: sendResponse.status,
        result: 'Transaction submitted successfully'
      } 
    })
    
  } catch (error) {
    console.error('Submit transaction error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit transaction' 
    })
  }
}
