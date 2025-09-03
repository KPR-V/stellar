#![no_std]
use soroban_sdk::{contracttype, Address, Map, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ArbitrageConfig {
    pub min_profit_bps: u32,
    pub max_trade_size: i128,
    pub slippage_tolerance_bps: u32,
    pub enabled: bool,
    pub max_gas_price: i128,
    pub min_liquidity: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StablecoinPair {
    pub base_asset_address: Address,      // e.g., Address for USDC
    pub quote_asset_address: Address,     // e.g., Address for XLM
    pub base_asset_symbol: Symbol,
    pub quote_asset_symbol: Symbol,
    pub target_peg: i128,
    pub deviation_threshold_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EnhancedStablecoinPair {
    pub base: StablecoinPair,
    pub price_sources: PriceSources,
    pub risk_config: RiskConfiguration,
    pub fee_config: FeeConfiguration,
    pub twap_config: TWAPConfiguration,
    pub enabled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceSources {
    pub fiat_sources: Vec<OracleSource>,
    pub stablecoin_sources: Vec<OracleSource>,
    pub fallback_enabled: bool,
    pub min_sources_required: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleSource {
    pub oracle_type: OracleType,
    pub asset_type: AssetType,
    pub address: Option<Address>,
    pub priority: u32,
    pub max_age_seconds: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OracleType {
    Forex,
    Crypto,
    Stellar,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetType {
    Symbol,
    Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskConfiguration {
    pub max_position_size: i128,
    pub max_daily_volume: i128,
    pub volatility_threshold_bps: u32,
    pub correlation_limit: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeConfiguration {
    pub trading_fee_bps: u32,
    pub gas_fee_bps: u32,
    pub bridge_fee_bps: u32,
    pub keeper_fee_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TWAPConfiguration {
    pub periods: u32,
    pub min_deviation_bps: u32,
    pub enabled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ArbitrageOpportunity {
    pub pair: StablecoinPair,
    pub stablecoin_price: i128,
    pub fiat_rate: i128,
    pub deviation_bps: u32,
    pub estimated_profit: i128,
    pub trade_direction: Symbol,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EnhancedArbitrageOpportunity {
    pub base_opportunity: ArbitrageOpportunity,
    pub twap_price: Option<i128>,
    pub confidence_score: u32,
    pub max_trade_size: i128,
    pub venue_recommendations: Vec<TradingVenue>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TradeExecution {
    pub opportunity: ArbitrageOpportunity,
    pub executed_amount: i128,
    pub actual_profit: i128,
    pub gas_cost: i128,
    pub execution_timestamp: u64,
    pub status: Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PerformanceMetrics {
    pub total_profit: i128,
    pub total_trades: u32,
    pub successful_trades: u32,
    pub success_rate_bps: u32,
    pub total_volume: i128,
    pub avg_profit_per_trade: i128,
    pub period_days: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserProfile {
    pub balances: Map<Address, i128>,
    pub risk_limits: RiskLimits,
    pub trading_config: ArbitrageConfig,
    pub total_profit_loss: i128,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserTradeHistory {
    pub trades: Vec<TradeExecution>,
    pub daily_volume: i128,
    pub success_count: u32,
    pub last_trade_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UserStorageKey {
    Profile(Address),
    TradeHistory(Address),
    DailyVolume(Address, u64),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskLimits {
    pub max_daily_volume: i128,
    pub max_position_size: i128,
    pub max_drawdown_bps: u32,
    pub var_limit: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TradingVenue {
    pub name: Symbol,
    pub address: Address,
    pub enabled: bool,
    pub fee_bps: u32,
    pub liquidity_threshold: i128,
}

impl EnhancedStablecoinPair {
    pub fn from_basic(env: &soroban_sdk::Env, basic: StablecoinPair) -> Self {
        let mut fiat_sources = Vec::new(env);
        fiat_sources.push_back(OracleSource {
            oracle_type: OracleType::Forex,
            asset_type: AssetType::Symbol,
            address: None,
            priority: 1,
            max_age_seconds: 600,
        });

        let mut stablecoin_sources = Vec::new(env);
        stablecoin_sources.push_back(OracleSource {
            oracle_type: OracleType::Crypto,
            asset_type: AssetType::Symbol,
            address: None,
            priority: 1,
            max_age_seconds: 300,
        });

        Self {
            base: basic,
            price_sources: PriceSources {
                fiat_sources,
                stablecoin_sources,
                fallback_enabled: true,
                min_sources_required: 1,
            },
            risk_config: RiskConfiguration {
                max_position_size: 100000_0000000,
                max_daily_volume: 1000000_0000000,
                volatility_threshold_bps: 1000,
                correlation_limit: 8000,
            },
            fee_config: FeeConfiguration {
                trading_fee_bps: 30,
                gas_fee_bps: 10,
                bridge_fee_bps: 0,
                keeper_fee_bps: 5,
            },
            twap_config: TWAPConfiguration {
                periods: 12,
                min_deviation_bps: 100,
                enabled: true,
            },
            enabled: true,
        }
    }
}

impl EnhancedArbitrageOpportunity {
    pub fn from_basic(env: &soroban_sdk::Env, basic: ArbitrageOpportunity) -> Self {
        Self {
            base_opportunity: basic,
            twap_price: None,
            confidence_score: 5000,
            max_trade_size: 100000_0000000,
            venue_recommendations: Vec::new(env),
        }
    }
}

impl ArbitrageOpportunity {
    pub fn from_enhanced(enhanced: &EnhancedArbitrageOpportunity) -> Self {
        enhanced.base_opportunity.clone()
    }
}
