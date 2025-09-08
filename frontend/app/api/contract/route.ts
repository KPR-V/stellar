import { NextRequest, NextResponse } from 'next/server';
import { Client } from '../../../bindings/src'; 
import { Address, Networks } from '@stellar/stellar-sdk';
import { SorobanRpc, Address as StellarAddress,TransactionBuilder,Asset, nativeToScVal,Contract } from '@stellar/stellar-sdk';


const safeStringify = (obj: any) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const RPC_URL = 'https://soroban-testnet.stellar.org';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, userAddress, ...params } = body;

    if (action === 'initialize_user_account') {
      return await initializeUserAccount(userAddress, params.initialConfig, params.riskLimits);
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


async function initializeUserAccount(
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
    const balancesWithStrings: { [key: string]: string } = {};
        
    if (result.result && typeof result.result === 'object') {
            for (const [key, value] of Object.entries(result.result)) {
        
        if (Array.isArray(value) && value.length === 2) {
          const [tokenAddress, balance] = value;          
          let balanceStr = '';
          if (typeof balance === 'bigint') {
            balanceStr = balance.toString();
          } else if (typeof balance === 'number') {
            balanceStr = balance.toString();
          } else {
            balanceStr = String(balance);
          }
          
          balancesWithStrings[tokenAddress] = balanceStr;
          
        } else if (typeof value === 'string' && value.includes(',')) {
          const [tokenAddress, balance] = value.split(',');
          if (tokenAddress && balance) {
            balancesWithStrings[tokenAddress] = balance;
          }
        } else {
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
          
          balancesWithStrings[key] = balanceStr;
        }
      }
    }
    
    const tokenPrices: { [key: string]: number } = {};
    const balancesWithUsdValues: { [key: string]: { balance: string, usdValue: number, price: number } } = {};
        
    for (const [tokenAddress, balance] of Object.entries(balancesWithStrings)) {
      try {
        let usdPrice = 0;
        const balanceValue = parseFloat(normalizeOraclePrice(balance, 7));      
        const tokenInfo = getTokenSymbolForOracle(tokenAddress);        
        if (tokenInfo.symbol !== 'Unknown') {
          usdPrice = await fetchTokenUsdPrice(tokenInfo.symbol, tokenAddress);
        }
        
        const usdValue = balanceValue * usdPrice;        
        tokenPrices[tokenAddress] = usdPrice;
        balancesWithUsdValues[tokenAddress] = {
          balance: normalizeOraclePrice(balance, 7), 
          usdValue: usdValue,
          price: usdPrice
        };
                
      } catch (priceError) {
        console.warn(`Failed to fetch price for ${tokenAddress}:`, priceError);
        const balanceValue = parseFloat(normalizeOraclePrice(balance, 7));
        let fallbackPrice = 0;
        const tokenInfo = getTokenSymbolForOracle(tokenAddress);
        
        switch (tokenInfo.symbol) {
          case 'USDC':
            fallbackPrice = 1.0;
            break;
          case 'EURC':
            fallbackPrice = 1.1; 
            break;
          case 'XLM':
            fallbackPrice = 0.12;
            break;
          default:
            fallbackPrice = 1.0; 
        }
        
        tokenPrices[tokenAddress] = fallbackPrice;
        balancesWithUsdValues[tokenAddress] = {
          balance: normalizeOraclePrice(balance, 7),
          usdValue: balanceValue * fallbackPrice,
          price: fallbackPrice
        };
      }
    }
  
    let totalUsdValue = 0;
    for (const [tokenAddress, data] of Object.entries(balancesWithUsdValues)) {
      totalUsdValue += data.usdValue;
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'User balances with USD prices fetched successfully!',
        balances: balancesWithStrings,
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


function getTokenSymbolForOracle(tokenAddress: string): { symbol: string, name: string } {
  const tokenMap: { [key: string]: { symbol: string, name: string } } = {
    'native': { symbol: 'XLM', name: 'Stellar Lumens' },
    
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC': { symbol: 'XLM', name: 'Stellar Lumens' },
    'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA': { symbol: 'USDC', name: 'USD Coin' }, 
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': { symbol: 'USDC', name: 'USD Coin' }, 
    'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': { symbol: 'EURC', name: 'Euro Coin' },
    'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ': { symbol: 'EURC', name: 'Euro Coin' },
      };
  
  return tokenMap[tokenAddress] || { symbol: 'Unknown', name: 'Unknown Token' };
}


async function getRealUsdPrice(tokenSymbol: string): Promise<number> {
  try {    
    if (tokenSymbol === 'USDC') {
      return 1.0; 
    }
    
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const CRYPTO_ORACLE = 'CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63';
    const FOREX_ORACLE = 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W';
    const STELLAR_ORACLE = 'CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP';

    if (tokenSymbol === 'XLM') {
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
          
          if (priceNum > 0.01 && priceNum < 2.0) { 
            return priceNum;
          }
        }
      } catch (oracleError) {
        console.warn('Failed to get XLM from crypto oracle:', oracleError);
      }
      
      return 0.12;
    }
    
    if (tokenSymbol === 'EURC') {
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
          if (rateNum > 0.8 && rateNum < 1.5) {
            return rateNum;
          }
        }
      } catch (oracleError) {
        console.warn('Failed to get EUR/USD from forex oracle:', oracleError);
      }
      
      return 1.1;
    }    
    return 0;
  } catch (error) {
    console.error(`Error fetching price from oracle for ${tokenSymbol}:`, error);
    if (tokenSymbol === 'USDC') return 1.0;
    if (tokenSymbol === 'XLM') return 0.12;
    if (tokenSymbol === 'EURC') return 1.1;
    return 0;
  }
}


