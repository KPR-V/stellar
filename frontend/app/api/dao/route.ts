import { NextRequest, NextResponse } from 'next/server'
import { Client, networks, Proposal, ProposalData, ProposalType, ProposalStatus } from '../../../daobindings/src'
import { SorobanRpc, TransactionBuilder, scValToNative } from '@stellar/stellar-sdk'

const RPC_URL = 'https://soroban-testnet.stellar.org'
const DAO_CONTRACT = process.env.DAO_CONTRACT_ADDRESS!
const NETWORK_PASSPHRASE = networks.testnet.networkPassphrase

// ✅ Define proper types for simulation results
interface SimulationResult {
  result?: {
    retval?: any;
  };
  [key: string]: any;
}

// ✅ Helper function to parse SCV retval data properly
function parseRetvalData(retval: any): any[] {
  console.log('Parsing retval:', retval)
  
  if (!retval) return []
  
  // Check if it's a vector (list of proposals)
  if (retval._switch?.name === 'scvVec') {
    console.log('Found scvVec, parsing array...')
    const vecData = retval._value || []
    return vecData.map((item: any) => parseScvItem(item))
  }
  
  // Check if it's a map (config data - means no proposals)
  if (retval._switch?.name === 'scvMap') {
    console.log('Found scvMap (config data) - no proposals exist yet')
    return []
  }
  
  // Check if it's void/empty
  if (retval._switch?.name === 'scvVoid') {
    console.log('Found scvVoid - empty result')
    return []
  }
  
  // Direct array
  if (Array.isArray(retval)) {
    return retval.map((item: any) => parseScvItem(item))
  }
  
  console.log('Unknown retval format:', retval._switch?.name)
  console.log('Assuming no proposals exist, returning empty array')
  return []
}

// ✅ Helper to parse individual SCV items
function parseScvItem(item: any): any {
  if (!item) return null
  
  if (item._switch?.name === 'scvMap') {
    return parseScvMap(item._value || [])
  }
  
  return item
}

// ✅ Helper to parse SCV maps into objects
function parseScvMap(mapEntries: any[]): any {
  if (!Array.isArray(mapEntries)) return {}
  
  const result: any = {}
  
  mapEntries.forEach(entry => {
    if (!entry._attributes?.key || !entry._attributes?.val) return
    
    const key = parseScvValue(entry._attributes.key)
    const value = parseScvValue(entry._attributes.val)
    
    if (key) {
      result[key] = value
    }
  })
  
  return result
}

// ✅ Helper to parse individual SCV values
function parseScvValue(scv: any): any {
  if (!scv?._switch) return scv
  
  switch (scv._switch.name) {
    case 'scvSymbol':
      if (scv._value?.data) {
        return Buffer.from(scv._value.data).toString('utf8')
      }
      return scv._value || ''
      
    case 'scvString':
      return scv._value || ''
      
    case 'scvU32':
    case 'scvI32':
      return Number(scv._value || 0)
      
    case 'scvU64':
    case 'scvI64':
      return Number(scv._value || 0)
      
    case 'scvI128':
      if (scv._value?._attributes) {
        const hi = BigInt(scv._value._attributes.hi?._value || 0)
        const lo = BigInt(scv._value._attributes.lo?._value || 0)
        return Number((hi << 64n) + lo)
      }
      return 0
      
    case 'scvBool':
      return Boolean(scv._value)
      
    case 'scvAddress':
      return scv._value || ''
      
    case 'scvVec':
      return (scv._value || []).map((item: any) => parseScvValue(item))
      
    case 'scvMap':
      return parseScvMap(scv._value || [])
      
    default:
      return scv._value
  }
}

