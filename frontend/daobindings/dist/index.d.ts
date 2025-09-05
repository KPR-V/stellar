import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions } from '@stellar/stellar-sdk/contract';
import type { u32, u64, i128, Option } from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
export * as contract from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CAUUC5EO23A6HHT6KVVAXOQILLBIFQY566VUY5HDH3O5J2OD43LSPEVD";
    };
};
export type ProposalType = {
    tag: "UpdateConfig";
    values: void;
} | {
    tag: "AddTradingPair";
    values: void;
} | {
    tag: "AddTradingVenue";
    values: void;
} | {
    tag: "PausePair";
    values: void;
} | {
    tag: "UpdateRiskManager";
    values: void;
} | {
    tag: "EmergencyStop";
    values: void;
} | {
    tag: "TransferAdmin";
    values: void;
};
export type ProposalStatus = {
    tag: "Active";
    values: void;
} | {
    tag: "Passed";
    values: void;
} | {
    tag: "Failed";
    values: void;
} | {
    tag: "Executed";
    values: void;
} | {
    tag: "Cancelled";
    values: void;
};
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
export type OracleType = {
    tag: "Forex";
    values: void;
} | {
    tag: "Crypto";
    values: void;
} | {
    tag: "Stellar";
    values: void;
};
export type AssetType = {
    tag: "Symbol";
    values: void;
} | {
    tag: "Address";
    values: void;
};
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
export type UserStorageKey = {
    tag: "Profile";
    values: readonly [string];
} | {
    tag: "TradeHistory";
    values: readonly [string];
} | {
    tag: "DailyVolume";
    values: readonly [string, u64];
};
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
    initialize: ({ admin, arbitrage_bot_address, dao_config }: {
        admin: string;
        arbitrage_bot_address: string;
        dao_config: DAOConfig;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a stake_kale transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    stake_kale: ({ staker, amount }: {
        staker: string;
        amount: i128;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a unstake_kale transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    unstake_kale: ({ staker, amount }: {
        staker: string;
        amount: i128;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a create_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    create_proposal: ({ proposer, proposal_type, title, description, proposal_data }: {
        proposer: string;
        proposal_type: ProposalType;
        title: string;
        description: string;
        proposal_data: ProposalData;
    }, options?: {
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
    }) => Promise<AssembledTransaction<u64>>;
    /**
     * Construct and simulate a cancel_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    cancel_proposal: ({ proposer, proposal_id }: {
        proposer: string;
        proposal_id: u64;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a vote transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    vote: ({ voter, proposal_id, vote_yes }: {
        voter: string;
        proposal_id: u64;
        vote_yes: boolean;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a finalize_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    finalize_proposal: ({ proposal_id }: {
        proposal_id: u64;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a execute_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    execute_proposal: ({ executor, proposal_id }: {
        executor: string;
        proposal_id: u64;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a get_proposal transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_proposal: ({ proposal_id }: {
        proposal_id: u64;
    }, options?: {
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
    }) => Promise<AssembledTransaction<Proposal>>;
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
    }) => Promise<AssembledTransaction<Array<Proposal>>>;
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
    }) => Promise<AssembledTransaction<Array<Proposal>>>;
    /**
     * Construct and simulate a get_stake transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_stake: ({ user }: {
        user: string;
    }, options?: {
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
    }) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a get_stake_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_stake_info: ({ user }: {
        user: string;
    }, options?: {
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
    }) => Promise<AssembledTransaction<Option<StakeInfo>>>;
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
    }) => Promise<AssembledTransaction<i128>>;
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
    }) => Promise<AssembledTransaction<string>>;
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
    }) => Promise<AssembledTransaction<DAOConfig>>;
    /**
     * Construct and simulate a get_user_vote transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_user_vote: ({ user, proposal_id }: {
        user: string;
        proposal_id: u64;
    }, options?: {
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
    }) => Promise<AssembledTransaction<Option<Vote>>>;
    /**
     * Construct and simulate a upgrade_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    upgrade_contract: ({ admin, new_wasm_hash }: {
        admin: string;
        new_wasm_hash: Buffer;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
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
    }) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a update_min_stake_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    update_min_stake_admin: ({ admin, new_min_stake }: {
        admin: string;
        new_min_stake: i128;
    }, options?: {
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
    }) => Promise<AssembledTransaction<null>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        initialize: (json: string) => AssembledTransaction<null>;
        stake_kale: (json: string) => AssembledTransaction<null>;
        unstake_kale: (json: string) => AssembledTransaction<null>;
        create_proposal: (json: string) => AssembledTransaction<bigint>;
        cancel_proposal: (json: string) => AssembledTransaction<null>;
        vote: (json: string) => AssembledTransaction<null>;
        finalize_proposal: (json: string) => AssembledTransaction<null>;
        execute_proposal: (json: string) => AssembledTransaction<null>;
        get_proposal: (json: string) => AssembledTransaction<Proposal>;
        get_all_proposals: (json: string) => AssembledTransaction<Proposal[]>;
        get_active_proposals: (json: string) => AssembledTransaction<Proposal[]>;
        get_stake: (json: string) => AssembledTransaction<bigint>;
        get_stake_info: (json: string) => AssembledTransaction<Option<StakeInfo>>;
        get_total_staked: (json: string) => AssembledTransaction<bigint>;
        get_admin: (json: string) => AssembledTransaction<string>;
        get_dao_config: (json: string) => AssembledTransaction<DAOConfig>;
        get_user_vote: (json: string) => AssembledTransaction<Option<Vote>>;
        upgrade_contract: (json: string) => AssembledTransaction<null>;
        get_version: (json: string) => AssembledTransaction<number>;
        update_min_stake_admin: (json: string) => AssembledTransaction<null>;
    };
}