async function fetchTokenUsdPrice(tokenSymbol: string, tokenAddress: string): Promise<number> {
  try {        
    const oraclePrice = await getRealUsdPrice(tokenSymbol);
    
    if (oraclePrice > 0) {
      return oraclePrice;
    }
    
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
    });

    const opportunities = await client.scan_advanced_opportunities({
      simulate: true
    });
    
    if (opportunities.result && Array.isArray(opportunities.result)) {
      for (const opp of opportunities.result) {
        if (opp.base_opportunity?.pair) {
          const pair = opp.base_opportunity.pair;          
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
            if (tokenSymbol === 'XLM' && normalizedPrice > 0.01 && normalizedPrice < 2.0) {
              return normalizedPrice;
            }
            if (tokenSymbol === 'USDC' && normalizedPrice > 0.9 && normalizedPrice < 1.1) {
              return normalizedPrice;
            }
            if (tokenSymbol === 'EURC' && normalizedPrice > 0.8 && normalizedPrice < 1.5) {
              return normalizedPrice;
            }
          }
        }
      }
    }

    const fallbackPrice = await getRealUsdPrice(tokenSymbol);
    return fallbackPrice;
  } catch (error) {
    console.error(`Error fetching price for ${tokenSymbol}:`, error); 
    const finalFallback = await getRealUsdPrice(tokenSymbol);
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

    const metrics = {
      total_trades: result.result.total_trades || 0,
      successful_trades: result.result.successful_trades || 0,
      total_profit: normalizeOraclePrice(result.result.total_profit?.toString() || '0', 7),
      total_volume: normalizeOraclePrice(result.result.total_volume?.toString() || '0', 7),
      success_rate_bps: result.result.success_rate_bps || 0,
      avg_profit_per_trade: normalizeOraclePrice(result.result.avg_profit_per_trade?.toString() || '0', 7),
      period_days: result.result.period_days || days,
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
    const server = new SorobanRpc.Server(RPC_URL);
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    let finalTokenAddress: string;
    if (isNative) {
      const nativeAsset = Asset.native();
      finalTokenAddress = nativeAsset.contractId(Networks.TESTNET);
    } else {
      try {
        let code = assetCode || 'USDC' || 'EURC';
        const knownAssets: { [key: string]: string } = {
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': 'USDC',
          'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': 'EURC',  
        };
        
        if (knownAssets[tokenAddress]) {
          code = knownAssets[tokenAddress];
        }
        
        const asset = new Asset(code, tokenAddress);
        finalTokenAddress = asset.contractId(Networks.TESTNET);
      } catch (assetError) {
        console.error('Error creating asset contract:', assetError);
        finalTokenAddress = tokenAddress;
      }
    }

    const result = await client.deposit_user_funds({
      user: userAddress,
      token_address: finalTokenAddress,
      amount: BigInt(amount)
    }, {
      simulate: true
    });
    const initialTx = result.toXDR();
    
    let transaction, preparedTransaction;
    
    try {
      transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
    } catch (parseError) {
      console.error('Error parsing initial transaction XDR:', parseError);
      throw new Error(`Failed to parse initial transaction: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    try {
      preparedTransaction = await server.prepareTransaction(transaction);
    } catch (prepareError) {
      console.error('Error preparing transaction:', prepareError);
      throw new Error(`Failed to prepare transaction: ${prepareError instanceof Error ? prepareError.message : 'Unknown error'}`);
    }

    const finalXdr = preparedTransaction.toXDR();
    try {
      const testParse = TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET);
      
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

async function withdrawUserFunds(
  userAddress: string,
  tokenAddress: string,
  amount: string,
  isNative: boolean = true,
  assetCode?: string
): Promise<NextResponse> {
  try {
    const server = new SorobanRpc.Server(RPC_URL);
    const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    let finalTokenAddress: string;
    if (isNative) {
      const nativeAsset = Asset.native();
      finalTokenAddress = nativeAsset.contractId(Networks.TESTNET);
    } else {
      try {
        let code = assetCode || 'USDC';
        const knownAssets: { [key: string]: string } = {
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': 'USDC',
          'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO': 'EURC',
        };
        
        if (knownAssets[tokenAddress]) {
          code = knownAssets[tokenAddress];
        }
        
        const asset = new Asset(code, tokenAddress);
        finalTokenAddress = asset.contractId(Networks.TESTNET);
      } catch (assetError) {
        console.error('Error creating asset contract for withdrawal:', assetError);
        finalTokenAddress = tokenAddress;
      }
    }

    const result = await client.withdraw_user_funds({
      user: userAddress,
      token_address: finalTokenAddress,
      amount: BigInt(amount)
    }, {
      simulate: true
    });

    const initialTx = result.toXDR();    
    let transaction, preparedTransaction;
    
    try {
      transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
    } catch (parseError) {
      console.error('Error parsing initial transaction XDR:', parseError);
      throw new Error(`Failed to parse initial transaction: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    try {
      preparedTransaction = await server.prepareTransaction(transaction);
    } catch (prepareError) {
      console.error('Error preparing transaction:', prepareError);
      throw new Error(`Failed to prepare transaction: ${prepareError instanceof Error ? prepareError.message : 'Unknown error'}`);
    }

    const finalXdr = preparedTransaction.toXDR();
    try {
      const testParse = TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET);            
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

    const formattedPairs = result.result.map((pair: any) => ({
      stablecoin_symbol: pair.stablecoin_symbol,
      fiat_symbol: pair.fiat_symbol,
      stablecoin_address: pair.stablecoin_address,
      target_peg: pair.target_peg?.toString(),
      deviation_threshold_bps: pair.deviation_threshold_bps
    }));

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

function normalizeOraclePrice(rawPrice: string | bigint, decimals: number = 7): string {
  const priceNum = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);
  if (priceNum === 0 || isNaN(priceNum)) return '0.000000';
  const normalizedPrice = priceNum / Math.pow(10, decimals);
  return normalizedPrice.toFixed(6); 
}

function parseScvValue(scvData: any): any {
  if (!scvData || !scvData._switch) {
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
            const hexData = Buffer.from(contractId.data).toString('hex').toUpperCase();
            const address = `CONTRACT_${hexData}`;
            return address;
          }
        } else if (scvData._value._switch?.name === 'scAddressTypeAccount') {
          const accountId = scvData._value._value;
          if (accountId && accountId._value && accountId._value.data) {
            const hexData = Buffer.from(accountId._value.data).toString('hex').toUpperCase();
            const address = `ACCOUNT_${hexData}`;
            return address;
          }
        }
      }
      return 'UNKNOWN_ADDRESS';
    default:
      console.warn('parseScvValue: Unknown SCV type:', scvData._switch.name);
      return scvData._value || null;
  }
}

