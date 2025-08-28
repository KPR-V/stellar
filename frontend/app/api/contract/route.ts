// api/contract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../src/bindings/src'; 
import { Networks, TransactionBuilder, Asset } from '@stellar/stellar-sdk';
import { SorobanRpc, Address as StellarAddress } from '@stellar/stellar-sdk';

// ✅ Helper to safely stringify objects with BigInt values
const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};

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

    if (action === 'check_user_initialized') {
      return await checkUserInitialized(userAddress);
    }

     if (action === 'deposit_user_funds') {
      return await depositUserFunds(userAddress, params.tokenAddress, params.amount, params.isNative, params.assetCode);
    }

    if (action === 'withdraw_user_funds') {
      return await withdrawUserFunds(userAddress, params.tokenAddress, params.amount, params.isNative, params.assetCode);
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
    // Create RPC server for transaction preparation
    const server = new SorobanRpc.Server(RPC_URL);

    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress
    });

    // Build the transaction (simulate to get initial XDR)
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
      simulate: true // Auto-simulate to get XDR
    });

    // Get the initial transaction XDR
    const initialTx = result.toXDR();
    
    // Parse the transaction and prepare it with proper footprint and resources
    const transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
    const preparedTransaction = await server.prepareTransaction(transaction);

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Transaction prepared for signing',
        transactionXdr: preparedTransaction.toXDR()
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
    // Create RPC server for transaction preparation
    const server = new SorobanRpc.Server(RPC_URL);

    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress, // Ensure correct source account
    });

    // Build the transaction (simulate to get initial XDR)
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
      simulate: true // Auto-simulate to get XDR
    });

    // Get the initial transaction XDR
    const initialTx = result.toXDR();
    
    // Parse the transaction and prepare it with proper footprint and resources
    const transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
    const preparedTransaction = await server.prepareTransaction(transaction);

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Update transaction prepared for signing',
        transactionXdr: preparedTransaction.toXDR()
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

    console.log('Raw contract result for balances:', safeStringify(result.result));

    // ✅ Handle the Map<Address, i128> properly, converting BigInt to string
    const balancesWithStrings: { [key: string]: string } = {};
    
    console.log('Processing result.result:', safeStringify(result.result));
    console.log('Type of result.result:', typeof result.result);
    
    if (result.result && typeof result.result === 'object') {
      console.log('Object.entries(result.result):', Object.entries(result.result));
      
      // Handle different formats that the Stellar SDK might return
      for (const [key, value] of Object.entries(result.result)) {
        console.log(`Processing entry: key="${key}", value="${value}", value type=${typeof value}`);
        
        if (Array.isArray(value) && value.length === 2) {
          // Handle format: [[tokenAddress, balance]] where value is [tokenAddress, balance]
          console.log('Detected array format with [tokenAddress, balance]');
          const [tokenAddress, balance] = value;
          console.log(`Extracted from array: tokenAddress="${tokenAddress}", balance="${balance}", balance type=${typeof balance}`);
          
          // Convert balance to string (handle BigInt)
          let balanceStr = '';
          if (typeof balance === 'bigint') {
            balanceStr = balance.toString();
          } else if (typeof balance === 'number') {
            balanceStr = balance.toString();
          } else {
            balanceStr = String(balance);
          }
          
          console.log(`Setting balance from array: ${tokenAddress} = ${balanceStr}`);
          balancesWithStrings[tokenAddress] = balanceStr;
          
        } else if (typeof value === 'string' && value.includes(',')) {
          // Handle format: {0: 'CDLZ...,1070000000'}
          console.log('Detected comma-separated string format');
          const [tokenAddress, balance] = value.split(',');
          if (tokenAddress && balance) {
            console.log(`Extracted from string: tokenAddress="${tokenAddress}", balance="${balance}"`);
            balancesWithStrings[tokenAddress] = balance;
          }
        } else {
          // Handle normal Map format where key is token address and value is BigInt/number
          console.log('Detected normal Map format');
          let balanceStr = '';
          if (typeof value === 'bigint') {
            balanceStr = value.toString();
          } else if (typeof value === 'number') {
            balanceStr = value.toString();
          } else if (typeof value === 'string') {
            balanceStr = value;
          } else {
            // Try to convert whatever it is to string
            balanceStr = String(value);
          }
          
          console.log(`Setting balance from normal format: ${key} = ${balanceStr}`);
          balancesWithStrings[key] = balanceStr;
        }
      }
    }

    console.log('Processed balances:', balancesWithStrings);

    // Calculate total portfolio value (simplified - using 1:1 ratio for demo)
    let totalValue = 0;
    console.log('Starting portfolio calculation with balances:', balancesWithStrings);
    
    for (const [tokenAddress, balance] of Object.entries(balancesWithStrings)) {
      try {
        console.log(`Processing token ${tokenAddress} with balance string: "${balance}"`);
        
        // Convert from stroops (7 decimal places for XLM/tokens)
        const balanceValue = parseFloat(balance) / 10000000;
        console.log(`Token ${tokenAddress}: balance=${balance}, converted=${balanceValue}`);
        
        if (!isNaN(balanceValue) && balanceValue > 0) {
          totalValue += balanceValue;
          console.log(`Added ${balanceValue} to total. New total: ${totalValue}`);
        } else {
          console.log(`Skipping token ${tokenAddress} - invalid balance: ${balanceValue}`);
        }
      } catch (e) {
        console.warn(`Failed to parse balance for ${tokenAddress}: ${balance}`, e);
      }
    }

    console.log('Final calculated portfolio value:', totalValue);

    return NextResponse.json({
      success: true,
      data: {
        message: 'User balances fetched successfully!',
        balances: balancesWithStrings,
        portfolioValue: isNaN(totalValue) ? '0.00' : totalValue.toFixed(2)
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

async function checkUserInitialized(userAddress: string): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    // Try to get user config - if it throws, user is not initialized
    const result = await client.get_user_config({
      user: userAddress
    }, {
      simulate: true
    });

    return NextResponse.json({
      success: true,
      data: {
        isInitialized: true,
        message: 'User is initialized'
      }
    });

  } catch (error) {
    // If we get an error, the user is likely not initialized
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not initialized') || errorMessage.includes('not found')) {
      return NextResponse.json({
        success: true,
        data: {
          isInitialized: false,
          message: 'User not initialized'
        }
      });
    }

    // Other errors
    return NextResponse.json({
      success: false,
      error: `Error checking user initialization: ${errorMessage}`
    });
  }
}

