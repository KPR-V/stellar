// api/contract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../src/bindings/src'; 
import { Networks } from '@stellar/stellar-sdk';
import { SorobanRpc, Address as StellarAddress } from '@stellar/stellar-sdk';


const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'CCPCIIYJ4XQKVH7UGMYVITAPSJZMXIHU2F4GSDMOAUQYGZQFKUIFJPRE';
const RPC_URL = 'https://soroban-testnet.stellar.org';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, userAddress, ...params } = body;

    if (action === 'initialize_user_account') {
      return await initializeUserAccountWithBindings(userAddress, params.initialConfig, params.riskLimits);
    }

    if (action === 'get_user_config') {
      return await getUserConfig(userAddress);
    }

    if (action === 'update_user_config') {
      return await updateUserConfig(userAddress, params.newConfig);
    }

     if (action === 'get_user_trade_history') {
      return await getUserTradeHistory(userAddress, params.limit || 50);
    }

    if (action === 'get_user_balances') {
      return await getUserBalances(userAddress);
    }

     if (action === 'deposit_user_funds') {
      return await depositUserFunds(userAddress, params.tokenAddress, params.amount);
    }

    if (action === 'withdraw_user_funds') {
      return await withdrawUserFunds(userAddress, params.tokenAddress, params.amount);
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


async function initializeUserAccountWithBindings(
  userAddress: string,
  initialConfig: any,
  riskLimits: any
): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress
    });

    // ✅ Use simulate: true to auto-simulate and prepare XDR
    const result = await client.initialize_user_account({
      user: userAddress,
      initial_config: {
        enabled: initialConfig.enabled,
        max_gas_price: BigInt(initialConfig.max_gas_price),
        max_trade_size: BigInt(initialConfig.max_trade_size),
        min_liquidity: BigInt(initialConfig.min_liquidity),
        min_profit_bps: initialConfig.min_profit_bps,
        slippage_tolerance_bps: initialConfig.slippage_tolerance_bps
      },
      risk_limits: {
        max_daily_volume: BigInt(riskLimits.max_daily_volume),
        max_position_size: BigInt(riskLimits.max_position_size),
        max_drawdown_bps: riskLimits.max_drawdown_bps,
        var_limit: BigInt(riskLimits.var_limit)
      }
    }, {
      simulate: true // Auto-simulate and prepare for signing
    });

    // ✅ Now you can safely get the XDR
    const transactionXdr = result.toXDR();

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Transaction prepared for signing',
        transactionXdr: transactionXdr
      }
    });

  } catch (error) {
    console.error('Error preparing transaction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare transaction'
    });
  }
}

async function getUserConfig(userAddress: string): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const result = await client.get_user_config({
      user: userAddress
    }, {
      simulate: true
    });

    const configWithStrings = {
      enabled: result.result.enabled,
      max_gas_price: result.result.max_gas_price?.toString(),
      max_trade_size: result.result.max_trade_size?.toString(),
      min_liquidity: result.result.min_liquidity?.toString(),
      min_profit_bps: result.result.min_profit_bps,
      slippage_tolerance_bps: result.result.slippage_tolerance_bps
    };

    return NextResponse.json({
      success: true,
      data: {
        message: 'User config fetched successfully!',
        config: configWithStrings
      }
    });

  } catch (error) {
    console.error('Error fetching user config:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user config'
    });
  }
}


async function updateUserConfig(
  userAddress: string,
  newConfig: any
): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress, // Ensure correct source account
    });

    const result = await client.update_user_config({
      user: userAddress,
      new_config: {
        enabled: newConfig.enabled,
        max_gas_price: BigInt(newConfig.max_gas_price),
        max_trade_size: BigInt(newConfig.max_trade_size),
        min_liquidity: BigInt(newConfig.min_liquidity),
        min_profit_bps: newConfig.min_profit_bps,
        slippage_tolerance_bps: newConfig.slippage_tolerance_bps
      }
    }, {
      simulate: true // Auto-simulate and prepare for signing
    });

    const transactionXdr = result.toXDR();

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Update transaction prepared for signing',
        transactionXdr: transactionXdr
      }
    });

  } catch (error) {
    console.error('Error preparing update transaction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare update transaction'
    });
  }
}

