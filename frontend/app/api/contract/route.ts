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

// Helper functions to convert data to XDR format
function convertArbitrageConfigToXdr(config: any): xdr.ScVal {
  // This is a placeholder - you'll need to implement proper conversion
  return xdr.ScVal.scvVoid();
}

function convertRiskLimitsToXdr(riskLimits: any): xdr.ScVal {
  // This is a placeholder - you'll need to implement proper conversion
  return xdr.ScVal.scvVoid();
}

// Helper functions to parse results from XDR
function parseBalancesFromResult(result: any): any {
  // Parse the Map<Address, i128> result
  return {};
}