async function depositUserFunds(
  userAddress: string,
  tokenAddress: string,
  amount: string,
  isNative: boolean = true,
  assetCode?: string
): Promise<NextResponse> {
  try {
    console.log('Starting deposit preparation:', {
      userAddress,
      amount,
      isNative,
      tokenAddress,
      assetCode
    });

    // Create RPC server for transaction preparation
    const server = new SorobanRpc.Server(RPC_URL);

    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    // Use proper token contract address
    let finalTokenAddress: string;
    if (isNative) {
      const nativeAsset = Asset.native();
      finalTokenAddress = nativeAsset.contractId(Networks.TESTNET);
      console.log('Using native XLM contract address:', finalTokenAddress);
    } else {
      // For non-native assets like USDC, we need to convert to Stellar Asset Contract (SAC) address
      try {
        // Use the provided asset code or infer from common tokens
        let code = assetCode || 'USDC'; // Default to USDC if not specified
        
        // Map known issuer addresses to asset codes
        const knownAssets: { [key: string]: string } = {
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': 'USDC',
          'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU': 'USDC', // Old address
          'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': 'EURC', // New EURC address
          'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGX47OAFQNI3OOQKAIJE22LZRY': 'EUROC' // Old EUROC address
        };
        
        if (knownAssets[tokenAddress]) {
          code = knownAssets[tokenAddress];
        }
        
        console.log(`Creating asset with code: ${code}, issuer: ${tokenAddress}`);
        const asset = new Asset(code, tokenAddress);
        finalTokenAddress = asset.contractId(Networks.TESTNET);
        console.log('Using asset contract address for', code + ':', finalTokenAddress);
        console.log('Original issuer address:', tokenAddress);
      } catch (assetError) {
        console.error('Error creating asset contract:', assetError);
        // Fallback - use the address as-is (might be a direct contract address)
        finalTokenAddress = tokenAddress;
        console.log('Using direct contract address as fallback:', finalTokenAddress);
      }
    }

    console.log('Calling client.deposit_user_funds with:', {
      user: userAddress,
      token_address: finalTokenAddress,
      amount: amount
    });

    // Build the transaction (simulate to get initial XDR)
    const result = await client.deposit_user_funds({
      user: userAddress,
      token_address: finalTokenAddress,
      amount: BigInt(amount)
    }, {
      simulate: true
    });

    console.log('Client call successful, got result');

    // Get the initial transaction XDR
    const initialTx = result.toXDR();
    console.log('Initial transaction XDR length:', initialTx.length);
    
    // Parse the transaction and prepare it with proper footprint and resources
    let transaction, preparedTransaction;
    
    try {
      transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
      console.log('Successfully parsed initial transaction');
    } catch (parseError) {
      console.error('Error parsing initial transaction XDR:', parseError);
      throw new Error(`Failed to parse initial transaction: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    try {
      preparedTransaction = await server.prepareTransaction(transaction);
      console.log('Successfully prepared transaction');
    } catch (prepareError) {
      console.error('Error preparing transaction:', prepareError);
      throw new Error(`Failed to prepare transaction: ${prepareError instanceof Error ? prepareError.message : 'Unknown error'}`);
    }

    const finalXdr = preparedTransaction.toXDR();
    console.log('Final deposit transaction XDR length:', finalXdr.length);

    // Validate the XDR we're about to send
    try {
      console.log('Validating prepared deposit XDR...');
      const testParse = TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET);
      console.log('Deposit XDR validation successful - can be parsed correctly');
      
      // Log XDR structure for debugging
      console.log('Prepared deposit XDR first 200 chars:', finalXdr.substring(0, 200));
      console.log('Prepared deposit XDR details:', {
        fee: testParse.fee,
        operationsCount: testParse.operations.length,
        networkPassphrase: testParse.networkPassphrase
      });
      
    } catch (validateError) {
      console.error('CRITICAL: Prepared deposit XDR is invalid!', validateError);
      throw new Error(`Generated invalid deposit XDR: ${validateError instanceof Error ? validateError.message : 'Unknown validation error'}`);
    }

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Deposit transaction prepared for signing',
        transactionXdr: finalXdr
      }
    });

  } catch (error) {
    console.error('Error preparing deposit transaction:', error);
    
    // Provide more specific error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('MissingValue') || errorMessage.includes('contract instance')) {
      return NextResponse.json({
        success: false,
        error: 'Native XLM Stellar Asset Contract needs to be deployed. Please deploy the SAC first or contact support.',
        details: {
          suggestion: 'The native XLM Stellar Asset Contract (SAC) has not been deployed on this network. This is required for token transfers.',
          nativeContractAddress: Asset.native().contractId(Networks.TESTNET)
        }
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// Similarly update withdrawUserFunds (assuming similar structure)
async function withdrawUserFunds(
  userAddress: string,
  tokenAddress: string,
  amount: string,
  isNative: boolean = true,
  assetCode?: string
): Promise<NextResponse> {
  try {
    console.log('Starting withdraw preparation:', {
      userAddress,
      amount,
      isNative,
      tokenAddress
    });

    // Create RPC server for transaction preparation
    const server = new SorobanRpc.Server(RPC_URL);

    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    // Use proper token contract address
    let finalTokenAddress: string;
    if (isNative) {
      const nativeAsset = Asset.native();
      finalTokenAddress = nativeAsset.contractId(Networks.TESTNET);
      console.log('Using native XLM contract address for withdrawal:', finalTokenAddress);
    } else {
      // For non-native assets like USDC, we need to convert to Stellar Asset Contract (SAC) address
      try {
        // Use the provided asset code or infer from common tokens
        let code = assetCode || 'USDC'; // Default to USDC if not specified
        
        // Map known issuer addresses to asset codes
        const knownAssets: { [key: string]: string } = {
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': 'USDC',
          'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU': 'USDC', // Old address
          'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': 'EURC', // New EURC address
          'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGX47OAFQNI3OOQKAIJE22LZRY': 'EUROC' // Old EUROC address
        };
        
        if (knownAssets[tokenAddress]) {
          code = knownAssets[tokenAddress];
        }
        
        console.log(`Creating asset for withdrawal with code: ${code}, issuer: ${tokenAddress}`);
        const asset = new Asset(code, tokenAddress);
        finalTokenAddress = asset.contractId(Networks.TESTNET);
        console.log('Using asset contract address for', code, 'withdrawal:', finalTokenAddress);
        console.log('Original issuer address:', tokenAddress);
      } catch (assetError) {
        console.error('Error creating asset contract for withdrawal:', assetError);
        // Fallback - use the address as-is (might be a direct contract address)
        finalTokenAddress = tokenAddress;
        console.log('Using direct contract address as fallback for withdrawal:', finalTokenAddress);
      }
    }

    console.log('Calling client.withdraw_user_funds with:', {
      user: userAddress,
      token_address: finalTokenAddress,
      amount: amount
    });

    // Build the transaction (simulate to get initial XDR)
    const result = await client.withdraw_user_funds({
      user: userAddress,
      token_address: finalTokenAddress,
      amount: BigInt(amount)
    }, {
      simulate: true
    });

    console.log('Client call successful, got result');

    // Get the initial transaction XDR
    const initialTx = result.toXDR();
    console.log('Initial transaction XDR length:', initialTx.length);
    
    // Parse the transaction and prepare it with proper footprint and resources
    let transaction, preparedTransaction;
    
    try {
      transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
      console.log('Successfully parsed initial transaction');
    } catch (parseError) {
      console.error('Error parsing initial transaction XDR:', parseError);
      throw new Error(`Failed to parse initial transaction: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    try {
      preparedTransaction = await server.prepareTransaction(transaction);
      console.log('Successfully prepared transaction');
    } catch (prepareError) {
      console.error('Error preparing transaction:', prepareError);
      throw new Error(`Failed to prepare transaction: ${prepareError instanceof Error ? prepareError.message : 'Unknown error'}`);
    }

    const finalXdr = preparedTransaction.toXDR();
    console.log('Final withdraw transaction XDR length:', finalXdr.length);

    // Validate the XDR we're about to send
    try {
      console.log('Validating prepared withdraw XDR...');
      const testParse = TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET);
      console.log('Withdraw XDR validation successful - can be parsed correctly');
      
      // Log XDR structure for debugging
      console.log('Prepared withdraw XDR first 200 chars:', finalXdr.substring(0, 200));
      console.log('Prepared withdraw XDR details:', {
        fee: testParse.fee,
        operationsCount: testParse.operations.length,
        networkPassphrase: testParse.networkPassphrase
      });
      
    } catch (validateError) {
      console.error('CRITICAL: Prepared withdraw XDR is invalid!', validateError);
      throw new Error(`Generated invalid withdraw XDR: ${validateError instanceof Error ? validateError.message : 'Unknown validation error'}`);
    }

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Withdrawal transaction prepared for signing',
        transactionXdr: finalXdr
      }
    });

  } catch (error) {
    console.error('Error preparing withdrawal transaction:', error);
    
    // Provide more specific error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('MissingValue') || errorMessage.includes('contract instance')) {
      return NextResponse.json({
        success: false,
        error: 'Native XLM Stellar Asset Contract needs to be deployed. Please deploy the SAC first or contact support.',
        details: {
          suggestion: 'The native XLM Stellar Asset Contract (SAC) has not been deployed on this network. This is required for token transfers.',
          nativeContractAddress: Asset.native().contractId(Networks.TESTNET)
        }
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}


