// api/contract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../bindings/src'; 
import { Networks } from '@stellar/stellar-sdk';
import { SorobanRpc, Address as StellarAddress,TransactionBuilder,Asset } from '@stellar/stellar-sdk';

// ✅ Helper to safely stringify objects with BigInt values
const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'CCKGFSM4JTAD2DULINQVO4YVUJVO6OJS7AMRS56DZMERF5W2LCD5GVYD';
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
      if (!userAddress) {
        return NextResponse.json({ success: false, error: 'User address required for getting balances' }, { status: 400 });
      }
      return await getUserBalances(userAddress);
    }

    if (action === 'get_user_performance_metrics') {
      if (!userAddress) {
        return NextResponse.json({ success: false, error: 'User address required for performance metrics' }, { status: 400 });
      }
      const { days = 30 } = params; // Default to 30 days if not specified
      return await getUserPerformanceMetrics(userAddress, days);
    }

    if (action === 'get_pairs') {
      return await getPairs()
    }

    if (action === 'get_performance_metrics') {
      const { days = 30 } = params; // Default to 30 days if not specified
      return await getBotPerformanceMetrics(days);
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

    // ✅ Format the trade history data with proper price normalization
    const formattedTrades = result.result.map((trade: any) => ({
      executed_amount: normalizeOraclePrice(trade.executed_amount?.toString() || '0', 7),
      actual_profit: normalizeOraclePrice(trade.actual_profit?.toString() || '0', 7),
      gas_cost: normalizeOraclePrice(trade.gas_cost?.toString() || '0', 7),
      execution_timestamp: trade.execution_timestamp?.toString(),
      status: trade.status,
      opportunity: {
        pair: trade.opportunity.pair,
        stablecoin_price: normalizeOraclePrice(trade.opportunity.stablecoin_price?.toString() || '0', 7),
        fiat_rate: normalizeOraclePrice(trade.opportunity.fiat_rate?.toString() || '0', 7),
        deviation_bps: trade.opportunity.deviation_bps,
        estimated_profit: normalizeOraclePrice(trade.opportunity.estimated_profit?.toString() || '0', 7),
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

    // ✅ Fetch USD prices for all tokens using oracle
    const tokenPrices: { [key: string]: number } = {};
    const balancesWithUsdValues: { [key: string]: { balance: string, usdValue: number, price: number } } = {};
    
    console.log('Fetching USD prices for tokens...');
    
    for (const [tokenAddress, balance] of Object.entries(balancesWithStrings)) {
      try {
        let usdPrice = 0;
        const balanceValue = parseFloat(normalizeOraclePrice(balance, 7)); // Use proper normalization
        
        // Get token symbol for oracle lookup
        const tokenInfo = getTokenSymbolForOracle(tokenAddress);
        
        if (tokenInfo.symbol !== 'Unknown') {
          console.log(`Fetching price for ${tokenInfo.symbol} (${tokenAddress})`);
          usdPrice = await fetchTokenUsdPrice(tokenInfo.symbol, tokenAddress);
        }
        
        const usdValue = balanceValue * usdPrice;
        
        tokenPrices[tokenAddress] = usdPrice;
        balancesWithUsdValues[tokenAddress] = {
          balance: normalizeOraclePrice(balance, 7), // Store normalized balance for display
          usdValue: usdValue,
          price: usdPrice
        };
        
        console.log(`Token ${tokenInfo.symbol}: balance=${balanceValue.toFixed(4)}, price=$${usdPrice.toFixed(6)}, value=$${usdValue.toFixed(2)}`);
        
      } catch (priceError) {
        console.warn(`Failed to fetch price for ${tokenAddress}:`, priceError);
        const balanceValue = parseFloat(normalizeOraclePrice(balance, 7)); // Use proper normalization
        
        // Fallback: assume $1 for stablecoins, dynamic for others
        let fallbackPrice = 1; // Default for USDC/EURC
        if (tokenAddress.includes('CDLZFC3S')) fallbackPrice = 0.1; // XLM fallback
        
        tokenPrices[tokenAddress] = fallbackPrice;
        balancesWithUsdValues[tokenAddress] = {
          balance: normalizeOraclePrice(balance, 7), // Store normalized balance for display
          usdValue: balanceValue * fallbackPrice,
          price: fallbackPrice
        };
      }
    }

    // Calculate total portfolio value in USD
    let totalUsdValue = 0;
    for (const [tokenAddress, data] of Object.entries(balancesWithUsdValues)) {
      totalUsdValue += data.usdValue;
    }

    console.log('Final calculated portfolio USD value:', totalUsdValue);

    return NextResponse.json({
      success: true,
      data: {
        message: 'User balances with USD prices fetched successfully!',
        balances: balancesWithStrings, // Keep original for compatibility
        balancesWithPrices: balancesWithUsdValues,
        tokenPrices: tokenPrices,
        portfolioValue: totalUsdValue.toFixed(2)
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

// Helper function to get token symbol for oracle lookup
function getTokenSymbolForOracle(tokenAddress: string): { symbol: string, name: string } {
  const tokenMap: { [key: string]: { symbol: string, name: string } } = {
    // Native
    'native': { symbol: 'XLM', name: 'Stellar Lumens' },
    
    // SAC addresses (updated with user's actual addresses)
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGCN6FM': { symbol: 'XLM', name: 'Stellar Lumens' }, // Old mapping
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC': { symbol: 'XLM', name: 'Stellar Lumens' }, // Correct XLM address
    'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': { symbol: 'USDC', name: 'USD Coin' },
    'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ': { symbol: 'EURC', name: 'Euro Coin' },
    
    // Issuer addresses
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': { symbol: 'USDC', name: 'USD Coin' },
    'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': { symbol: 'EURC', name: 'Euro Coin' },
  };
  
  return tokenMap[tokenAddress] || { symbol: 'Unknown', name: 'Unknown Token' };
}

// Helper function to fetch USD price from oracle using x_last_price
async function fetchTokenUsdPrice(tokenSymbol: string, tokenAddress: string): Promise<number> {
  try {
    // Oracle addresses from the contract
    const CRYPTO_ORACLE_TESTNET = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";
    const FOREX_ORACLE_TESTNET = "CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W";
    
    // For now, use fallback prices until oracle integration is fully working
    const prices: { [key: string]: number } = {
      'XLM': 0.12, // Current approximate XLM price
      'USDC': 1.0, // USDC is stable
      'EURC': 1.08, // EUR/USD approximate rate
    };
    
    console.log(`Using fallback price for ${tokenSymbol}: $${prices[tokenSymbol] || 0}`);
    return prices[tokenSymbol] || 0;

  } catch (error) {
    console.error(`Error fetching price for ${tokenSymbol}:`, error);
    
    // Fallback prices
    const fallbackPrices: { [key: string]: number } = {
      'XLM': 0.12,
      'USDC': 1.0,
      'EURC': 1.08,
    };
    
    return fallbackPrices[tokenSymbol] || 0;
  }
}

async function getUserPerformanceMetrics(userAddress: string, days: number = 30): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const result = await client.get_user_performance_metrics({
      user: userAddress,
      days: days
    }, {
      simulate: true
    });

    console.log('Raw performance metrics result:', safeStringify(result.result));

    // Format the performance metrics data with proper price normalization
    const metrics = {
      total_trades: result.result.total_trades || 0,
      successful_trades: result.result.successful_trades || 0,
      total_profit: normalizeOraclePrice(result.result.total_profit?.toString() || '0', 7),
      total_volume: normalizeOraclePrice(result.result.total_volume?.toString() || '0', 7),
      success_rate_bps: result.result.success_rate_bps || 0,
      avg_profit_per_trade: normalizeOraclePrice(result.result.avg_profit_per_trade?.toString() || '0', 7),
      period_days: result.result.period_days || days,
      // Calculate additional derived metrics
      success_rate: result.result.success_rate_bps ? (result.result.success_rate_bps / 100).toFixed(2) : '0.00',
      win_rate: result.result.total_trades > 0 ? ((result.result.successful_trades / result.result.total_trades) * 100).toFixed(2) : '0.00'
    };

    return NextResponse.json({
      success: true,
      data: {
        message: 'User performance metrics fetched successfully!',
        metrics: metrics
      }
    });

  } catch (error) {
    console.error('Error fetching user performance metrics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user performance metrics'
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
          'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': 'EURC',  
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

async function getPairs(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const result = await client.get_pairs({
      simulate: true
    });

    // Format the pairs data for frontend consumption
    const formattedPairs = result.result.map((pair: any) => ({
      stablecoin_symbol: pair.stablecoin_symbol,
      fiat_symbol: pair.fiat_symbol,
      stablecoin_address: pair.stablecoin_address,
      target_peg: pair.target_peg?.toString(),
      deviation_threshold_bps: pair.deviation_threshold_bps
    }));

    console.log('✅ Pairs fetched successfully:', safeStringify(formattedPairs));

    return NextResponse.json({
      success: true,
      data: {
        message: 'Pairs fetched successfully!',
        pairs: formattedPairs,
        count: formattedPairs.length
      }
    });

  } catch (error) {
    console.error('Error fetching pairs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pairs'
    });
  }
}


async function getBotPerformanceMetrics(days: number = 30): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const result = await client.get_performance_metrics({
      days: days
    }, {
      simulate: true
    });

    console.log('Raw bot performance metrics result:', safeStringify(result.result));

    // Format the bot performance metrics data and handle BigInt serialization
    const metrics = {
      total_trades: result.result.total_trades || 0,
      successful_trades: result.result.successful_trades || 0,
      total_profit: result.result.total_profit?.toString() || '0',
      total_volume: result.result.total_volume?.toString() || '0',
      success_rate_bps: result.result.success_rate_bps || 0,
      avg_profit_per_trade: result.result.avg_profit_per_trade?.toString() || '0',
      period_days: result.result.period_days || days,
      success_rate: result.result.success_rate_bps ? (result.result.success_rate_bps / 100).toFixed(2) : '0.00',
      win_rate: result.result.total_trades > 0 ? ((result.result.successful_trades / result.result.total_trades) * 100).toFixed(2) : '0.00'
    };

    return NextResponse.json({
      success: true,
      data: {
        message: 'Bot performance metrics fetched successfully!',
        metrics: metrics
      }
    });

  } catch (error) {
    console.error('Error fetching bot performance metrics:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch bot performance metrics'
    });
  }
}

// Helper function to normalize oracle prices
function normalizeOraclePrice(rawPrice: string | bigint, decimals: number = 7): string {
  const priceNum = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);
  if (priceNum === 0 || isNaN(priceNum)) return '0.000000';
  
  const normalizedPrice = priceNum / Math.pow(10, decimals);
  return normalizedPrice.toFixed(6); // Show up to 6 decimal places for precision
}

// Helper function to estimate gas cost (mirrors dex.rs estimate_gas_cost)
function estimateGasCostFromContract(complexityScore: number): bigint {
  const baseCost = BigInt(100000);
  const variableCost = BigInt(complexityScore) * BigInt(2500);
  
  // Simulate network multiplier (use a reasonable default)
  const networkMultiplier = BigInt(120); // 1.2x multiplier
  
  return ((baseCost + variableCost) * networkMultiplier) / BigInt(100);
}

async function scanOpportunities(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    console.log('=== CALLING SCAN_OPPORTUNITIES FUNCTION ===')
    
    const result = await client.scan_opportunities({
      simulate: true
    });

    console.log('=== RAW SCAN_OPPORTUNITIES OUTPUT ===')
    console.log('Raw opportunities result:', safeStringify(result.result));
    console.log('Result type:', typeof result.result)
    console.log('Is array:', Array.isArray(result.result))
    console.log('Length:', result.result?.length || 'N/A')

    // Check if result is an array of opportunities
    const opportunities = Array.isArray(result.result) ? result.result : [];

    // Format the opportunities data with proper price normalization
    const formattedOpportunities = opportunities.map((opportunity: any) => {
      const rawStablecoinPrice = opportunity.stablecoin_price?.toString() || '0';
      const rawFiatRate = opportunity.fiat_rate?.toString() || '0';
      const rawEstimatedProfit = opportunity.estimated_profit?.toString() || '0';

      console.log(`Raw prices for ${opportunity.pair?.stablecoin_symbol}:`, {
        stablecoin_price: rawStablecoinPrice,
        fiat_rate: rawFiatRate,
        estimated_profit: rawEstimatedProfit
      });

      return {
        pair: {
          stablecoin_symbol: opportunity.pair?.stablecoin_symbol || 'Unknown',
          stablecoin_address: opportunity.pair?.stablecoin_address || '',
          fiat_symbol: opportunity.pair?.fiat_symbol || 'Unknown'
        },
        stablecoin_price: normalizeOraclePrice(rawStablecoinPrice, 7),
        fiat_rate: normalizeOraclePrice(rawFiatRate, 7),
        deviation_bps: opportunity.deviation_bps || 0,
        estimated_profit: normalizeOraclePrice(rawEstimatedProfit, 7),
        trade_direction: opportunity.trade_direction || 'hold',
        timestamp: opportunity.timestamp?.toString() || Date.now().toString()
      };
    });

    console.log('=== FORMATTED OPPORTUNITIES OUTPUT ===')
    console.log('Formatted opportunities count:', formattedOpportunities.length)
    console.log('Formatted opportunities:', JSON.stringify(formattedOpportunities, null, 2))

    return NextResponse.json({
      success: true,
      data: {
        message: 'Basic opportunities scanned successfully!',
        opportunities: formattedOpportunities,
        count: formattedOpportunities.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error scanning opportunities:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan opportunities'
    });
  }
}

