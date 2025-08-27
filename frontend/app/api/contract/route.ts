// api/contract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../src/bindings/src'; 
import { Networks } from '@stellar/stellar-sdk';

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

    // ✅ Add update user config action
    if (action === 'update_user_config') {
      return await updateUserConfig(userAddress, params.newConfig);
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

    // ✅ Convert BigInt values to strings before serialization
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

    // Alternative: Use custom replacer function
    // return new NextResponse(
    //   JSON.stringify({
    //     success: true,
    //     data: {
    //       message: 'User config fetched successfully!',
    //       config: result.result
    //     }
    //   }, (key, value) => typeof value === 'bigint' ? value.toString() : value),
    //   {
    //     status: 200,
    //     headers: { 'Content-Type': 'application/json' }
    //   }
    // );

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