async function getUserTradeHistory(
  userAddress: string,
  limit: number = 50
): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const result = await client.get_user_trade_history({
      user: userAddress,
      limit: limit
    }, {
      simulate: true
    });

    // ✅ Format the trade history data and handle BigInt serialization
    const formattedTrades = result.result.map((trade: any) => ({
      executed_amount: trade.executed_amount?.toString(),
      actual_profit: trade.actual_profit?.toString(),
      gas_cost: trade.gas_cost?.toString(),
      execution_timestamp: trade.execution_timestamp?.toString(),
      status: trade.status,
      opportunity: {
        pair: trade.opportunity.pair,
        stablecoin_price: trade.opportunity.stablecoin_price?.toString(),
        fiat_rate: trade.opportunity.fiat_rate?.toString(),
        deviation_bps: trade.opportunity.deviation_bps,
        estimated_profit: trade.opportunity.estimated_profit?.toString(),
        trade_direction: trade.opportunity.trade_direction,
        timestamp: trade.opportunity.timestamp?.toString()
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        message: 'Trade history fetched successfully!',
        trades: formattedTrades,
        count: formattedTrades.length
      }
    });

  } catch (error) {
    console.error('Error fetching trade history:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trade history'
    });
  }
}


async function getUserBalances(userAddress: string): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const result = await client.get_user_balances({
      user: userAddress
    }, {
      simulate: true
    });

    // ✅ Convert Map<Address, i128> to serializable format
    const balancesWithStrings: { [key: string]: string } = {};
    
    // The result.result is a Map, we need to iterate through it
    if (result.result && typeof result.result === 'object') {
      for (const [tokenAddress, balance] of Object.entries(result.result)) {
        balancesWithStrings[tokenAddress] = balance.toString();
      }
    }

    // Calculate total portfolio value (simplified - you might want to use real token prices)
    let totalValue = 0;
    for (const balance of Object.values(balancesWithStrings)) {
      // Simple conversion assuming 1:1 ratio for demonstration
      // In real implementation, you'd multiply by token prices
      totalValue += parseFloat(balance) / 10000000; // Convert from stroops
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'User balances fetched successfully!',
        balances: balancesWithStrings,
        portfolioValue: totalValue.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error fetching user balances:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user balances'
    });
  }
}

async function depositUserFunds(
  userAddress: string,
  tokenAddress: string,
  amount: string,
  isNative: boolean = true
): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    // Handle native XLM with wrapped contract (replace with actual testnet wrapped XLM if different)
    const finalTokenAddress = isNative ? 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT' : tokenAddress;

    const result = await client.deposit_user_funds({
      user: userAddress,
      token_address: finalTokenAddress,
      amount: BigInt(amount)
    }, {
      simulate: true
    });

    const transactionXdr = result.toXDR();

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Deposit transaction prepared for signing',
        transactionXdr: transactionXdr
      }
    });

  } catch (error) {
    console.error('Error preparing deposit transaction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare deposit transaction'
    });
  }
}

// Similarly update withdrawUserFunds (assuming similar structure)
async function withdrawUserFunds(
  userAddress: string,
  tokenAddress: string,
  amount: string,
  isNative: boolean = true
): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    const finalTokenAddress = isNative ? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGCN4CT' : tokenAddress;

    const result = await client.withdraw_user_funds({
      user: userAddress,
      token_address: finalTokenAddress,
      amount: BigInt(amount)
    }, {
      simulate: true
    });

    const transactionXdr = result.toXDR();

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Withdrawal transaction prepared for signing',
        transactionXdr: transactionXdr
      }
    });

  } catch (error) {
    console.error('Error preparing withdrawal transaction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare withdrawal transaction'
    });
  }
}


