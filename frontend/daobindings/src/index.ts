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


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCTY5KAMW3SKZD56YMZ7HQTZ6FZKHS3CUDEEFWCS6QC5PSMOFFUGTGCO",
  }
} as const

export type ProposalType = {tag: "UpdateConfig", values: void} | {tag: "AddTradingPair", values: void} | {tag: "AddTradingVenue", values: void} | {tag: "PausePair", values: void} | {tag: "UpdateRiskManager", values: void} | {tag: "EmergencyStop", values: void} | {tag: "TransferAdmin", values: void};

export type ProposalStatus = {tag: "Active", values: void} | {tag: "Passed", values: void} | {tag: "Failed", values: void} | {tag: "Executed", values: void} | {tag: "Cancelled", values: void};


export interface ProposalData {
  admin_address: Option<string>;
  config_data: Option<ArbitrageConfig>;
  generic_data: Option<Buffer>;
  pair_data: Option<EnhancedStablecoinPair>;
  symbol_data: Option<string>;
  venue_data: Option<TradingVenue>;
}


export interface Proposal {
  cancelled_at: Option<u64>;
  created_at: u64;
  description: string;
  executed_at: Option<u64>;
  execution_earliest: u64;
  id: u64;
  no_votes: i128;
  proposal_data: ProposalData;
  proposal_type: ProposalType;
  proposer: string;
  quorum_required: i128;
  status: ProposalStatus;
  target_contract: string;
  title: string;
  voting_ends_at: u64;
  yes_votes: i128;
}


export interface Vote {
  proposal_id: u64;
  timestamp: u64;
  vote_yes: boolean;
  voter: string;
  voting_power: i128;
}


export interface StakeInfo {
  amount: i128;
  last_stake_update: u64;
  staked_at: u64;
}


