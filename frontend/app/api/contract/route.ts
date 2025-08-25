import { NextRequest, NextResponse } from 'next/server';
import { 
  Contract, 
  SorobanRpc, 
  TransactionBuilder, 
  Networks, 
  BASE_FEE, 
  xdr,
  Address,
} from '@stellar/stellar-sdk';

// Your deployed contract address (replace with actual address)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const NETWORK_PASSPHRASE = Networks.TESTNET; // Change to Networks.PUBLIC for mainnet
const RPC_URL = 'https://soroban-testnet.stellar.org'; // Change for mainnet

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
      case 'check_user_initialized':
        return await checkUserInitialized(userAddress);
      
      case 'initialize_user_account':
        return await initializeUserAccount(userAddress, params.initialConfig, params.riskLimits);
      
      case 'get_user_balances':
        return await getUserBalances(userAddress);
      
      case 'get_user_config':
        return await getUserConfig(userAddress);
      
      case 'get_user_trade_history':
        return await getUserTradeHistory(userAddress, params.limit);
      
      case 'get_user_performance_metrics':
        return await getUserPerformanceMetrics(userAddress, params.days);
      
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

// Check if user is initialized
async function checkUserInitialized(userAddress: string): Promise<NextResponse<ApiResponse>> {
  try {
    const contract = createContract();
    const account = await server.getAccount(userAddress);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_user_balances', // Use `get_user_balances` to check if the user account exists
          addressToScVal(userAddress)
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(transaction);

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    // Parse the balances result
    const returnValue = result.result?.retval;
    const balances = returnValue
      ? xdr.ScVal.fromXDR(returnValue.toXDR().toString('base64'), 'base64').value()
      : null;

    // If balances are null or empty, the user is not initialized
    const isInitialized = balances && Object.keys(balances).length > 0;

    return NextResponse.json({
      success: true,
      data: { isInitialized },
    });
  } catch (error) {
    console.error('Error checking user initialization:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check user initialization',
    });
  }
}

// Initialize user account
async function initializeUserAccount(
  userAddress: string, 
  initialConfig: any, 
  riskLimits: any
): Promise<NextResponse<ApiResponse>> {
  try {
    // Note: In a real implementation, you would need the user to sign this transaction
    // This is just a simulation to show the structure
    
    const contract = createContract();
    const account = await server.getAccount(userAddress);
    
    // Convert config and risk limits to XDR format
    const configXdr = convertArbitrageConfigToXdr(initialConfig);
    const riskLimitsXdr = convertRiskLimitsToXdr(riskLimits);
    
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

    // In practice, you would return this transaction to the frontend for signing
    const result = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Account initialization transaction prepared. Please sign with your wallet.',
        transaction: transaction.toXDR() // Return transaction for frontend signing
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

// Get user balances
async function getUserBalances(userAddress: string): Promise<NextResponse<ApiResponse>> {
  try {
    const contract = createContract();
    const account = await server.getAccount(userAddress);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      contract.call(
        'get_user_balances',
        addressToScVal(userAddress)
      )
    )
    .setTimeout(30)
    .build();

    const result = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    // Parse the balances map result
    const balances = parseBalancesFromResult(result.result?.retval);

    return NextResponse.json({
      success: true,
      data: { balances }
    });

  } catch (error) {
    console.error('Error getting user balances:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user balances'
    });
  }
}

// Get user configuration
async function getUserConfig(userAddress: string): Promise<NextResponse<ApiResponse>> {
  try {
    const contract = createContract();
    const account = await server.getAccount(userAddress);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      contract.call(
        'get_user_config',
        addressToScVal(userAddress)
      )
    )
    .setTimeout(30)
    .build();

    const result = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    const config = parseArbitrageConfigFromResult(result.result?.retval);

    return NextResponse.json({
      success: true,
      data: { config }
    });

  } catch (error) {
    console.error('Error getting user config:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user config'
    });
  }
}

// Get user trade history
async function getUserTradeHistory(userAddress: string, limit: number = 10): Promise<NextResponse<ApiResponse>> {
  try {
    const contract = createContract();
    const account = await server.getAccount(userAddress);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      contract.call(
        'get_user_trade_history',
        addressToScVal(userAddress),
        xdr.ScVal.scvU32(limit)
      )
    )
    .setTimeout(30)
    .build();

    const result = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    const tradeHistory = parseTradeHistoryFromResult(result.result?.retval);

    return NextResponse.json({
      success: true,
      data: { tradeHistory }
    });

  } catch (error) {
    console.error('Error getting user trade history:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user trade history'
    });
  }
}

// Get user performance metrics
async function getUserPerformanceMetrics(userAddress: string, days: number = 30): Promise<NextResponse<ApiResponse>> {
  try {
    const contract = createContract();
    const account = await server.getAccount(userAddress);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      contract.call(
        'get_user_performance_metrics',
        addressToScVal(userAddress),
        xdr.ScVal.scvU32(days)
      )
    )
    .setTimeout(30)
    .build();

    const result = await server.simulateTransaction(transaction);
    
    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new Error(`Contract simulation failed: ${result.error}`);
    }

    const metrics = parsePerformanceMetricsFromResult(result.result?.retval);

    return NextResponse.json({
      success: true,
      data: { metrics }
    });

  } catch (error) {
    console.error('Error getting user performance metrics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user performance metrics'
    });
  }
}

// Helper functions to convert data to XDR format
function convertArbitrageConfigToXdr(config: any): xdr.ScVal {
  // This is a placeholder - you'll need to implement proper conversion
  // based on your ArbitrageConfig structure
  return xdr.ScVal.scvVoid();
}

function convertRiskLimitsToXdr(riskLimits: any): xdr.ScVal {
  // This is a placeholder - you'll need to implement proper conversion
  // based on your RiskLimits structure
  return xdr.ScVal.scvVoid();
}

// Helper functions to parse results from XDR
function parseBalancesFromResult(result: any): any {
  // Parse the Map<Address, i128> result
  // This is a placeholder - implement based on actual XDR structure
  return {};
}

function parseArbitrageConfigFromResult(result: any): any {
  // Parse the ArbitrageConfig result
  // This is a placeholder - implement based on actual XDR structure
  return {};
}

function parseTradeHistoryFromResult(result: any): any {
  // Parse the Vec<TradeExecution> result
  // This is a placeholder - implement based on actual XDR structure
  return [];
}

function parsePerformanceMetricsFromResult(result: any): any {
  // Parse the PerformanceMetrics result
  // This is a placeholder - implement based on actual XDR structure
  return {};
}