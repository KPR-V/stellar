import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../bindings/src'; 
import { Address, Networks } from '@stellar/stellar-sdk';
import { SorobanRpc, Address as StellarAddress,TransactionBuilder,Asset, scValToNative, nativeToScVal, xdr,Contract, // ✅ Import Contract class
  Operation   } from '@stellar/stellar-sdk';

// ✅ Helper to safely stringify objects with BigInt values
const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'CBNTCMYVDM7PSXU56QKYH6NG772ETOERFVHCA4SMF4JEO6VG7CXDH3AX';
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
      const { days = 30 } = params; 
      return await getUserPerformanceMetrics(userAddress, days);
    }

    if (action === 'get_pairs') {
      return await getPairs()
    }

    if (action === 'get_performance_metrics') {
      const { days = 30 } = params; 
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

    if (action === 'scan_advanced_opportunities') {
      return await scanAdvancedOpportunities();
    }

    if (action === 'execute_user_arbitrage') {
      return await executeUserArbitrage(userAddress, params.tradeAmount, params.opportunity, params.venueAddress);
    }
    if (action === 'approve_router_spending') {
      return await approveRouterSpending(
        userAddress, 
        params.tokenAddress, 
        params.amount,
        params.routerAddress
      );
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
    const server = new SorobanRpc.Server(RPC_URL);
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress
    });

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
      simulate: true
    });

    const initialTx = result.toXDR();
    
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

    const result = await client.get_user_config({user: userAddress}, {simulate: true});

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
    const server = new SorobanRpc.Server(RPC_URL);
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress, 
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
    }, {simulate: true});

    const initialTx = result.toXDR();
    const transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
    const preparedTransaction = await server.prepareTransaction(transaction);

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Update transaction prepared for signing',
        transactionXdr: preparedTransaction.toXDR()
      }});

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
    }, {simulate: true});

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

    const result = await client.get_user_balances({user: userAddress}, {simulate: true});
    console.log('Raw contract result for balances:', safeStringify(result.result));
    const balancesWithStrings: { [key: string]: string } = {};
        
    if (result.result && typeof result.result === 'object') {
      console.log('Object.entries(result.result):', Object.entries(result.result));
            for (const [key, value] of Object.entries(result.result)) {
            console.log(`Processing entry: key="${key}", value="${value}", value type=${typeof value}`);
        
        if (Array.isArray(value) && value.length === 2) {
          console.log('Detected array format with [tokenAddress, balance]');
          const [tokenAddress, balance] = value;
          console.log(`Extracted from array: tokenAddress="${tokenAddress}", balance="${balance}", balance type=${typeof balance}`);
          
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
          const [tokenAddress, balance] = value.split(',');
          if (tokenAddress && balance) {
            console.log(`Extracted from string: tokenAddress="${tokenAddress}", balance="${balance}"`);
            balancesWithStrings[tokenAddress] = balance;
          }
        } else {
          console.log('Detected normal Map format');
          let balanceStr = '';
          if (typeof value === 'bigint') {
            balanceStr = value.toString();
          } else if (typeof value === 'number') {
            balanceStr = value.toString();
          } else if (typeof value === 'string') {
            balanceStr = value;
          } else {
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
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC': { symbol: 'XLM', name: 'Stellar Lumens' }, // Correct XLM address
    'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': { symbol: 'USDC', name: 'USD Coin' }, // USDC contract address
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': { symbol: 'USDC', name: 'USD Coin' }, // USDC issuer address
    'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': { symbol: 'EURC', name: 'Euro Coin' },
      };
  
  return tokenMap[tokenAddress] || { symbol: 'Unknown', name: 'Unknown Token' };
}

// Helper function to get real USD prices from Stellar reflector oracles
async function getRealUsdPrice(tokenSymbol: string): Promise<number> {
  try {
    console.log(`🔍 Fetching price from reflector oracle for ${tokenSymbol}...`);
    
    if (tokenSymbol === 'USDC') {
      return 1.0; // USDC is pegged to $1 USD
    }
    
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    // Oracle addresses from the contract constants
    const CRYPTO_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63';
    const FOREX_ORACLE = 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W';
    const STELLAR_ORACLE = 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP';

    if (tokenSymbol === 'XLM') {
      // Get XLM price from crypto oracle
      try {
        const result = await client.debug_test_oracle({
          oracle_address: CRYPTO_ORACLE,
          symbol: 'XLM',
          asset_type: { tag: 'Symbol', values: undefined }
        }, {
          simulate: true
        });

        if (result.result && result.result.price) {
          const price = normalizeOraclePrice(result.result.price.toString(), 7);
          const priceNum = parseFloat(price);
          
          if (priceNum > 0.01 && priceNum < 2.0) { // Sanity check for XLM price
            console.log(`✅ Got XLM price from crypto oracle: $${priceNum}`);
            return priceNum;
          }
        }
      } catch (oracleError) {
        console.warn('Failed to get XLM from crypto oracle:', oracleError);
      }
      
      // Fallback to reasonable XLM price
      console.log('Using fallback XLM price');
      return 0.12;
    }
    
    if (tokenSymbol === 'EURC') {
      // Get EUR/USD rate from forex oracle
      try {
        const result = await client.debug_test_oracle({
          oracle_address: FOREX_ORACLE,
          symbol: 'EUR',
          asset_type: { tag: 'Symbol', values: undefined }
        }, {
          simulate: true
        });

        if (result.result && result.result.price) {
          const rate = normalizeOraclePrice(result.result.price.toString(), 7);
          const rateNum = parseFloat(rate);
          
          if (rateNum > 0.8 && rateNum < 1.5) { // Sanity check for EUR/USD rate
            console.log(`✅ Got EUR/USD rate from forex oracle: $${rateNum}`);
            return rateNum;
          }
        }
      } catch (oracleError) {
        console.warn('Failed to get EUR/USD from forex oracle:', oracleError);
      }
      
      // Fallback to reasonable EUR/USD rate
      console.log('Using fallback EUR/USD rate');
      return 1.1;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error fetching price from oracle for ${tokenSymbol}:`, error);
    
    // Fallback to reasonable default prices
    if (tokenSymbol === 'USDC') return 1.0;
    if (tokenSymbol === 'XLM') return 0.12;
    if (tokenSymbol === 'EURC') return 1.1;
    return 0;
  }
}

// Helper function to fetch USD price - now uses reflector oracles instead of external APIs
async function fetchTokenUsdPrice(tokenSymbol: string, tokenAddress: string): Promise<number> {
  try {
    console.log(`🔍 Fetching price using reflector oracles for ${tokenSymbol}...`);
    
    // Use reflector oracles for real-time price data
    const oraclePrice = await getRealUsdPrice(tokenSymbol);
    
    if (oraclePrice > 0) {
      console.log(`✅ Got price from reflector oracle for ${tokenSymbol}: $${oraclePrice}`);
      return oraclePrice;
    }
    
    console.log(`⚠️ No oracle price found for ${tokenSymbol}, trying contract opportunities...`);

    // Fallback to contract opportunities scan if oracle fails
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const opportunities = await client.scan_advanced_opportunities({
      simulate: true
    });

    console.log(`Got ${opportunities.result?.length || 0} opportunities from scan`);

    // Only use opportunity prices if they make sense (avoid the inflated values)
    if (opportunities.result && Array.isArray(opportunities.result)) {
      for (const opp of opportunities.result) {
        if (opp.base_opportunity?.pair) {
          const pair = opp.base_opportunity.pair;
          
          // Check if this opportunity has the token we're looking for
          let priceData: { price: string, symbol: string } | null = null;
          
          if (pair.base_asset_symbol === tokenSymbol) {
            priceData = {
              price: opp.base_opportunity.stablecoin_price.toString(),
              symbol: tokenSymbol
            };
          } else if (pair.quote_asset_symbol === tokenSymbol || 
                    (tokenSymbol === 'EURC' && pair.quote_asset_symbol === 'EUR')) {
            priceData = {
              price: opp.base_opportunity.fiat_rate.toString(),
              symbol: tokenSymbol === 'EURC' ? 'EUR' : tokenSymbol
            };
          }
          
          if (priceData) {
            const normalizedPrice = parseFloat(normalizeOraclePrice(priceData.price, 7));
            // Only use opportunity price if it's reasonable (not inflated)
            if (tokenSymbol === 'XLM' && normalizedPrice > 0.01 && normalizedPrice < 2.0) {
              console.log(`✅ Using reasonable opportunity price for ${tokenSymbol}: $${normalizedPrice.toFixed(6)}`);
              return normalizedPrice;
            }
            if (tokenSymbol === 'USDC' && normalizedPrice > 0.9 && normalizedPrice < 1.1) {
              console.log(`✅ Using reasonable opportunity price for ${tokenSymbol}: $${normalizedPrice.toFixed(6)}`);
              return normalizedPrice;
            }
            if (tokenSymbol === 'EURC' && normalizedPrice > 0.8 && normalizedPrice < 1.5) {
              console.log(`✅ Using reasonable opportunity price for ${tokenSymbol}: $${normalizedPrice.toFixed(6)}`);
              return normalizedPrice;
            }
            console.log(`❌ Opportunity price for ${tokenSymbol} seems unreasonable: $${normalizedPrice}, using oracle fallback`);
          }
        }
      }
    }

    // Final fallback to oracle prices
    const fallbackPrice = await getRealUsdPrice(tokenSymbol);
    console.log(`🔄 Using oracle fallback for ${tokenSymbol}: $${fallbackPrice}`);
    return fallbackPrice;

  } catch (error) {
    console.error(`❌ Error fetching price for ${tokenSymbol}:`, error);
    
    // Final fallback to default oracle prices
    const finalFallback = await getRealUsdPrice(tokenSymbol);
    console.log(`🔄 Using final oracle fallback for ${tokenSymbol}: $${finalFallback}`);
    return finalFallback;
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
          'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': 'EURC', // New EURC address
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

// Helper function to parse Stellar Contract Values (SCV)
function parseScvValue(scvData: any): any {
  if (!scvData || !scvData._switch) {
    console.log('parseScvValue: No scvData or _switch found');
    return null;
  }


  switch (scvData._switch.name) {
    case 'scvVec':
      return scvData._value ? scvData._value.map((item: any, index: number) => {
        return parseScvValue(item);
      }) : [];
    
    case 'scvMap':
      const result: any = {};
      if (scvData._value) {
        scvData._value.forEach((entry: any, index: number) => {
          const key = parseScvValue(entry._attributes.key);
          const val = parseScvValue(entry._attributes.val);
          if (key !== null) {
            result[key] = val;
          }
        });
      }
      return result;
    
    case 'scvSymbol':
      if (scvData._value && scvData._value.data) {
        const symbol = Buffer.from(scvData._value.data).toString('utf8');
        return symbol;
      }
      return scvData._value || null;
    
    case 'scvU32':
      return scvData._value || 0;
    
    case 'scvU64':
      const u64Value = scvData._value ? scvData._value._value || scvData._value : 0;
      return u64Value;
    
    case 'scvI128':
      if (scvData._value && scvData._value._attributes) {
        const hi = BigInt(scvData._value._attributes.hi._value || 0);
        const lo = BigInt(scvData._value._attributes.lo._value || 0);
        const result = (hi * BigInt('18446744073709551616')) + lo; // 2^64
        return result;
      }
      return BigInt(0);
    
    case 'scvBool':
      return scvData._value || false;
    
    case 'scvAddress':
      if (scvData._value) {
        if (scvData._value._switch?.name === 'scAddressTypeContract') {
          const contractId = scvData._value._value;
          if (contractId && contractId.data) {
            // Convert raw bytes to hex string
            const hexData = Buffer.from(contractId.data).toString('hex').toUpperCase();
            const address = `CONTRACT_${hexData}`;
            return address;
          }
        } else if (scvData._value._switch?.name === 'scAddressTypeAccount') {
          const accountId = scvData._value._value;
          if (accountId && accountId._value && accountId._value.data) {
            // Convert raw bytes to hex string
            const hexData = Buffer.from(accountId._value.data).toString('hex').toUpperCase();
            const address = `ACCOUNT_${hexData}`;
            return address;
          }
        }
      }
      console.log('parseScvValue: Unknown address type');
      return 'UNKNOWN_ADDRESS';
    
    default:
      console.warn('parseScvValue: Unknown SCV type:', scvData._switch.name);
      return scvData._value || null;
  }
}

// Helper function to format parsed opportunity data
function formatOpportunityData(opportunity: any): any {
  if (!opportunity || typeof opportunity !== 'object') {
    console.log('formatOpportunityData: opportunity is null, undefined, or not an object');
    return null;
  }

  console.log('formatOpportunityData: processing opportunity keys:', Object.keys(opportunity));

  // Helper function to convert Buffer to string
  const bufferToString = (bufferObj: any): string => {
    console.log('bufferToString input:', typeof bufferObj, bufferObj);
    
    // Handle Node.js Buffer objects directly
    if (Buffer.isBuffer(bufferObj)) {
      const result = bufferObj.toString('utf8');
      console.log('bufferToString converted Buffer directly:', result);
      return result;
    }
    
    // Handle JSON-serialized Buffer objects with {type: 'Buffer', data: [...]}
    if (bufferObj && typeof bufferObj === 'object' && bufferObj.type === 'Buffer' && Array.isArray(bufferObj.data)) {
      const result = Buffer.from(bufferObj.data).toString('utf8');
      console.log('bufferToString converted JSON Buffer:', result);
      return result;
    }
    
    if (typeof bufferObj === 'string') {
      return bufferObj;
    }
    
    console.log('bufferToString fallback:', bufferObj);
    return bufferObj || '';
  };

  try {
    // Based on the actual parsed SCV structure from the logs
    const baseOpp = opportunity.base_opportunity;
    
    if (!baseOpp || typeof baseOpp !== 'object') {
      console.log('formatOpportunityData: no base_opportunity found or invalid type, available keys:', Object.keys(opportunity));
      return null;
    }

    console.log('formatOpportunityData: base_opportunity keys:', Object.keys(baseOpp));
    
    // Get pair data
    const pair = baseOpp.pair;
    if (!pair || typeof pair !== 'object') {
      console.log('formatOpportunityData: no pair found in base_opportunity');
      return null;
    }

    console.log('formatOpportunityData: pair keys:', Object.keys(pair));

    const formatted = {
      base_opportunity: {
        pair: {
          base_asset_symbol: bufferToString(pair.base_asset_symbol || pair.stablecoin_symbol),
          quote_asset_symbol: bufferToString(pair.quote_asset_symbol || pair.fiat_symbol),
          base_asset_address: bufferToString(pair.base_asset_address || pair.stablecoin_address),
          quote_asset_address: bufferToString(pair.quote_asset_address),
          target_peg: normalizeOraclePrice(pair.target_peg || 0, 4),
          deviation_threshold_bps: pair.deviation_threshold_bps || 0
        },
        stablecoin_price: normalizeOraclePrice(baseOpp.stablecoin_price || 0, 7),
        fiat_rate: normalizeOraclePrice(baseOpp.fiat_rate || 0, 7),
        deviation_bps: baseOpp.deviation_bps || 0,
        estimated_profit: normalizeOraclePrice(baseOpp.estimated_profit || 0, 7),
        trade_direction: bufferToString(baseOpp.trade_direction),
        timestamp: typeof baseOpp.timestamp === 'number' ? baseOpp.timestamp : parseInt(baseOpp.timestamp?.toString() || '0')
      },
      twap_price: opportunity.twap_price ? normalizeOraclePrice(opportunity.twap_price, 7) : null,
      confidence_score: opportunity.confidence_score || 0,
      max_trade_size: normalizeOraclePrice(opportunity.max_trade_size || 0, 7),
      venue_recommendations: (opportunity.venue_recommendations || []).map((venue: any) => ({
        address: bufferToString(venue.address),
        name: bufferToString(venue.name),
        enabled: venue.enabled !== undefined ? venue.enabled : false,
        fee_bps: venue.fee_bps || 0,
        liquidity_threshold: normalizeOraclePrice(venue.liquidity_threshold || 0, 7)
      }))
    };

    console.log('formatOpportunityData: successfully formatted opportunity');
    return formatted;
  } catch (error) {
    console.error('formatOpportunityData: Error formatting opportunity data:', error);
    console.error('formatOpportunityData: Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return null;
  }
}



async function scanAdvancedOpportunities(): Promise<NextResponse> {
  try {
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    console.log('Calling scan_advanced_opportunities...');
    
    const assembledTx = await client.scan_advanced_opportunities({
      simulate: true
    });

    console.log('Raw scan_advanced_opportunities result structure:', Object.keys(assembledTx));
    
    let opportunities: any[] = [];

    try {
      // Access the simulation result from the assembled transaction
      if (assembledTx && typeof assembledTx === 'object') {
        console.log('Assembled transaction keys:', Object.keys(assembledTx));
        
        // The result is in the simulation property
        if ((assembledTx as any).simulation && (assembledTx as any).simulation.result) {
          console.log('Found simulation result');
          const simulationResult = (assembledTx as any).simulation.result;
          console.log('Found opportunities from simulation.result:', simulationResult ? 'YES' : 'NO');
          console.log('Simulation result details:', safeStringify(simulationResult));
          
          // Parse the SCV data structure - check retval for the vector
          if (simulationResult && simulationResult.retval && simulationResult.retval._switch?.name === 'scvVec') {
            const rawOpportunities = parseScvValue(simulationResult.retval);
            
            if (rawOpportunities) {
              console.log('Raw opportunities length/keys:', Array.isArray(rawOpportunities) ? rawOpportunities.length : Object.keys(rawOpportunities));
            }
            
            console.log('Parsed raw opportunities:', rawOpportunities?.length || 0);
            
            if (Array.isArray(rawOpportunities)) {              
              // Apply the formatting function to convert from parsed SCV to proper structure
              opportunities = rawOpportunities.map((opp, index) => {
                
                const formatted = formatOpportunityData(opp);
                
                return formatted;
              }).filter(Boolean);
              
              console.log('Successfully formatted opportunities count:', opportunities.length);
              console.log('Filtered out opportunities count:', rawOpportunities.length - opportunities.length);
            } else {
              console.log('rawOpportunities is not an array, type:', typeof rawOpportunities);
            }
          } else {
            console.log('No scvVec found in simulation result retval or simulationResult/retval is null');
            if (simulationResult) {
              console.log('SimulationResult keys:', Object.keys(simulationResult));
              if (simulationResult.retval) {
                console.log('Retval keys:', Object.keys(simulationResult.retval));
                console.log('Retval _switch name:', simulationResult.retval._switch?.name);
              }
            }
          }
        } else {
          console.log('No simulation result found in assembled transaction');
          if ((assembledTx as any).simulation) {
            console.log('Simulation object keys:', Object.keys((assembledTx as any).simulation));
          }
        }
      }
      
      if (opportunities.length === 0) {
        console.log('No opportunities found - this might be normal if no arbitrage opportunities exist');
      }

    } catch (parseError) {
      console.error('Error processing opportunities data:', parseError);
      console.log('Using empty opportunities array due to processing error');
      opportunities = [];
    }

    console.log('Final opportunities count:', opportunities.length);

    return NextResponse.json({
      success: true,
      data: {
        opportunities: opportunities,
        count: opportunities.length,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Error scanning advanced opportunities:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan opportunities'
    }, { status: 500 });
  }
}

async function executeUserArbitrage(
  userAddress: string,
  tradeAmount: string,
  opportunity: any,
  venueAddress: string
): Promise<NextResponse> {
  try {
    console.log('Preparing execute_user_arbitrage transaction for user signing:', {
      user: userAddress,
      tradeAmount: tradeAmount,
    });

    // Create RPC server for transaction preparation
    const server = new SorobanRpc.Server(RPC_URL);
    
    // Initialize the client with user address
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    // Convert trade amount to proper format (scaled by 10^7)
    const scaledTradeAmount = BigInt(Math.floor(parseFloat(tradeAmount) * 1e7));

    // Helper function to safely convert string to BigInt with scaling
    const toBigInt = (value: string | number, scale: number = 1e7): bigint => {
      if (!value || isNaN(parseFloat(value.toString()))) {
        return BigInt(0);
      }
      return BigInt(Math.floor(parseFloat(value.toString()) * scale));
    };

    // Map asset symbols to correct SAC addresses
    const getCorrectAssetAddress = (symbol: string, currentAddress: string): string => {
      if (currentAddress && currentAddress !== "UNKNOWN_ADDRESS" && currentAddress !== "") {
        return currentAddress;
      }

      const symbolToSACAddress: { [key: string]: string } = {
        'XLM': 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        'USDC': 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        'EURC': 'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO'
      };

      const sacAddress = symbolToSACAddress[symbol];
      if (!sacAddress) {
        throw new Error(`Unknown asset symbol: ${symbol}. Please add SAC address mapping.`);
      }

      console.log(`Mapped ${symbol} to SAC address: ${sacAddress}`);
      return sacAddress;
    };

    const baseAssetAddress = getCorrectAssetAddress(
      opportunity.base_opportunity.pair.base_asset_symbol,
      opportunity.base_opportunity.pair.base_asset_address
    );
    
    const quoteAssetAddress = getCorrectAssetAddress(
      opportunity.base_opportunity.pair.quote_asset_symbol,
      opportunity.base_opportunity.pair.quote_asset_address
    );

    // Convert opportunity data to proper contract format
    const contractOpportunity = {
      base_opportunity: {
        pair: {
          base_asset_address: baseAssetAddress,
          base_asset_symbol: opportunity.base_opportunity.pair.base_asset_symbol,
          deviation_threshold_bps: opportunity.base_opportunity.pair.deviation_threshold_bps,
          quote_asset_address: quoteAssetAddress,
          quote_asset_symbol: opportunity.base_opportunity.pair.quote_asset_symbol,
          target_peg: toBigInt(opportunity.base_opportunity.pair.target_peg)
        },
        stablecoin_price: toBigInt(opportunity.base_opportunity.stablecoin_price),
        fiat_rate: toBigInt(opportunity.base_opportunity.fiat_rate),
        deviation_bps: opportunity.base_opportunity.deviation_bps,
        estimated_profit: toBigInt(opportunity.base_opportunity.estimated_profit),
        trade_direction: opportunity.base_opportunity.trade_direction,
        timestamp: opportunity.base_opportunity.timestamp
      },
      confidence_score: opportunity.confidence_score,
      max_trade_size: toBigInt(opportunity.max_trade_size),
      twap_price: opportunity.twap_price ? toBigInt(opportunity.twap_price) : undefined,
      venue_recommendations: opportunity.venue_recommendations.map((venue: any) => ({
        address: venue.address,
        enabled: venue.enabled,
        fee_bps: venue.fee_bps,
        liquidity_threshold: toBigInt(venue.liquidity_threshold, 1),
        name: venue.name
      }))
    };

    console.log('📋 Contract opportunity with correct SAC addresses:', {
      user: userAddress,
      trade_amount: scaledTradeAmount.toString(),
      base_asset_address: baseAssetAddress,
      quote_asset_address: quoteAssetAddress,
      venue_address: venueAddress
    });

    // ✅ FIX: Build transaction without simulation to avoid auth errors
    console.log('Building transaction without simulation (auth errors expected during simulation)...');
    
    const assembledTx = await client.execute_user_arbitrage({
      user: userAddress,
      opportunity: contractOpportunity,
      trade_amount: scaledTradeAmount,
      venue_address: venueAddress
    }, {
      simulate: false  // ✅ Don't simulate to avoid auth errors
    });

    console.log('Client call successful, got assembled transaction');

    // Manually simulate to capture auth errors (expected behavior)
    try {
      await assembledTx.simulate();
    } catch (simulateError) {
      console.log('⚠️ Simulation failed as expected (auth required):', 
        simulateError instanceof Error ? simulateError.message : 'Unknown error');
      // This is expected for auth-required transactions - continue with XDR extraction
    }

    // Get the transaction XDR for user signing
    const initialTx = assembledTx.toXDR();
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
      
      // ✅ Check if this is the expected auth error during preparation
      const errorMessage = prepareError instanceof Error ? prepareError.message : String(prepareError);
      
      if (errorMessage.includes('Error(Auth, InvalidAction)') || errorMessage.includes('require_auth')) {
        console.log('⚠️ Auth error during preparation - this is expected. Transaction will work when user signs it.');
        
        // Return the unprepared transaction - user signing will provide the auth
        return NextResponse.json({
          success: true,
          data: { 
            message: 'Arbitrage transaction prepared for signing (auth will be provided by wallet)',
            transactionXdr: initialTx,  // Use unprepared XDR
            estimatedProfit: opportunity.base_opportunity.estimated_profit,
            authNote: 'Transaction requires user authentication which will be provided when you sign it',
            tradeDetails: {
              amount: scaledTradeAmount.toString(),
              direction: opportunity.base_opportunity.trade_direction,
              baseAsset: opportunity.base_opportunity.pair.base_asset_symbol,
              quoteAsset: opportunity.base_opportunity.pair.quote_asset_symbol,
              venue: venueAddress
            }
          }
        });
      }
      
      throw new Error(`Failed to prepare transaction: ${errorMessage}`);
    }

    const finalXdr = preparedTransaction.toXDR();
    console.log('Final arbitrage transaction XDR length:', finalXdr.length);

    // Calculate estimated fees
    const estimatedFee = preparedTransaction.fee;
    const baseFee = parseInt(preparedTransaction.fee) / 10000000;

    console.log('💰 Transaction prepared for signing:', {
      feeInStroops: estimatedFee,
      feeInXLM: baseFee.toFixed(7),
      tradeAmount: scaledTradeAmount.toString()
    });

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Arbitrage transaction prepared for signing',
        transactionXdr: finalXdr,
        estimatedProfit: opportunity.base_opportunity.estimated_profit,
        transactionFee: {
          stroops: estimatedFee,
          xlm: baseFee.toFixed(7)
        },
        tradeDetails: {
          amount: scaledTradeAmount.toString(),
          direction: opportunity.base_opportunity.trade_direction,
          baseAsset: opportunity.base_opportunity.pair.base_asset_symbol,
          quoteAsset: opportunity.base_opportunity.pair.quote_asset_symbol,
          venue: venueAddress
        }
      }
    });

  } catch (error) {
    console.error('❌ Error preparing arbitrage transaction:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: {
        message: 'Failed to prepare arbitrage transaction. See error details.',
        errorName: error instanceof Error ? error.name : 'Unknown'
      }
    }, { status: 500 });
  }
}

async function approveRouterSpending(
  userAddress: string,
  tokenAddress: string,
  amount: string,
  routerAddress: string
): Promise<NextResponse> {
  try {
    console.log('Creating token approval with Stellar SDK Contract:', {
      userAddress,
      tokenAddress,
      amount,
      routerAddress
    });

    const server = new SorobanRpc.Server(RPC_URL);
    const scaledAmount = BigInt(Math.floor(parseFloat(amount) * 1e7));
    const expirationLedger = 1000000;

    // ✅ Get source account
    const sourceAccount = await server.getAccount(userAddress);

    // ✅ Use Stellar SDK Contract class - this is the correct way
    const tokenContract = new Contract(tokenAddress);
    
    // ✅ Create the approve operation using Contract.call()
    const approveOperation = tokenContract.call(
      'approve',
      Address.fromString(userAddress).toScVal(),    // from
      Address.fromString(routerAddress).toScVal(),  // spender
      nativeToScVal(scaledAmount, { type: 'i128' }), // amount
      nativeToScVal(expirationLedger, { type: 'u32' }) // expiration
    );

    // ✅ Build transaction with the correct operation
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '1000000',
      networkPassphrase: Networks.TESTNET,
    })
    .addOperation(approveOperation) // ✅ This returns proper Operation instance
    .setTimeout(300)
    .build();

    console.log('Preparing token approval transaction...');
    const preparedTransaction = await server.prepareTransaction(transaction);

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Token approval transaction prepared successfully',
        transactionXdr: preparedTransaction.toXDR(),
        approvalDetails: {
          token: tokenAddress,
          spender: routerAddress,
          amount: scaledAmount.toString(),
          expiration: expirationLedger
        }
      }
    });

  } catch (error) {
    console.error('Error preparing token approval:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare approval'
    }, { status: 500 });
  }
}