// ✅ Updated formatProposal to handle the correct Proposal type from bindings
function formatProposal(proposalData: any): any {
  console.log('🔧 Formatting proposal data:', proposalData)
  
  // Helper function to convert Buffer to string
  const bufferToString = (buffer: any): string => {
    if (!buffer) return ''
    if (typeof buffer === 'string') return buffer
    if (buffer.type === 'Buffer' && Array.isArray(buffer.data)) {
      return Buffer.from(buffer.data).toString('utf8')
    }
    if (Buffer.isBuffer(buffer)) {
      return buffer.toString('utf8')
    }
    return String(buffer)
  }

  // Helper function to extract string from array or buffer
  const extractString = (value: any): string => {
    if (!value) return ''
    if (Array.isArray(value) && value.length > 0) {
      return bufferToString(value[0])
    }
    return bufferToString(value)
  }

  // Helper function to extract address from ChildUnion
  const extractAddress = (addressObj: any): string => {
    if (!addressObj) return ''
    if (typeof addressObj === 'string') return addressObj
    
    try {
      // Handle Stellar address objects
      if (addressObj._value && Buffer.isBuffer(addressObj._value)) {
        return addressObj._value.toString('hex')
      }
      if (addressObj._value && addressObj._value._value && Buffer.isBuffer(addressObj._value._value)) {
        return addressObj._value._value.toString('hex')
      }
      return String(addressObj)
    } catch (error) {
      console.warn('Failed to extract address:', error)
      return 'Unknown Address'
    }
  }
  
  return {
    id: Number(proposalData.id || 0),
    proposer: extractAddress(proposalData.proposer),
    proposal_type: extractString(proposalData.proposal_type) || 'Unknown',
    title: bufferToString(proposalData.title) || 'Untitled Proposal',
    description: bufferToString(proposalData.description) || 'No description provided',
    target_contract: extractAddress(proposalData.target_contract),
    created_at: Number(proposalData.created_at || 0),
    voting_ends_at: Number(proposalData.created_at || 0) + Number(proposalData.voting_ends_at || 0),
    execution_earliest: Number(proposalData.execution_earliest || 0),
    yes_votes: String(proposalData.yes_votes || '0'),
    no_votes: String(proposalData.no_votes || '0'),
    status: extractString(proposalData.status) || 'Active',
    quorum_required: String(proposalData.quorum_required || '0'),
    executed_at: proposalData.executed_at ? Number(proposalData.executed_at) : null,
    cancelled_at: proposalData.cancelled_at ? Number(proposalData.cancelled_at) : null,
    proposal_data: proposalData.proposal_data || null,
  }
}


// Keep all your existing helper functions unchanged...
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

function createArbitrageConfig(configData: any) {
  console.log('🔧 Creating ArbitrageConfig with data:', configData)
  
  const config = {
    enabled: Boolean(configData.enabled ?? true),
    min_profit_bps: Number(configData.min_profit_bps || 50),
    max_trade_size: BigInt(String(configData.max_trade_size || "1000000000000")),
    slippage_tolerance_bps: Number(configData.slippage_tolerance_bps || 100),
    max_gas_price: BigInt(String(configData.max_gas_price || "2000")),
    min_liquidity: BigInt(String(configData.min_liquidity || "1000000000")),
  }
  
  console.log('✅ Created ArbitrageConfig:', {
    ...config,
    max_trade_size: config.max_trade_size.toString(),
    max_gas_price: config.max_gas_price.toString(),
    min_liquidity: config.min_liquidity.toString()
  })
  
  return config
}

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

function createTradingVenue(venueData: any) {
  return {
    address: venueData.address,
    name: venueData.name,
    enabled: Boolean(venueData.enabled ?? true),
    fee_bps: Number(venueData.fee_bps || 30),
    liquidity_threshold: BigInt(venueData.liquidity_threshold || "1000000000"),
  }
}

