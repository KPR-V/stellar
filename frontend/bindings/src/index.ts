import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const DEXError = {
  1: {message:"InsufficientLiquidity"},
  2: {message:"SlippageExceeded"},
  3: {message:"DeadlineExceeded"},
  4: {message:"TokenApprovalFailed"},
  5: {message:"SwapFailed"}
}


export interface SwapResult {
  amount_out: i128;
  fees_paid: i128;
  price_impact_bps: u32;
  success: boolean;
}


export interface PairInfo {
  fee_bps: u32;
  last_update: u64;
  reserve_a: i128;
  reserve_b: i128;
}


export interface ArbitrageConfig {
  enabled: boolean;
  max_gas_price: i128;
  max_trade_size: i128;
  min_liquidity: i128;
  min_profit_bps: u32;
  slippage_tolerance_bps: u32;
}


export interface StablecoinPair {
  base_asset_address: string;
  base_asset_symbol: string;
  deviation_threshold_bps: u32;
  quote_asset_address: string;
  quote_asset_symbol: string;
  target_peg: i128;
}


export interface EnhancedStablecoinPair {
  base: StablecoinPair;
  enabled: boolean;
  fee_config: FeeConfiguration;
  price_sources: PriceSources;
  risk_config: RiskConfiguration;
  twap_config: TWAPConfiguration;
}


export interface PriceSources {
  fallback_enabled: boolean;
  fiat_sources: Array<OracleSource>;
  min_sources_required: u32;
  stablecoin_sources: Array<OracleSource>;
}


export interface OracleSource {
  address: Option<string>;
  asset_type: AssetType;
  max_age_seconds: u64;
  oracle_type: OracleType;
  priority: u32;
}

export type OracleType = {tag: "Forex", values: void} | {tag: "Crypto", values: void} | {tag: "Stellar", values: void};

export type AssetType = {tag: "Symbol", values: void} | {tag: "Address", values: void};


export interface PriceData {
  price: i128;
  timestamp: u64;
}


export interface RiskConfiguration {
  correlation_limit: i128;
  max_daily_volume: i128;
  max_position_size: i128;
  volatility_threshold_bps: u32;
}


export interface FeeConfiguration {
  bridge_fee_bps: u32;
  gas_fee_bps: u32;
  keeper_fee_bps: u32;
  trading_fee_bps: u32;
}


export interface TWAPConfiguration {
  enabled: boolean;
  min_deviation_bps: u32;
  periods: u32;
}


export interface ArbitrageOpportunity {
  deviation_bps: u32;
  estimated_profit: i128;
  fiat_rate: i128;
  pair: StablecoinPair;
  stablecoin_price: i128;
  timestamp: u64;
  trade_direction: string;
}


export interface EnhancedArbitrageOpportunity {
  base_opportunity: ArbitrageOpportunity;
  confidence_score: u32;
  max_trade_size: i128;
  twap_price: Option<i128>;
  venue_recommendations: Array<TradingVenue>;
}


export interface TradeExecution {
  actual_profit: i128;
  executed_amount: i128;
  execution_timestamp: u64;
  gas_cost: i128;
  opportunity: ArbitrageOpportunity;
  status: string;
}


export interface PerformanceMetrics {
  avg_profit_per_trade: i128;
  period_days: u32;
  success_rate_bps: u32;
  successful_trades: u32;
  total_profit: i128;
  total_trades: u32;
  total_volume: i128;
}


export interface UserProfile {
  balances: Map<string, i128>;
  is_active: boolean;
  risk_limits: RiskLimits;
  total_profit_loss: i128;
  trading_config: ArbitrageConfig;
}


export interface UserTradeHistory {
  daily_volume: i128;
  last_trade_timestamp: u64;
  success_count: u32;
  trades: Array<TradeExecution>;
}

export type UserStorageKey = {tag: "Profile", values: readonly [string]} | {tag: "TradeHistory", values: readonly [string]} | {tag: "DailyVolume", values: readonly [string, u64]};


export interface RiskLimits {
  max_daily_volume: i128;
  max_drawdown_bps: u32;
  max_position_size: i128;
  var_limit: i128;
}


export interface TradingVenue {
  address: string;
  enabled: boolean;
  fee_bps: u32;
  liquidity_threshold: i128;
  name: string;
}