export interface DAOConfig {
  execution_delay: u64;
  min_stake_to_propose: i128;
  proposal_threshold_bps: u32;
  quorum_percentage: u32;
  voting_duration_ledgers: u64;
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
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, arbitrage_bot_address, dao_config}: {admin: string, arbitrage_bot_address: string, dao_config: DAOConfig}, options?: {
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
   * Construct and simulate a stake_kale transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  stake_kale: ({staker, amount}: {staker: string, amount: i128}, options?: {
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
   * Construct and simulate a unstake_kale transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  unstake_kale: ({staker, amount}: {staker: string, amount: i128}, options?: {
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
   * Construct and simulate a create_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_proposal: ({proposer, proposal_type, title, description, proposal_data}: {proposer: string, proposal_type: ProposalType, title: string, description: string, proposal_data: ProposalData}, options?: {
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
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a cancel_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_proposal: ({proposer, proposal_id}: {proposer: string, proposal_id: u64}, options?: {
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
   * Construct and simulate a vote transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  vote: ({voter, proposal_id, vote_yes}: {voter: string, proposal_id: u64, vote_yes: boolean}, options?: {
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
   * Construct and simulate a finalize_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  finalize_proposal: ({proposal_id}: {proposal_id: u64}, options?: {
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
   * Construct and simulate a execute_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  execute_proposal: ({executor, proposal_id}: {executor: string, proposal_id: u64}, options?: {
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
   * Construct and simulate a get_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_proposal: ({proposal_id}: {proposal_id: u64}, options?: {
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
  }) => Promise<AssembledTransaction<Proposal>>

  /**
   * Construct and simulate a get_all_proposals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_all_proposals: (options?: {
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
  }) => Promise<AssembledTransaction<Array<Proposal>>>

  /**
   * Construct and simulate a get_active_proposals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_active_proposals: (options?: {
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
  }) => Promise<AssembledTransaction<Array<Proposal>>>

  /**
   * Construct and simulate a get_stake transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stake: ({user}: {user: string}, options?: {
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
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_stake_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stake_info: ({user}: {user: string}, options?: {
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
  }) => Promise<AssembledTransaction<Option<StakeInfo>>>

  /**
   * Construct and simulate a get_total_staked transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_staked: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

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
   * Construct and simulate a get_dao_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_dao_config: (options?: {
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
  }) => Promise<AssembledTransaction<DAOConfig>>

  /**
   * Construct and simulate a get_user_vote transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_vote: ({user, proposal_id}: {user: string, proposal_id: u64}, options?: {
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
  }) => Promise<AssembledTransaction<Option<Vote>>>

  /**
   * Construct and simulate a upgrade_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade_contract: ({admin, new_wasm_hash}: {admin: string, new_wasm_hash: Buffer}, options?: {
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
   * Construct and simulate a get_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_version: (options?: {
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
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a update_min_stake_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_min_stake_admin: ({admin, new_min_stake}: {admin: string, new_min_stake: i128}, options?: {
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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAADFByb3Bvc2FsVHlwZQAAAAcAAAAAAAAAAAAAAAxVcGRhdGVDb25maWcAAAAAAAAAAAAAAA5BZGRUcmFkaW5nUGFpcgAAAAAAAAAAAAAAAAAPQWRkVHJhZGluZ1ZlbnVlAAAAAAAAAAAAAAAACVBhdXNlUGFpcgAAAAAAAAAAAAAAAAAAEVVwZGF0ZVJpc2tNYW5hZ2VyAAAAAAAAAAAAAAAAAAANRW1lcmdlbmN5U3RvcAAAAAAAAAAAAAAAAAAADVRyYW5zZmVyQWRtaW4AAAA=",
        "AAAAAgAAAAAAAAAAAAAADlByb3Bvc2FsU3RhdHVzAAAAAAAFAAAAAAAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAZQYXNzZWQAAAAAAAAAAAAAAAAABkZhaWxlZAAAAAAAAAAAAAAAAAAIRXhlY3V0ZWQAAAAAAAAAAAAAAAlDYW5jZWxsZWQAAAA=",
        "AAAAAQAAAAAAAAAAAAAADFByb3Bvc2FsRGF0YQAAAAYAAAAAAAAADWFkbWluX2FkZHJlc3MAAAAAAAPoAAAAEwAAAAAAAAALY29uZmlnX2RhdGEAAAAD6AAAB9AAAAAPQXJiaXRyYWdlQ29uZmlnAAAAAAAAAAAMZ2VuZXJpY19kYXRhAAAD6AAAAA4AAAAAAAAACXBhaXJfZGF0YQAAAAAAA+gAAAfQAAAAFkVuaGFuY2VkU3RhYmxlY29pblBhaXIAAAAAAAAAAAALc3ltYm9sX2RhdGEAAAAD6AAAABEAAAAAAAAACnZlbnVlX2RhdGEAAAAAA+gAAAfQAAAADFRyYWRpbmdWZW51ZQ==",
        "AAAAAQAAAAAAAAAAAAAACFByb3Bvc2FsAAAAEAAAAAAAAAAMY2FuY2VsbGVkX2F0AAAD6AAAAAYAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAAC2V4ZWN1dGVkX2F0AAAAA+gAAAAGAAAAAAAAABJleGVjdXRpb25fZWFybGllc3QAAAAAAAYAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAAhub192b3RlcwAAAAsAAAAAAAAADXByb3Bvc2FsX2RhdGEAAAAAAAfQAAAADFByb3Bvc2FsRGF0YQAAAAAAAAANcHJvcG9zYWxfdHlwZQAAAAAAB9AAAAAMUHJvcG9zYWxUeXBlAAAAAAAAAAhwcm9wb3NlcgAAABMAAAAAAAAAD3F1b3J1bV9yZXF1aXJlZAAAAAALAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAOUHJvcG9zYWxTdGF0dXMAAAAAAAAAAAAPdGFyZ2V0X2NvbnRyYWN0AAAAABMAAAAAAAAABXRpdGxlAAAAAAAAEAAAAAAAAAAOdm90aW5nX2VuZHNfYXQAAAAAAAYAAAAAAAAACXllc192b3RlcwAAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAABFZvdGUAAAAFAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAGAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAAAAAAh2b3RlX3llcwAAAAEAAAAAAAAABXZvdGVyAAAAAAAAEwAAAAAAAAAMdm90aW5nX3Bvd2VyAAAACw==",
        "AAAAAQAAAAAAAAAAAAAACVN0YWtlSW5mbwAAAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAARbGFzdF9zdGFrZV91cGRhdGUAAAAAAAAGAAAAAAAAAAlzdGFrZWRfYXQAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAACURBT0NvbmZpZwAAAAAAAAUAAAAAAAAAD2V4ZWN1dGlvbl9kZWxheQAAAAAGAAAAAAAAABRtaW5fc3Rha2VfdG9fcHJvcG9zZQAAAAsAAAAAAAAAFnByb3Bvc2FsX3RocmVzaG9sZF9icHMAAAAAAAQAAAAAAAAAEXF1b3J1bV9wZXJjZW50YWdlAAAAAAAABAAAAAAAAAAXdm90aW5nX2R1cmF0aW9uX2xlZGdlcnMAAAAABg==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABVhcmJpdHJhZ2VfYm90X2FkZHJlc3MAAAAAAAATAAAAAAAAAApkYW9fY29uZmlnAAAAAAfQAAAACURBT0NvbmZpZwAAAAAAAAA=",
        "AAAAAAAAAAAAAAAKc3Rha2Vfa2FsZQAAAAAAAgAAAAAAAAAGc3Rha2VyAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAMdW5zdGFrZV9rYWxlAAAAAgAAAAAAAAAGc3Rha2VyAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAPY3JlYXRlX3Byb3Bvc2FsAAAAAAUAAAAAAAAACHByb3Bvc2VyAAAAEwAAAAAAAAANcHJvcG9zYWxfdHlwZQAAAAAAB9AAAAAMUHJvcG9zYWxUeXBlAAAAAAAAAAV0aXRsZQAAAAAAABAAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAADXByb3Bvc2FsX2RhdGEAAAAAAAfQAAAADFByb3Bvc2FsRGF0YQAAAAEAAAAG",
        "AAAAAAAAAAAAAAAPY2FuY2VsX3Byb3Bvc2FsAAAAAAIAAAAAAAAACHByb3Bvc2VyAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAA=",
        "AAAAAAAAAAAAAAAEdm90ZQAAAAMAAAAAAAAABXZvdGVyAAAAAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAAAAAAIdm90ZV95ZXMAAAABAAAAAA==",
        "AAAAAAAAAAAAAAARZmluYWxpemVfcHJvcG9zYWwAAAAAAAABAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAQZXhlY3V0ZV9wcm9wb3NhbAAAAAIAAAAAAAAACGV4ZWN1dG9yAAAAEwAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAA=",
        "AAAAAAAAAAAAAAAMZ2V0X3Byb3Bvc2FsAAAAAQAAAAAAAAALcHJvcG9zYWxfaWQAAAAABgAAAAEAAAfQAAAACFByb3Bvc2Fs",
        "AAAAAAAAAAAAAAARZ2V0X2FsbF9wcm9wb3NhbHMAAAAAAAAAAAAAAQAAA+oAAAfQAAAACFByb3Bvc2Fs",
        "AAAAAAAAAAAAAAAUZ2V0X2FjdGl2ZV9wcm9wb3NhbHMAAAAAAAAAAQAAA+oAAAfQAAAACFByb3Bvc2Fs",
        "AAAAAAAAAAAAAAAJZ2V0X3N0YWtlAAAAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAAOZ2V0X3N0YWtlX2luZm8AAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+gAAAfQAAAACVN0YWtlSW5mbwAAAA==",
        "AAAAAAAAAAAAAAAQZ2V0X3RvdGFsX3N0YWtlZAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAOZ2V0X2Rhb19jb25maWcAAAAAAAAAAAABAAAH0AAAAAlEQU9Db25maWcAAAA=",
        "AAAAAAAAAAAAAAANZ2V0X3VzZXJfdm90ZQAAAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAtwcm9wb3NhbF9pZAAAAAAGAAAAAQAAA+gAAAfQAAAABFZvdGU=",
        "AAAAAAAAAAAAAAAQdXBncmFkZV9jb250cmFjdAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAANbmV3X3dhc21faGFzaAAAAAAAA+4AAAAgAAAAAA==",
        "AAAAAAAAAAAAAAALZ2V0X3ZlcnNpb24AAAAAAAAAAAEAAAAE",
        "AAAAAAAAAAAAAAAWdXBkYXRlX21pbl9zdGFrZV9hZG1pbgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA1uZXdfbWluX3N0YWtlAAAAAAAACwAAAAA=",
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
    initialize: this.txFromJSON<null>,
        stake_kale: this.txFromJSON<null>,
        unstake_kale: this.txFromJSON<null>,
        create_proposal: this.txFromJSON<u64>,
        cancel_proposal: this.txFromJSON<null>,
        vote: this.txFromJSON<null>,
        finalize_proposal: this.txFromJSON<null>,
        execute_proposal: this.txFromJSON<null>,
        get_proposal: this.txFromJSON<Proposal>,
        get_all_proposals: this.txFromJSON<Array<Proposal>>,
        get_active_proposals: this.txFromJSON<Array<Proposal>>,
        get_stake: this.txFromJSON<i128>,
        get_stake_info: this.txFromJSON<Option<StakeInfo>>,
        get_total_staked: this.txFromJSON<i128>,
        get_admin: this.txFromJSON<string>,
        get_dao_config: this.txFromJSON<DAOConfig>,
        get_user_vote: this.txFromJSON<Option<Vote>>,
        upgrade_contract: this.txFromJSON<null>,
        get_version: this.txFromJSON<u32>,
        update_min_stake_admin: this.txFromJSON<null>
  }
}