function createProposalData(proposalType: string, customData?: any) {
  console.log('🔧 Creating ProposalData for type:', proposalType, 'with data:', customData)
  
  const baseData = {
    admin_address: undefined,
    config_data: undefined,
    generic_data: undefined,
    pair_data: undefined,
    symbol_data: undefined,
    venue_data: undefined,
  }

  switch (proposalType) {
    case 'UpdateConfig':
      if (customData?.config_data) {
        const arbitrageConfig = createArbitrageConfig(customData.config_data)
        const result = {
          ...baseData,
          config_data: arbitrageConfig
        }
        console.log('✅ Created UpdateConfig ProposalData:', result)
        return result
      }
      console.log('⚠️ No config_data provided for UpdateConfig')
      return baseData
      
    case 'AddTradingPair':
      if (customData?.pair_data) {
        const enhancedPair = createEnhancedTradingPair(customData.pair_data)
        const result = {
          ...baseData,
          pair_data: enhancedPair
        }
        console.log('✅ Created AddTradingPair ProposalData:', result)
        return result
      }
      console.log('⚠️ No pair_data provided for AddTradingPair')
      return baseData
      
    case 'AddTradingVenue':
      if (customData?.venue_data) {
        const venue = createTradingVenue(customData.venue_data)
        const result = {
          ...baseData,
          venue_data: venue
        }
        console.log('✅ Created AddTradingVenue ProposalData:', result)
        return result
      }
      console.log('⚠️ No venue_data provided for AddTradingVenue')
      return baseData
      
    case 'TransferAdmin':
      if (customData?.admin_address) {
        const result = {
          ...baseData,
          admin_address: customData.admin_address
        }
        console.log('✅ Created TransferAdmin ProposalData:', result)
        return result
      }
      console.log('⚠️ No admin_address provided for TransferAdmin')
      return baseData
      
    case 'PausePair':
      if (customData?.symbol_data) {
        const result = {
          ...baseData,
          symbol_data: customData.symbol_data
        }
        console.log('✅ Created PausePair ProposalData:', result)
        return result
      }
      console.log('⚠️ No symbol_data provided for PausePair')
      return baseData
      
    case 'UpdateRiskManager':
    case 'EmergencyStop':
      console.log('✅ Created generic ProposalData for:', proposalType)
      return baseData
      
    default:
      console.log('⚠️ Unknown proposal type:', proposalType)
      return baseData
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
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
      case 'get_all_proposals':
        return await getAllProposals()
      case 'get_active_proposals':
        return await getActiveProposals()
      case 'get_proposal':
        return await getProposal(body)
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


// ✅ FIXED: Enhanced createProposal for ARBITRAGE BOT updates
async function createProposal(params: any): Promise<NextResponse> {
  const { proposer, title, description, proposal_type, proposal_data } = params
  try {
    console.log('📝 Creating proposal with params:', {
      proposer,
      title,
      description,
      proposal_type,
      proposal_data
    })

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

    console.log('🔧 Processed proposal data:', {
      proposer,
      proposal_type: proposalType,
      title: title.trim(),
      description: (description || '').trim(),
      proposal_data: fullProposalData
    })

    // ✅ Build transaction for signing - follow contract API pattern
    const server = new SorobanRpc.Server(RPC_URL)
    
    console.log('⚙️ Calling contract create_proposal function...')
    const result = await client.create_proposal({
      proposer,
      proposal_type: proposalType,
      title: title.trim(),
      description: (description || '').trim(),
      proposal_data: fullProposalData,
    }, { simulate: true })

    console.log('📋 Contract call result:', result)
    
    const initialTx = result.toXDR()
    console.log('🔗 Initial transaction XDR length:', initialTx.length)
    
    const transaction = TransactionBuilder.fromXDR(initialTx, networks.testnet.networkPassphrase)
    const preparedTransaction = await server.prepareTransaction(transaction)

    console.log('✅ Transaction prepared successfully for signing')
    console.log('🎯 Transaction hash (before signing):', transaction.hash().toString('hex'))

    return NextResponse.json({
      success: true,
      data: { 
        transactionXdr: preparedTransaction.toXDR(),
        proposalType: proposal_type,
        proposalTitle: title.trim()
      }
    })

  } catch (error) {
    console.error('❌ Create proposal error:', error)
    
    // Enhanced error handling
    let errorMessage = 'Failed to prepare create proposal'
    
    if (error instanceof Error) {
      if (error.message.includes('Must stake KALE')) {
        errorMessage = 'You must stake KALE tokens before creating proposals'
      } else if (error.message.includes('Insufficient stake')) {
        errorMessage = 'Insufficient KALE stake to create proposals'
      } else if (error.message.includes('Title too long')) {
        errorMessage = 'Proposal title is too long (max 100 characters)'
      } else if (error.message.includes('Description too long')) {
        errorMessage = 'Proposal description is too long (max 1000 characters)'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    })
  }
}

// ✅ Keep all other functions unchanged
async function cancelProposal(params: any): Promise<NextResponse> {
  const { proposer, proposal_id } = params
  try {
    const server = new SorobanRpc.Server(RPC_URL)
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: proposer,
    })

    const result = await client.cancel_proposal({
      proposer,
      proposal_id: BigInt(proposal_id),
    }, { simulate: true })

    const initialTx = result.toXDR()
    const transaction = TransactionBuilder.fromXDR(initialTx, networks.testnet.networkPassphrase)
    const preparedTransaction = await server.prepareTransaction(transaction)

    return NextResponse.json({
      success: true,
      data: { 
        transactionXdr: preparedTransaction.toXDR()
      }
    })
  } catch (error) {
    console.error('Cancel proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare cancel proposal' })
  }
}