function formatOpportunityData(opportunity: any): any {
  if (!opportunity || typeof opportunity !== 'object') {
    return null;
  }
  const bufferToString = (bufferObj: any): string => {
    
    if (Buffer.isBuffer(bufferObj)) {
      const result = bufferObj.toString('utf8');
      return result;
    }
    
    if (bufferObj && typeof bufferObj === 'object' && bufferObj.type === 'Buffer' && Array.isArray(bufferObj.data)) {
      const result = Buffer.from(bufferObj.data).toString('utf8');
      return result;
    }
    
    if (typeof bufferObj === 'string') {
      return bufferObj;
    }
    return bufferObj || '';
  };

  try {
    const baseOpp = opportunity.base_opportunity;
    if (!baseOpp || typeof baseOpp !== 'object') {
      return null;
    }
    
    const pair = baseOpp.pair;
    if (!pair || typeof pair !== 'object') {
      return null;
    }

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
    const assembledTx = await client.scan_advanced_opportunities({
      simulate: true
    });

    let opportunities: any[] = [];

    try {
      if (assembledTx && typeof assembledTx === 'object') {
        
        if ((assembledTx as any).simulation && (assembledTx as any).simulation.result) {
          const simulationResult = (assembledTx as any).simulation.result;
          if (simulationResult && simulationResult.retval && simulationResult.retval._switch?.name === 'scvVec') {
            const rawOpportunities = parseScvValue(simulationResult.retval);
                        
            if (Array.isArray(rawOpportunities)) {              
              opportunities = rawOpportunities.map((opp, index) => {
                const formatted = formatOpportunityData(opp);
                return formatted;
              }).filter(Boolean);
            } 
          } 
        } 
      }
    } catch (parseError) {
      console.error('Error processing opportunities data:', parseError);
      opportunities = [];
    }
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
    const server = new SorobanRpc.Server(RPC_URL);
      const client = new Client({
      contractId: CONTRACT_ADDRESS,
      networkPassphrase: Networks.TESTNET,
      rpcUrl: RPC_URL,
      publicKey: userAddress,
    });

    const scaledTradeAmount = BigInt(Math.floor(parseFloat(tradeAmount) * 1e7));
    const toBigInt = (value: string | number, scale: number = 1e7): bigint => {
      if (!value || isNaN(parseFloat(value.toString()))) {
        return BigInt(0);
      }
      return BigInt(Math.floor(parseFloat(value.toString()) * scale));
    };

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
    
    const assembledTx = await client.execute_user_arbitrage({
      user: userAddress,
      opportunity: contractOpportunity,
      trade_amount: scaledTradeAmount,
      venue_address: venueAddress
    }, {
      simulate: false
    });

    try {
      await assembledTx.simulate();
    } catch (simulateError) {
      console.log('Simulation failed as expected (auth required):', 
        simulateError instanceof Error ? simulateError.message : 'Unknown error');
    }

    const initialTx = assembledTx.toXDR();    
    let transaction, preparedTransaction;
    try {
      transaction = TransactionBuilder.fromXDR(initialTx, Networks.TESTNET);
    } catch (parseError) {
      console.error('Error parsing initial transaction XDR:', parseError);
      throw new Error(`Failed to parse initial transaction: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    try {
      preparedTransaction = await server.prepareTransaction(transaction);
    } catch (prepareError) {
      console.error('Error preparing transaction:', prepareError);
      const errorMessage = prepareError instanceof Error ? prepareError.message : String(prepareError);
      
      if (errorMessage.includes('Error(Auth, InvalidAction)') || errorMessage.includes('require_auth')) {
        console.log('Auth error during preparation - this is expected. Transaction will work when user signs it.');
          return NextResponse.json({
          success: true,
          data: { 
            message: 'Arbitrage transaction prepared for signing (auth will be provided by wallet)',
            transactionXdr: initialTx,
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
    const estimatedFee = preparedTransaction.fee;
    const baseFee = parseInt(preparedTransaction.fee) / 10000000;

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
    console.error('Error preparing arbitrage transaction:', error);
    
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

    const server = new SorobanRpc.Server(RPC_URL);
    const scaledAmount = BigInt(Math.floor(parseFloat(amount) * 1e7));
    const expirationLedger = 1000000;
    const sourceAccount = await server.getAccount(userAddress);
    const tokenContract = new Contract(tokenAddress);
    const approveOperation = tokenContract.call(
      'approve',
      Address.fromString(userAddress).toScVal(),    
      Address.fromString(routerAddress).toScVal(),  
      nativeToScVal(scaledAmount, { type: 'i128' }), 
      nativeToScVal(expirationLedger, { type: 'u32' })
    );

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '1000000',
      networkPassphrase: Networks.TESTNET,
    })
    .addOperation(approveOperation)
    .setTimeout(300)
    .build();
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