export interface Client {
  /**
   * Construct and simulate a initialize_testnet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize_testnet: ({admin, config, risk_manager}: {admin: string, config: ArbitrageConfig, risk_manager: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, config, forex_oracle, crypto_oracle, stellar_oracle, risk_manager}: {admin: string, config: ArbitrageConfig, forex_oracle: string, crypto_oracle: string, stellar_oracle: string, risk_manager: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a initialize_user_account transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize_user_account: ({user, initial_config, risk_limits}: {user: string, initial_config: ArbitrageConfig, risk_limits: RiskLimits}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deposit_user_funds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  deposit_user_funds: ({user, token_address, amount}: {user: string, token_address: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw_user_funds transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw_user_funds: ({user, token_address, amount}: {user: string, token_address: string, amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a execute_user_arbitrage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  execute_user_arbitrage: ({user, opportunity, trade_amount, venue_address}: {user: string, opportunity: EnhancedArbitrageOpportunity, trade_amount: i128, venue_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<TradeExecution>>

  /**
   * Construct and simulate a get_user_performance_metrics transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_performance_metrics: ({user, days}: {user: string, days: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<PerformanceMetrics>>

  /**
   * Construct and simulate a get_user_balances transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_balances: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, i128>>>

  /**
   * Construct and simulate a get_user_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_config: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<ArbitrageConfig>>

  /**
   * Construct and simulate a update_user_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_user_config: ({user, new_config}: {user: string, new_config: ArbitrageConfig}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_user_trade_history transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_trade_history: ({user, limit}: {user: string, limit: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<TradeExecution>>>

  /**
   * Construct and simulate a set_dao_governance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_dao_governance: ({admin, dao_address}: {admin: string, dao_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a update_config_dao transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_config_dao: ({caller, new_config}: {caller: string, new_config: ArbitrageConfig}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_enhanced_pair_dao transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_enhanced_pair_dao: ({caller, pair}: {caller: string, pair: EnhancedStablecoinPair}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_trading_venue_dao transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_trading_venue_dao: ({caller, venue}: {caller: string, venue: TradingVenue}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a pause_pair_dao transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pause_pair_dao: ({caller, stablecoin_symbol}: {caller: string, stablecoin_symbol: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_keeper transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_keeper: ({caller, keeper}: {caller: string, keeper: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a transfer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_admin: ({current_admin, new_admin}: {current_admin: string, new_admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a add_enhanced_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_enhanced_pair: ({caller, pair}: {caller: string, pair: EnhancedStablecoinPair}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_trading_venue transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_trading_venue: ({caller, venue}: {caller: string, venue: TradingVenue}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a scan_advanced_opportunities transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  scan_advanced_opportunities: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<EnhancedArbitrageOpportunity>>>

  /**
   * Construct and simulate a execute_enhanced_arbitrage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  execute_enhanced_arbitrage: ({caller, opportunity, trade_amount, venue_address}: {caller: string, opportunity: EnhancedArbitrageOpportunity, trade_amount: i128, venue_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<TradeExecution>>

  /**
   * Construct and simulate a pause_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pause_pair: ({caller, stablecoin_symbol}: {caller: string, stablecoin_symbol: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_performance_metrics transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_performance_metrics: ({days}: {days: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<PerformanceMetrics>>

  /**
   * Construct and simulate a add_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_pair: ({caller, pair}: {caller: string, pair: StablecoinPair}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a scan_opportunities transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  scan_opportunities: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<ArbitrageOpportunity>>>

  /**
   * Construct and simulate a execute_arbitrage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  execute_arbitrage: ({caller, opportunity, trade_amount}: {caller: string, opportunity: ArbitrageOpportunity, trade_amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<TradeExecution>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<ArbitrageConfig>>

  /**
   * Construct and simulate a update_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_config: ({caller, new_config}: {caller: string, new_config: ArbitrageConfig}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a emergency_stop transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  emergency_stop: ({caller}: {caller: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_pairs transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pairs: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<StablecoinPair>>>

  /**
   * Construct and simulate a get_trade_history transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_trade_history: ({limit}: {limit: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<TradeExecution>>>

  /**
   * Construct and simulate a add_crypto_to_crypto_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_crypto_to_crypto_pair: ({caller, base_crypto, quote_crypto, base_address, quote_address, deviation_threshold}: {caller: string, base_crypto: string, quote_crypto: string, base_address: string, quote_address: string, deviation_threshold: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a debug_test_oracle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  debug_test_oracle: ({oracle_address, symbol, asset_type}: {oracle_address: string, symbol: string, asset_type: AssetType}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<PriceData>>>

  /**
   * Construct and simulate a debug_evaluate_pair transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  debug_evaluate_pair: ({pair_index}: {pair_index: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<EnhancedArbitrageOpportunity>>>

  /**
   * Construct and simulate a debug_get_price_sources transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  debug_get_price_sources: ({pair_index}: {pair_index: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<PriceSources>>>

  /**
   * Construct and simulate a debug_fetch_prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  debug_fetch_prices: ({fiat_symbol, stablecoin_symbol, price_sources}: {fiat_symbol: string, stablecoin_symbol: string, price_sources: PriceSources}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [Option<PriceData>, Option<PriceData>]>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAACERFWEVycm9yAAAABQAAAAAAAAAVSW5zdWZmaWNpZW50TGlxdWlkaXR5AAAAAAAAAQAAAAAAAAAQU2xpcHBhZ2VFeGNlZWRlZAAAAAIAAAAAAAAAEERlYWRsaW5lRXhjZWVkZWQAAAADAAAAAAAAABNUb2tlbkFwcHJvdmFsRmFpbGVkAAAAAAQAAAAAAAAAClN3YXBGYWlsZWQAAAAAAAU=",
        "AAAAAQAAAAAAAAAAAAAAClN3YXBSZXN1bHQAAAAAAAQAAAAAAAAACmFtb3VudF9vdXQAAAAAAAsAAAAAAAAACWZlZXNfcGFpZAAAAAAAAAsAAAAAAAAAEHByaWNlX2ltcGFjdF9icHMAAAAEAAAAAAAAAAdzdWNjZXNzAAAAAAE=",
        "AAAAAQAAAAAAAAAAAAAACFBhaXJJbmZvAAAABAAAAAAAAAAHZmVlX2JwcwAAAAAEAAAAAAAAAAtsYXN0X3VwZGF0ZQAAAAAGAAAAAAAAAAlyZXNlcnZlX2EAAAAAAAALAAAAAAAAAAlyZXNlcnZlX2IAAAAAAAAL",
        "AAAAAAAAAAAAAAASaW5pdGlhbGl6ZV90ZXN0bmV0AAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABmNvbmZpZwAAAAAH0AAAAA9BcmJpdHJhZ2VDb25maWcAAAAAAAAAAAxyaXNrX21hbmFnZXIAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZjb25maWcAAAAAB9AAAAAPQXJiaXRyYWdlQ29uZmlnAAAAAAAAAAAMZm9yZXhfb3JhY2xlAAAAEwAAAAAAAAANY3J5cHRvX29yYWNsZQAAAAAAABMAAAAAAAAADnN0ZWxsYXJfb3JhY2xlAAAAAAATAAAAAAAAAAxyaXNrX21hbmFnZXIAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAXaW5pdGlhbGl6ZV91c2VyX2FjY291bnQAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAADmluaXRpYWxfY29uZmlnAAAAAAfQAAAAD0FyYml0cmFnZUNvbmZpZwAAAAAAAAAAC3Jpc2tfbGltaXRzAAAAB9AAAAAKUmlza0xpbWl0cwAAAAAAAA==",
        "AAAAAAAAAAAAAAASZGVwb3NpdF91c2VyX2Z1bmRzAAAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAANdG9rZW5fYWRkcmVzcwAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAAAAAAATd2l0aGRyYXdfdXNlcl9mdW5kcwAAAAADAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAANdG9rZW5fYWRkcmVzcwAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAAAAAAAWZXhlY3V0ZV91c2VyX2FyYml0cmFnZQAAAAAABAAAAAAAAAAEdXNlcgAAABMAAAAAAAAAC29wcG9ydHVuaXR5AAAAB9AAAAAcRW5oYW5jZWRBcmJpdHJhZ2VPcHBvcnR1bml0eQAAAAAAAAAMdHJhZGVfYW1vdW50AAAACwAAAAAAAAANdmVudWVfYWRkcmVzcwAAAAAAABMAAAABAAAH0AAAAA5UcmFkZUV4ZWN1dGlvbgAA",
        "AAAAAAAAAAAAAAAcZ2V0X3VzZXJfcGVyZm9ybWFuY2VfbWV0cmljcwAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAARkYXlzAAAABAAAAAEAAAfQAAAAElBlcmZvcm1hbmNlTWV0cmljcwAA",
        "AAAAAAAAAAAAAAARZ2V0X3VzZXJfYmFsYW5jZXMAAAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPsAAAAEwAAAAs=",
        "AAAAAAAAAAAAAAAPZ2V0X3VzZXJfY29uZmlnAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAB9AAAAAPQXJiaXRyYWdlQ29uZmlnAA==",
        "AAAAAAAAAAAAAAASdXBkYXRlX3VzZXJfY29uZmlnAAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAKbmV3X2NvbmZpZwAAAAAH0AAAAA9BcmJpdHJhZ2VDb25maWcAAAAAAA==",
        "AAAAAAAAAAAAAAAWZ2V0X3VzZXJfdHJhZGVfaGlzdG9yeQAAAAAAAgAAAAAAAAAEdXNlcgAAABMAAAAAAAAABWxpbWl0AAAAAAAABAAAAAEAAAPqAAAH0AAAAA5UcmFkZUV4ZWN1dGlvbgAA",
        "AAAAAAAAAAAAAAASc2V0X2Rhb19nb3Zlcm5hbmNlAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAC2Rhb19hZGRyZXNzAAAAABMAAAAA",
        "AAAAAAAAAAAAAAARdXBkYXRlX2NvbmZpZ19kYW8AAAAAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAACm5ld19jb25maWcAAAAAB9AAAAAPQXJiaXRyYWdlQ29uZmlnAAAAAAA=",
        "AAAAAAAAAAAAAAAVYWRkX2VuaGFuY2VkX3BhaXJfZGFvAAAAAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAARwYWlyAAAH0AAAABZFbmhhbmNlZFN0YWJsZWNvaW5QYWlyAAAAAAAA",
        "AAAAAAAAAAAAAAAVYWRkX3RyYWRpbmdfdmVudWVfZGFvAAAAAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAV2ZW51ZQAAAAAAB9AAAAAMVHJhZGluZ1ZlbnVlAAAAAA==",
        "AAAAAAAAAAAAAAAOcGF1c2VfcGFpcl9kYW8AAAAAAAIAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAARc3RhYmxlY29pbl9zeW1ib2wAAAAAAAARAAAAAA==",
        "AAAAAAAAAAAAAAAKYWRkX2tlZXBlcgAAAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAZrZWVwZXIAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAAOdHJhbnNmZXJfYWRtaW4AAAAAAAIAAAAAAAAADWN1cnJlbnRfYWRtaW4AAAAAAAATAAAAAAAAAAluZXdfYWRtaW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAARYWRkX2VuaGFuY2VkX3BhaXIAAAAAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAABHBhaXIAAAfQAAAAFkVuaGFuY2VkU3RhYmxlY29pblBhaXIAAAAAAAA=",
        "AAAAAAAAAAAAAAARYWRkX3RyYWRpbmdfdmVudWUAAAAAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAABXZlbnVlAAAAAAAH0AAAAAxUcmFkaW5nVmVudWUAAAAA",
        "AAAAAAAAAAAAAAAbc2Nhbl9hZHZhbmNlZF9vcHBvcnR1bml0aWVzAAAAAAAAAAABAAAD6gAAB9AAAAAcRW5oYW5jZWRBcmJpdHJhZ2VPcHBvcnR1bml0eQ==",
        "AAAAAAAAAAAAAAAaZXhlY3V0ZV9lbmhhbmNlZF9hcmJpdHJhZ2UAAAAAAAQAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAALb3Bwb3J0dW5pdHkAAAAH0AAAABxFbmhhbmNlZEFyYml0cmFnZU9wcG9ydHVuaXR5AAAAAAAAAAx0cmFkZV9hbW91bnQAAAALAAAAAAAAAA12ZW51ZV9hZGRyZXNzAAAAAAAAEwAAAAEAAAfQAAAADlRyYWRlRXhlY3V0aW9uAAA=",
        "AAAAAAAAAAAAAAAKcGF1c2VfcGFpcgAAAAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAABFzdGFibGVjb2luX3N5bWJvbAAAAAAAABEAAAAA",
        "AAAAAAAAAAAAAAAXZ2V0X3BlcmZvcm1hbmNlX21ldHJpY3MAAAAAAQAAAAAAAAAEZGF5cwAAAAQAAAABAAAH0AAAABJQZXJmb3JtYW5jZU1ldHJpY3MAAA==",
        "AAAAAAAAAAAAAAAIYWRkX3BhaXIAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAABHBhaXIAAAfQAAAADlN0YWJsZWNvaW5QYWlyAAAAAAAA",
        "AAAAAAAAAAAAAAASc2Nhbl9vcHBvcnR1bml0aWVzAAAAAAAAAAAAAQAAA+oAAAfQAAAAFEFyYml0cmFnZU9wcG9ydHVuaXR5",
        "AAAAAAAAAAAAAAARZXhlY3V0ZV9hcmJpdHJhZ2UAAAAAAAADAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAAC29wcG9ydHVuaXR5AAAAB9AAAAAUQXJiaXRyYWdlT3Bwb3J0dW5pdHkAAAAAAAAADHRyYWRlX2Ftb3VudAAAAAsAAAABAAAH0AAAAA5UcmFkZUV4ZWN1dGlvbgAA",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAAD0FyYml0cmFnZUNvbmZpZwA=",
        "AAAAAAAAAAAAAAANdXBkYXRlX2NvbmZpZwAAAAAAAAIAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAKbmV3X2NvbmZpZwAAAAAH0AAAAA9BcmJpdHJhZ2VDb25maWcAAAAAAA==",
        "AAAAAAAAAAAAAAAOZW1lcmdlbmN5X3N0b3AAAAAAAAEAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAJZ2V0X3BhaXJzAAAAAAAAAAAAAAEAAAPqAAAH0AAAAA5TdGFibGVjb2luUGFpcgAA",
        "AAAAAAAAAAAAAAARZ2V0X3RyYWRlX2hpc3RvcnkAAAAAAAABAAAAAAAAAAVsaW1pdAAAAAAAAAQAAAABAAAD6gAAB9AAAAAOVHJhZGVFeGVjdXRpb24AAA==",
        "AAAAAAAAAAAAAAAZYWRkX2NyeXB0b190b19jcnlwdG9fcGFpcgAAAAAAAAYAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAALYmFzZV9jcnlwdG8AAAAAEQAAAAAAAAAMcXVvdGVfY3J5cHRvAAAAEQAAAAAAAAAMYmFzZV9hZGRyZXNzAAAAEwAAAAAAAAANcXVvdGVfYWRkcmVzcwAAAAAAABMAAAAAAAAAE2RldmlhdGlvbl90aHJlc2hvbGQAAAAABAAAAAA=",
        "AAAAAAAAAAAAAAARZGVidWdfdGVzdF9vcmFjbGUAAAAAAAADAAAAAAAAAA5vcmFjbGVfYWRkcmVzcwAAAAAAEwAAAAAAAAAGc3ltYm9sAAAAAAARAAAAAAAAAAphc3NldF90eXBlAAAAAAfQAAAACUFzc2V0VHlwZQAAAAAAAAEAAAPoAAAH0AAAAAlQcmljZURhdGEAAAA=",
        "AAAAAAAAAAAAAAATZGVidWdfZXZhbHVhdGVfcGFpcgAAAAABAAAAAAAAAApwYWlyX2luZGV4AAAAAAAEAAAAAQAAA+gAAAfQAAAAHEVuaGFuY2VkQXJiaXRyYWdlT3Bwb3J0dW5pdHk=",
        "AAAAAAAAAAAAAAAXZGVidWdfZ2V0X3ByaWNlX3NvdXJjZXMAAAAAAQAAAAAAAAAKcGFpcl9pbmRleAAAAAAABAAAAAEAAAPoAAAH0AAAAAxQcmljZVNvdXJjZXM=",
        "AAAAAAAAAAAAAAASZGVidWdfZmV0Y2hfcHJpY2VzAAAAAAADAAAAAAAAAAtmaWF0X3N5bWJvbAAAAAARAAAAAAAAABFzdGFibGVjb2luX3N5bWJvbAAAAAAAABEAAAAAAAAADXByaWNlX3NvdXJjZXMAAAAAAAfQAAAADFByaWNlU291cmNlcwAAAAEAAAPtAAAAAgAAA+gAAAfQAAAACVByaWNlRGF0YQAAAAAAA+gAAAfQAAAACVByaWNlRGF0YQAAAA==",
        "AAAAAQAAAAAAAAAAAAAAD0FyYml0cmFnZUNvbmZpZwAAAAAGAAAAAAAAAAdlbmFibGVkAAAAAAEAAAAAAAAADW1heF9nYXNfcHJpY2UAAAAAAAALAAAAAAAAAA5tYXhfdHJhZGVfc2l6ZQAAAAAACwAAAAAAAAANbWluX2xpcXVpZGl0eQAAAAAAAAsAAAAAAAAADm1pbl9wcm9maXRfYnBzAAAAAAAEAAAAAAAAABZzbGlwcGFnZV90b2xlcmFuY2VfYnBzAAAAAAAE",
        "AAAAAQAAAAAAAAAAAAAADlN0YWJsZWNvaW5QYWlyAAAAAAAGAAAAAAAAABJiYXNlX2Fzc2V0X2FkZHJlc3MAAAAAABMAAAAAAAAAEWJhc2VfYXNzZXRfc3ltYm9sAAAAAAAAEQAAAAAAAAAXZGV2aWF0aW9uX3RocmVzaG9sZF9icHMAAAAABAAAAAAAAAATcXVvdGVfYXNzZXRfYWRkcmVzcwAAAAATAAAAAAAAABJxdW90ZV9hc3NldF9zeW1ib2wAAAAAABEAAAAAAAAACnRhcmdldF9wZWcAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAAFkVuaGFuY2VkU3RhYmxlY29pblBhaXIAAAAAAAYAAAAAAAAABGJhc2UAAAfQAAAADlN0YWJsZWNvaW5QYWlyAAAAAAAAAAAAB2VuYWJsZWQAAAAAAQAAAAAAAAAKZmVlX2NvbmZpZwAAAAAH0AAAABBGZWVDb25maWd1cmF0aW9uAAAAAAAAAA1wcmljZV9zb3VyY2VzAAAAAAAH0AAAAAxQcmljZVNvdXJjZXMAAAAAAAAAC3Jpc2tfY29uZmlnAAAAB9AAAAARUmlza0NvbmZpZ3VyYXRpb24AAAAAAAAAAAAAC3R3YXBfY29uZmlnAAAAB9AAAAARVFdBUENvbmZpZ3VyYXRpb24AAAA=",
        "AAAAAQAAAAAAAAAAAAAADFByaWNlU291cmNlcwAAAAQAAAAAAAAAEGZhbGxiYWNrX2VuYWJsZWQAAAABAAAAAAAAAAxmaWF0X3NvdXJjZXMAAAPqAAAH0AAAAAxPcmFjbGVTb3VyY2UAAAAAAAAAFG1pbl9zb3VyY2VzX3JlcXVpcmVkAAAABAAAAAAAAAASc3RhYmxlY29pbl9zb3VyY2VzAAAAAAPqAAAH0AAAAAxPcmFjbGVTb3VyY2U=",
        "AAAAAQAAAAAAAAAAAAAADE9yYWNsZVNvdXJjZQAAAAUAAAAAAAAAB2FkZHJlc3MAAAAD6AAAABMAAAAAAAAACmFzc2V0X3R5cGUAAAAAB9AAAAAJQXNzZXRUeXBlAAAAAAAAAAAAAA9tYXhfYWdlX3NlY29uZHMAAAAABgAAAAAAAAALb3JhY2xlX3R5cGUAAAAH0AAAAApPcmFjbGVUeXBlAAAAAAAAAAAACHByaW9yaXR5AAAABA==",
        "AAAAAgAAAAAAAAAAAAAACk9yYWNsZVR5cGUAAAAAAAMAAAAAAAAAAAAAAAVGb3JleAAAAAAAAAAAAAAAAAAABkNyeXB0bwAAAAAAAAAAAAAAAAAHU3RlbGxhcgA=",
        "AAAAAgAAAAAAAAAAAAAACUFzc2V0VHlwZQAAAAAAAAIAAAAAAAAAAAAAAAZTeW1ib2wAAAAAAAAAAAAAAAAAB0FkZHJlc3MA",
        "AAAAAQAAAAAAAAAAAAAAEVJpc2tDb25maWd1cmF0aW9uAAAAAAAABAAAAAAAAAARY29ycmVsYXRpb25fbGltaXQAAAAAAAALAAAAAAAAABBtYXhfZGFpbHlfdm9sdW1lAAAACwAAAAAAAAARbWF4X3Bvc2l0aW9uX3NpemUAAAAAAAALAAAAAAAAABh2b2xhdGlsaXR5X3RocmVzaG9sZF9icHMAAAAE",
        "AAAAAQAAAAAAAAAAAAAAEEZlZUNvbmZpZ3VyYXRpb24AAAAEAAAAAAAAAA5icmlkZ2VfZmVlX2JwcwAAAAAABAAAAAAAAAALZ2FzX2ZlZV9icHMAAAAABAAAAAAAAAAOa2VlcGVyX2ZlZV9icHMAAAAAAAQAAAAAAAAAD3RyYWRpbmdfZmVlX2JwcwAAAAAE",
        "AAAAAQAAAAAAAAAAAAAAEVRXQVBDb25maWd1cmF0aW9uAAAAAAAAAwAAAAAAAAAHZW5hYmxlZAAAAAABAAAAAAAAABFtaW5fZGV2aWF0aW9uX2JwcwAAAAAAAAQAAAAAAAAAB3BlcmlvZHMAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAFEFyYml0cmFnZU9wcG9ydHVuaXR5AAAABwAAAAAAAAANZGV2aWF0aW9uX2JwcwAAAAAAAAQAAAAAAAAAEGVzdGltYXRlZF9wcm9maXQAAAALAAAAAAAAAAlmaWF0X3JhdGUAAAAAAAALAAAAAAAAAARwYWlyAAAH0AAAAA5TdGFibGVjb2luUGFpcgAAAAAAAAAAABBzdGFibGVjb2luX3ByaWNlAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABgAAAAAAAAAPdHJhZGVfZGlyZWN0aW9uAAAAABE=",
        "AAAAAQAAAAAAAAAAAAAAHEVuaGFuY2VkQXJiaXRyYWdlT3Bwb3J0dW5pdHkAAAAFAAAAAAAAABBiYXNlX29wcG9ydHVuaXR5AAAH0AAAABRBcmJpdHJhZ2VPcHBvcnR1bml0eQAAAAAAAAAQY29uZmlkZW5jZV9zY29yZQAAAAQAAAAAAAAADm1heF90cmFkZV9zaXplAAAAAAALAAAAAAAAAAp0d2FwX3ByaWNlAAAAAAPoAAAACwAAAAAAAAAVdmVudWVfcmVjb21tZW5kYXRpb25zAAAAAAAD6gAAB9AAAAAMVHJhZGluZ1ZlbnVl",
        "AAAAAQAAAAAAAAAAAAAADlRyYWRlRXhlY3V0aW9uAAAAAAAGAAAAAAAAAA1hY3R1YWxfcHJvZml0AAAAAAAACwAAAAAAAAAPZXhlY3V0ZWRfYW1vdW50AAAAAAsAAAAAAAAAE2V4ZWN1dGlvbl90aW1lc3RhbXAAAAAABgAAAAAAAAAIZ2FzX2Nvc3QAAAALAAAAAAAAAAtvcHBvcnR1bml0eQAAAAfQAAAAFEFyYml0cmFnZU9wcG9ydHVuaXR5AAAAAAAAAAZzdGF0dXMAAAAAABE=",
        "AAAAAQAAAAAAAAAAAAAAElBlcmZvcm1hbmNlTWV0cmljcwAAAAAABwAAAAAAAAAUYXZnX3Byb2ZpdF9wZXJfdHJhZGUAAAALAAAAAAAAAAtwZXJpb2RfZGF5cwAAAAAEAAAAAAAAABBzdWNjZXNzX3JhdGVfYnBzAAAABAAAAAAAAAARc3VjY2Vzc2Z1bF90cmFkZXMAAAAAAAAEAAAAAAAAAAx0b3RhbF9wcm9maXQAAAALAAAAAAAAAAx0b3RhbF90cmFkZXMAAAAEAAAAAAAAAAx0b3RhbF92b2x1bWUAAAAL",
        "AAAAAQAAAAAAAAAAAAAAC1VzZXJQcm9maWxlAAAAAAUAAAAAAAAACGJhbGFuY2VzAAAD7AAAABMAAAALAAAAAAAAAAlpc19hY3RpdmUAAAAAAAABAAAAAAAAAAtyaXNrX2xpbWl0cwAAAAfQAAAAClJpc2tMaW1pdHMAAAAAAAAAAAARdG90YWxfcHJvZml0X2xvc3MAAAAAAAALAAAAAAAAAA50cmFkaW5nX2NvbmZpZwAAAAAH0AAAAA9BcmJpdHJhZ2VDb25maWcA",
        "AAAAAQAAAAAAAAAAAAAAEFVzZXJUcmFkZUhpc3RvcnkAAAAEAAAAAAAAAAxkYWlseV92b2x1bWUAAAALAAAAAAAAABRsYXN0X3RyYWRlX3RpbWVzdGFtcAAAAAYAAAAAAAAADXN1Y2Nlc3NfY291bnQAAAAAAAAEAAAAAAAAAAZ0cmFkZXMAAAAAA+oAAAfQAAAADlRyYWRlRXhlY3V0aW9uAAA=",
        "AAAAAgAAAAAAAAAAAAAADlVzZXJTdG9yYWdlS2V5AAAAAAADAAAAAQAAAAAAAAAHUHJvZmlsZQAAAAABAAAAEwAAAAEAAAAAAAAADFRyYWRlSGlzdG9yeQAAAAEAAAATAAAAAQAAAAAAAAALRGFpbHlWb2x1bWUAAAAAAgAAABMAAAAG",
        "AAAAAQAAAAAAAAAAAAAAClJpc2tMaW1pdHMAAAAAAAQAAAAAAAAAEG1heF9kYWlseV92b2x1bWUAAAALAAAAAAAAABBtYXhfZHJhd2Rvd25fYnBzAAAABAAAAAAAAAARbWF4X3Bvc2l0aW9uX3NpemUAAAAAAAALAAAAAAAAAAl2YXJfbGltaXQAAAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAADFRyYWRpbmdWZW51ZQAAAAUAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAAHZW5hYmxlZAAAAAABAAAAAAAAAAdmZWVfYnBzAAAAAAQAAAAAAAAAE2xpcXVpZGl0eV90aHJlc2hvbGQAAAAACwAAAAAAAAAEbmFtZQAAABE=" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize_testnet: this.txFromJSON<null>,
        initialize: this.txFromJSON<null>,
        initialize_user_account: this.txFromJSON<null>,
        deposit_user_funds: this.txFromJSON<null>,
        withdraw_user_funds: this.txFromJSON<null>,
        execute_user_arbitrage: this.txFromJSON<TradeExecution>,
        get_user_performance_metrics: this.txFromJSON<PerformanceMetrics>,
        get_user_balances: this.txFromJSON<Map<string, i128>>,
        get_user_config: this.txFromJSON<ArbitrageConfig>,
        update_user_config: this.txFromJSON<null>,
        get_user_trade_history: this.txFromJSON<Array<TradeExecution>>,
        set_dao_governance: this.txFromJSON<null>,
        update_config_dao: this.txFromJSON<null>,
        add_enhanced_pair_dao: this.txFromJSON<null>,
        add_trading_venue_dao: this.txFromJSON<null>,
        pause_pair_dao: this.txFromJSON<null>,
        add_keeper: this.txFromJSON<null>,
        transfer_admin: this.txFromJSON<null>,
        get_admin: this.txFromJSON<string>,
        add_enhanced_pair: this.txFromJSON<null>,
        add_trading_venue: this.txFromJSON<null>,
        scan_advanced_opportunities: this.txFromJSON<Array<EnhancedArbitrageOpportunity>>,
        execute_enhanced_arbitrage: this.txFromJSON<TradeExecution>,
        pause_pair: this.txFromJSON<null>,
        get_performance_metrics: this.txFromJSON<PerformanceMetrics>,
        add_pair: this.txFromJSON<null>,
        scan_opportunities: this.txFromJSON<Array<ArbitrageOpportunity>>,
        execute_arbitrage: this.txFromJSON<TradeExecution>,
        get_config: this.txFromJSON<ArbitrageConfig>,
        update_config: this.txFromJSON<null>,
        emergency_stop: this.txFromJSON<null>,
        get_pairs: this.txFromJSON<Array<StablecoinPair>>,
        get_trade_history: this.txFromJSON<Array<TradeExecution>>,
        add_crypto_to_crypto_pair: this.txFromJSON<null>,
        debug_test_oracle: this.txFromJSON<Option<PriceData>>,
        debug_evaluate_pair: this.txFromJSON<Option<EnhancedArbitrageOpportunity>>,
        debug_get_price_sources: this.txFromJSON<Option<PriceSources>>,
        debug_fetch_prices: this.txFromJSON<readonly [Option<PriceData>, Option<PriceData>]>
  }
}