async function finalizeProposal(params: any): Promise<NextResponse> {
  const { proposal_id } = params
  try {
    const server = new SorobanRpc.Server(RPC_URL)
    
    console.log('Finalizing proposal for ID:', proposal_id)
    
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.finalize_proposal({
      proposal_id: BigInt(proposal_id),
    }, { simulate: true })

    const transaction = TransactionBuilder.fromXDR(
      result.toXDR(),
      NETWORK_PASSPHRASE
    )

    const preparedTx = await server.prepareTransaction(transaction)
    const transactionXdr = preparedTx.toXDR()

    console.log('Finalize proposal transaction prepared successfully')
    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Finalize proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare finalize proposal' })
  }
}

async function executeProposal(params: any): Promise<NextResponse> {
  const { executor, proposal_id } = params
  try {
    const server = new SorobanRpc.Server(RPC_URL)
    
    console.log('Executing proposal for ID:', proposal_id)
    
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: executor,
    })

    const result = await client.execute_proposal({
      executor,
      proposal_id: BigInt(proposal_id),
    }, { simulate: true })

    const transaction = TransactionBuilder.fromXDR(
      result.toXDR(),
      NETWORK_PASSPHRASE
    )

    const preparedTx = await server.prepareTransaction(transaction)
    const transactionXdr = preparedTx.toXDR()

    console.log('Execute proposal transaction prepared successfully')
    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Execute proposal error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare execute proposal' })
  }
}

async function voteOnProposal(params: any): Promise<NextResponse> {
  const { voter, proposal_id, vote_yes } = params
  try {
    const server = new SorobanRpc.Server(RPC_URL)
    
    console.log('Voting on proposal ID:', proposal_id, 'Vote:', vote_yes)
    
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: voter,
    })

    const result = await client.vote({
      voter,
      proposal_id: BigInt(proposal_id),
      vote_yes: Boolean(vote_yes),
    }, { simulate: true })

    const transaction = TransactionBuilder.fromXDR(
      result.toXDR(),
      NETWORK_PASSPHRASE
    )

    const preparedTx = await server.prepareTransaction(transaction)
    const transactionXdr = preparedTx.toXDR()

    console.log('Vote transaction prepared successfully')
    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    console.error('Vote error:', error)
    
    let errorMessage = 'Failed to prepare vote'
    let errorType = 'UNKNOWN'
    
    if (error instanceof Error) {
      const errorStr = error.message
      
      if (errorStr.includes('InvalidAction') || errorStr.includes('UnreachableCodeReached')) {
        if (errorStr.includes('vote')) {
          errorMessage = 'Unable to vote on this proposal. You may have already voted, the voting period may have ended, or you need to stake KALE tokens first.'
          errorType = 'VOTE_REJECTED'
        }
      } else if (errorStr.includes('insufficient')) {
        errorMessage = 'Insufficient balance or stake to vote on this proposal.'
        errorType = 'INSUFFICIENT_BALANCE'
      } else {
        errorMessage = errorStr
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      errorType,
      originalError: error instanceof Error ? error.message : String(error)
    })
  }
}

async function stakeKale(params: any): Promise<NextResponse> {
  const { staker, amount } = params
  try {
    const server = new SorobanRpc.Server(RPC_URL)
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: staker,
    })

    const scaledAmount = BigInt(Math.floor(Number(amount) * 10000000))

    console.log('Preparing stake_kale transaction:', {
      staker,
      amount: amount,
      scaledAmount: scaledAmount.toString()
    })

    const result = await client.stake_kale({
      staker,
      amount: scaledAmount,
    }, { simulate: true })

    const initialTx = result.toXDR()
    const transaction = TransactionBuilder.fromXDR(initialTx, networks.testnet.networkPassphrase)
    const preparedTransaction = await server.prepareTransaction(transaction)

    return NextResponse.json({
      success: true,
      data: { 
        transactionXdr: preparedTransaction.toXDR()
      }
    })
  } catch (error) {
    console.error('Stake error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare stake' })
  }
}

