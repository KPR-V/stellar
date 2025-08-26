import { NextRequest, NextResponse } from 'next/server';
import { 
  Contract, 
  SorobanRpc, 
  TransactionBuilder, 
  Networks, 
  BASE_FEE, 
  xdr,
  Address,
  nativeToScVal,
} from '@stellar/stellar-sdk';

// Your deployed contract address (replace with actual address)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Initialize Soroban RPC server
const server = new SorobanRpc.Server(RPC_URL);

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Helper function to create contract instance
function createContract(): Contract {
  return new Contract(CONTRACT_ADDRESS);
}

// Helper function to convert address string to ScVal
function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { action, userAddress, ...params } = body;

    switch (action) {
      case 'initialize_user_account':
        return await initializeUserAccount(userAddress, params.initialConfig, params.riskLimits);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Initialize user account
async function initializeUserAccount(
  userAddress: string, 
  initialConfig: any, 
  riskLimits: any
): Promise<NextResponse<ApiResponse>> {
  try {
    const contract = createContract();
    const account = await server.getAccount(userAddress);
    
    // Convert config to XDR format (ArbitrageConfig struct)
    const configXdr = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: nativeToScVal("min_profit_bps", { type: "symbol" }),
        val: nativeToScVal(initialConfig.min_profit_bps, { type: "u32" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("max_trade_size", { type: "symbol" }),
        val: nativeToScVal(initialConfig.max_trade_size, { type: "i128" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("slippage_tolerance_bps", { type: "symbol" }),
        val: nativeToScVal(initialConfig.slippage_tolerance_bps, { type: "u32" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("enabled", { type: "symbol" }),
        val: nativeToScVal(initialConfig.enabled, { type: "bool" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("max_gas_price", { type: "symbol" }),
        val: nativeToScVal(initialConfig.max_gas_price, { type: "i128" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("min_liquidity", { type: "symbol" }),
        val: nativeToScVal(initialConfig.min_liquidity, { type: "i128" })
      })
    ]);
    
    // Convert risk limits to XDR format (RiskLimits struct)
    const riskLimitsXdr = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: nativeToScVal("max_daily_volume", { type: "symbol" }),
        val: nativeToScVal(riskLimits.max_daily_volume, { type: "i128" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("max_position_size", { type: "symbol" }),
        val: nativeToScVal(riskLimits.max_position_size, { type: "i128" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("max_drawdown_bps", { type: "symbol" }),
        val: nativeToScVal(riskLimits.max_drawdown_bps, { type: "u32" })
      }),
      new xdr.ScMapEntry({
        key: nativeToScVal("var_limit", { type: "symbol" }),
        val: nativeToScVal(riskLimits.var_limit, { type: "i128" })
      })
    ]);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      contract.call(
        'initialize_user_account',
        addressToScVal(userAddress),
        configXdr,
        riskLimitsXdr
      )
    )
    .setTimeout(30)
    .build();

    const result = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Account initialized successfully!',
        transaction: transaction.toXDR()
      }
    });

  } catch (error) {
    console.error('Error initializing user account:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize user account'
    });
  }
}

