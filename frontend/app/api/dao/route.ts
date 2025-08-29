// api/dao/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Client, networks } from '../../../daobindings/src'
import { SorobanRpc, TransactionBuilder, Networks } from '@stellar/stellar-sdk'

const RPC_URL = 'https://soroban-testnet.stellar.org'
const DAO_CONTRACT = process.env.DAO_CONTRACT_ADDRESS || networks.testnet.contractId
const NETWORK_PASSPHRASE = networks.testnet.networkPassphrase

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'get_active_proposals':
        return await getActiveProposals()
      case 'create_proposal':
        return await createProposal(body)
      case 'vote':
        return await voteOnProposal(body)
      case 'stake_kale':
        return await stakeKale(body)
      case 'get_stake':
        return await getStake(body)
      case 'submit':
        return await submitSigned(body)
      default:
        return NextResponse.json({ success: false, error: 'Invalid DAO action' }, { status: 400 })
    }
  } catch (error) {
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

    const res = await client.get_active_proposals({ simulate: true })

    const proposals = (res.result || []).map((p) => ({
      id: Number(p.id),
      proposer: p.proposer,
      proposal_type: p.proposal_type.tag,
      title: p.title,
      description: p.description,
      created_at: Number(p.created_at),
      voting_ends_at: Number(p.voting_ends_at),
      yes_votes: (p.yes_votes as unknown as bigint).toString(),
      no_votes: (p.no_votes as unknown as bigint).toString(),
      status: p.status.tag,
      quorum_required: (p.quorum_required as unknown as bigint).toString(),
    }))

    return NextResponse.json({ success: true, data: { proposals } })
  } catch (error) {
    // Fallback empty list with explanation for now
    return NextResponse.json({ success: true, data: { proposals: [] } })
  }
}

async function createProposal(params: any): Promise<NextResponse> {
  const { proposer, title, description, proposal_type, proposal_data } = params
  try {
    const client = new Client({
      contractId: DAO_CONTRACT,
      networkPassphrase: NETWORK_PASSPHRASE,
      rpcUrl: RPC_URL,
      publicKey: proposer,
    })

    const proposalType = { tag: String(proposal_type), values: undefined as unknown as void }

    const fullProposalData = {
      admin_address: undefined,
      config_data: undefined,
      generic_data: undefined,
      pair_data: undefined,
      symbol_data: undefined,
      venue_data: undefined,
      ...(proposal_data || {}),
    }

    const res = await client.create_proposal({
      proposer,
      proposal_type: proposalType as any,
      title,
      description,
      proposal_data: fullProposalData as any,
    }, { simulate: true })

    const transactionXdr = res.toXDR()
    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare create proposal' })
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

    const res = await client.vote({
      voter,
      proposal_id,
      vote_yes,
    }, { simulate: true })

    const transactionXdr = res.toXDR()
    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
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

    const scaled = BigInt(Math.floor(Number(amount) * 1e7))

    const res = await client.stake_kale({
      staker,
      amount: scaled as any,
    }, { simulate: true })

    const transactionXdr = res.toXDR()
    return NextResponse.json({ success: true, data: { transactionXdr } })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to prepare stake' })
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

    const res = await client.get_stake({ user }, { simulate: true })
    const amount = (res.result as unknown as bigint).toString()
    return NextResponse.json({ success: true, data: { amount } })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to get stake' })
  }
}

async function submitSigned(params: any): Promise<NextResponse> {
  const { signedXdr } = params
  if (!signedXdr) {
    return NextResponse.json({ success: false, error: 'signedXdr is required' }, { status: 400 })
  }
  try {
    const server = new SorobanRpc.Server(RPC_URL, { allowHttp: true })
    const sendRes = await server.sendTransaction(signedXdr)
    if (sendRes.errorResultXdr) {
      return NextResponse.json({ success: false, error: 'Transaction failed to submit', details: sendRes }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: { hash: sendRes.hash, status: sendRes.status } })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to submit transaction' })
  }
}