async function unstakeKale(params: any): Promise<NextResponse> {
  const { staker, amount } = params
  try {
    const server = new SorobanRpc.Server(RPC_URL)
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: staker,
    })

    const scaledAmount = BigInt(Math.floor(Number(amount) * 10000000))

    console.log('Preparing unstake_kale transaction:', {
      staker,
      amount: amount,
      scaledAmount: scaledAmount.toString()
    })

    const result = await client.unstake_kale({
      staker,
      amount: scaledAmount,
    }, { simulate: true })

    const initialTx = result.toXDR()
    const transaction = TransactionBuilder.fromXDR(initialTx, networks.testnet.networkPassphrase)
    const preparedTransaction = await server.prepareTransaction(transaction)

    return NextResponse.json({
      success: true,
      data: { 
        transactionXdr: preparedTransaction.toXDR()
      }
    })
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

async function getAllProposals(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_all_proposals({ simulate: true })
    console.log('📋 Raw get_all_proposals result:', result)
    
    // Extract the actual result value - check multiple possible locations
    let retval = null
    if (result.simulation && 'result' in result.simulation && result.simulation.result) {
      retval = result.simulation.result.retval
    } else if (result.result) {
      retval = result.result
    }
    
    console.log('📋 Using retval:', retval)
    
    const rawProposals = parseRetvalData(retval)
    console.log('📋 Parsed proposals data:', rawProposals)
    
    const proposals = rawProposals.map((proposal: any) => formatProposal(proposal))
    console.log('✅ Formatted proposals:', proposals)
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        proposals: proposals,
        count: proposals.length 
      } 
    })
  } catch (error) {
    console.error('Get all proposals error:', error)
    
    // If it's a parsing error due to no proposals, return empty array
    if (error instanceof Error && error.message.includes('ScSpecType')) {
      console.log('📋 No proposals found, returning empty array')
      return NextResponse.json({ 
        success: true, 
        data: { 
          proposals: [],
          count: 0 
        } 
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get all proposals' 
    })
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
    console.log('📋 Raw get_active_proposals result:', result)
    
    // Extract the actual result value - check multiple possible locations
    let retval = null
    if (result.simulation && 'result' in result.simulation && result.simulation.result) {
      retval = result.simulation.result.retval
    } else if (result.result) {
      retval = result.result
    }
    
    console.log('📋 Using retval:', retval)
    
    const rawProposals = parseRetvalData(retval)
    console.log('📋 Parsed active proposals data:', rawProposals)
    
    const proposals = rawProposals.map((proposal: any) => formatProposal(proposal))
    console.log('✅ Formatted active proposals:', proposals)
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        proposals: proposals,
        count: proposals.length 
      } 
    })
  } catch (error) {
    console.error('Get active proposals error:', error)
    
    // If it's a parsing error due to no proposals, return empty array
    if (error instanceof Error && error.message.includes('ScSpecType')) {
      console.log('📋 No active proposals found, returning empty array')
      return NextResponse.json({ 
        success: true, 
        data: { 
          proposals: [],
          count: 0 
        } 
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get active proposals' 
    })
  }
}

async function getProposal(params: any): Promise<NextResponse> {
  const { proposal_id } = params
  
  if (!proposal_id && proposal_id !== 0) {
    return NextResponse.json({ success: false, error: 'proposal_id is required' }, { status: 400 })
  }

  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
    })

    const result = await client.get_proposal({ proposal_id: BigInt(proposal_id) }, { simulate: true })
    console.log('📋 Raw get_proposal result:', result)
    
    // Extract the actual result value
    let retval = null
    if (result.simulation && 'result' in result.simulation && result.simulation.result) {
      retval = result.simulation.result.retval
    } else if (result.result) {
      retval = result.result
    }
    
    console.log('📋 Using retval:', retval)
    
    if (!retval) {
      return NextResponse.json({ 
        success: false, 
        error: 'Proposal not found' 
      }, { status: 404 })
    }
    
    const proposalData = parseScvItem(retval)
    console.log('📋 Parsed proposal data:', proposalData)
    
    const proposal = formatProposal(proposalData)
    console.log('✅ Formatted proposal:', proposal)
    
    return NextResponse.json({ 
      success: true, 
      proposal: proposal
    })
  } catch (error) {
    console.error('Get proposal error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Proposal not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get proposal' 
    })
  }
}

async function submitSigned(params: any): Promise<NextResponse> {
  let { signedXdr } = params
  

  if (!signedXdr) {
    return NextResponse.json({ success: false, error: 'signedXdr is required' }, { status: 400 })
  }
  

  if (typeof signedXdr === 'object' && signedXdr.signedTxXdr) {
    console.log('📦 Extracting XDR from wallet object format')
    signedXdr = signedXdr.signedTxXdr
  }
  

  if (typeof signedXdr !== 'string') {
    console.error('❌ Invalid XDR format:', typeof signedXdr, signedXdr)
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid XDR format - expected string, received ' + typeof signedXdr,
      details: { receivedType: typeof signedXdr }
    }, { status: 400 })
  }
  
  console.log('📝 Processing signed XDR:', {
    length: signedXdr.length,
    starts_with: signedXdr.substring(0, 20),
    type: typeof signedXdr
  })
  
  try {
    const server = new SorobanRpc.Server(RPC_URL, { allowHttp: true })
    
  
    let transaction: any
    
    try {
      transaction = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
      console.log('✅ Successfully parsed XDR as TransactionEnvelope')
    } catch (parseError) {
      console.error('❌ Failed to parse XDR:', parseError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse signed transaction XDR',
        details: {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          xdrLength: signedXdr.length,
          suggestion: 'Ensure wallet is signing transaction correctly'
        }
      }, { status: 400 })
    }
    
    console.log('🚀 Submitting transaction with hash:', transaction.hash().toString('hex'))
    console.log('📊 Transaction details:', {
      source: transaction.source,
      fee: transaction.fee,
      operationsCount: transaction.operations.length
    })
    
    const sendResponse = await server.sendTransaction(transaction)
    
    console.log('📤 Transaction submission response:', {
      hash: sendResponse.hash,
      status: sendResponse.status,
      latestLedger: sendResponse.latestLedger
    })
    
    if (sendResponse.status === 'ERROR') {
      console.error('❌ Transaction submission error:', sendResponse)
      
      let errorMessage = 'Transaction failed during execution'
      const errorDetails: any = {
        hash: sendResponse.hash,
        status: sendResponse.status,
        latestLedger: sendResponse.latestLedger
      }
      
    
      if (sendResponse.errorResult) {
        try {
          const errorResult = sendResponse.errorResult
          console.error('📊 Detailed error result:', errorResult)
          
       
          if (errorResult.result?.name === 'txFailed') {
            const opResults = errorResult.result().results()
            if (opResults && opResults.length > 0) {
              errorMessage = 'Contract execution failed - check stake requirements and proposal data'
              errorDetails.contractError = 'Contract function execution failed'
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error result:', parseError)
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        details: errorDetails,
        troubleshooting: [
          'Check if you have sufficient KALE stake for proposal creation',
          'Verify proposal data format matches contract requirements',
          'Ensure DAO contract is properly initialized and deployed correctly',
          'Check if wallet has sufficient XLM for transaction fees'
        ]
      }, { status: 500 })
    }

    if (sendResponse.status === 'PENDING') {
      console.log('⏳ Transaction pending, monitoring for completion...')
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const getResponse = await server.getTransaction(sendResponse.hash)
          
          if (getResponse.status === 'SUCCESS') {
            console.log('✅ Transaction successful:', {
              hash: sendResponse.hash,
              ledger: getResponse.ledger
            })
            return NextResponse.json({ 
              success: true, 
              data: { 
                hash: sendResponse.hash, 
                status: 'SUCCESS',
                result: 'Proposal created successfully',
                ledger: getResponse.ledger
              } 
            })
          } else if (getResponse.status === 'FAILED') {
            console.error('❌ Transaction failed after pending:', getResponse)
            return NextResponse.json({ 
              success: false, 
              error: 'Transaction failed during execution', 
              details: getResponse 
            }, { status: 500 })
          }
          
          attempts++
        } catch (error) {
          if (attempts === maxAttempts - 1) {
            console.log('⏰ Transaction taking longer than expected')
            return NextResponse.json({ 
              success: true, 
              data: { 
                hash: sendResponse.hash, 
                status: 'PENDING',
                result: 'Transaction submitted, taking longer than expected to process'
              } 
            })
          }
          attempts++
        }
      }
    }

    console.log('📤 Transaction submitted successfully:', sendResponse.hash)
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
    
    let errorMessage = 'Failed to submit transaction'
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient balance for transaction fees'
      } else if (error.message.includes('bad_auth')) {
        errorMessage = 'Authentication failed - check wallet connection'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    })
  }
}


