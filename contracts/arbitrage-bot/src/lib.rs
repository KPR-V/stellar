#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Map, String, Symbol, Vec,vec};

pub mod dex;
pub mod reflector;
pub mod utils;
pub use dex::{
    calculate_slippage_bps,
    estimate_gas_cost,
    simulate_trade,
    StellarDEXClient as StellarDEXStruct, // ✅ Now properly available
    SwapResult,
};
pub use shared_types::*;

pub use reflector::*;
pub use utils::*;

#[soroban_sdk::contractclient(name = "RiskManagerClient")]
pub trait RiskManagerContract {
    fn check_trade_risk(env: Env, trade_size: i128) -> Symbol;
    fn update_daily_volume(env: Env, caller: Address, volume_delta: i128);
}
#[soroban_sdk::contractclient(name = "StellarDEXClient")]
pub trait StellarDEXContract {
    fn swap_exact_tokens_for_tokens(
        env: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        to: Address,
        deadline: u64,
    ) -> Vec<i128>;
}

const STELLAR_ORACLE_TESTNET: &str = "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP";
const FOREX_ORACLE_TESTNET: &str = "CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W";
const CRYPTO_ORACLE_TESTNET: &str = "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63";

#[contract]
pub struct ArbitrageBot;

#[contractimpl]
impl ArbitrageBot {
    pub fn initialize_testnet(
        env: Env,
        admin: Address,
        config: ArbitrageConfig,
        risk_manager: Address,
    ) {
        let forex_oracle = Address::from_string(&String::from_str(&env, FOREX_ORACLE_TESTNET));
        let crypto_oracle = Address::from_string(&String::from_str(&env, CRYPTO_ORACLE_TESTNET));
        let stellar_oracle = Address::from_string(&String::from_str(&env, STELLAR_ORACLE_TESTNET));

        Self::initialize(
            env,
            admin,
            config,
            forex_oracle,
            crypto_oracle,
            stellar_oracle,
            risk_manager,
        );
    }

    pub fn initialize(
        env: Env,
        admin: Address,
        config: ArbitrageConfig,
        forex_oracle: Address,
        crypto_oracle: Address,
        stellar_oracle: Address,
        risk_manager: Address,
    ) {
        if env
            .storage()
            .instance()
            .has(&Symbol::new(&env, "initialized"))
        {
            panic!("Contract already initialized");
        }

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "admin"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "config"), &config);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "forex_oracle"), &forex_oracle);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "crypto_oracle"), &crypto_oracle);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "stellar_oracle"), &stellar_oracle);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "risk_manager"), &risk_manager);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "initialized"), &true);

        let empty_pairs: Vec<EnhancedStablecoinPair> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "pairs"), &empty_pairs);

        let empty_history: Vec<TradeExecution> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "trade_history"), &empty_history);

        let empty_venues: Vec<TradingVenue> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "trading_venues"), &empty_venues);

        let keepers: Vec<Address> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "keepers"), &keepers);
    }

    pub fn initialize_user_account(
        env: Env,
        user: Address,
        initial_config: ArbitrageConfig,
        risk_limits: RiskLimits,
    ) {
        user.require_auth();

        let profile_key = UserStorageKey::Profile(user.clone());

        if env.storage().persistent().has(&profile_key) {
            panic!("User already initialized");
        }

        let profile = UserProfile {
            balances: Map::new(&env),
            risk_limits,
            trading_config: initial_config,
            total_profit_loss: 0,
            is_active: true,
        };

        env.storage().persistent().set(&profile_key, &profile);

        let history_key = UserStorageKey::TradeHistory(user.clone());
        let history = UserTradeHistory {
            trades: Vec::new(&env),
            daily_volume: 0,
            success_count: 0,
            last_trade_timestamp: 0,
        };
        env.storage().persistent().set(&history_key, &history);

        env.events().publish(
            (Symbol::new(&env, "user"), Symbol::new(&env, "registered")),
            (user,),
        );
    }

    pub fn deposit_user_funds(env: Env, user: Address, token_address: Address, amount: i128) {
        user.require_auth();
        let profile_key = UserStorageKey::Profile(user.clone());
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&profile_key)
            .expect("User not initialized");

        let current_balance = profile.balances.get(token_address.clone()).unwrap_or(0);
        profile
            .balances
            .set(token_address.clone(), current_balance + amount);

        env.storage().persistent().set(&profile_key, &profile);

        let token_client = TokenClient::new(&env, &token_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        env.events().publish(
            (Symbol::new(&env, "user"), Symbol::new(&env, "deposit")),
            (user, token_address, amount),
        );
    }

    pub fn withdraw_user_funds(env: Env, user: Address, token_address: Address, amount: i128) {
        user.require_auth();

        let profile_key = UserStorageKey::Profile(user.clone());
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&profile_key)
            .expect("User not initialized");

        let current_balance = profile.balances.get(token_address.clone()).unwrap_or(0);
        if current_balance < amount {
            panic!("Insufficient balance");
        }

        profile
            .balances
            .set(token_address.clone(), current_balance - amount);
        env.storage().persistent().set(&profile_key, &profile);

        let token_client = TokenClient::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &user, &amount);

        env.events().publish(
            (Symbol::new(&env, "user"), Symbol::new(&env, "withdrawal")),
            (user, token_address, amount),
        );
    }

    pub fn execute_user_arbitrage(
        env: Env,
        user: Address,
        opportunity: EnhancedArbitrageOpportunity,
        trade_amount: i128,
        venue_address: Address,
    ) -> TradeExecution {
        user.require_auth();

        let profile_key = UserStorageKey::Profile(user.clone());
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&profile_key)
            .expect("User not initialized");

        if !profile.is_active {
            return Self::create_failed_execution(&env, &opportunity, "USER_INACTIVE");
        }

        if trade_amount > profile.risk_limits.max_position_size {
            return Self::create_failed_execution(&env, &opportunity, "USER_POSITION_TOO_LARGE");
        }

        // ✅ Check internal contract balance (not user wallet)
        let token = &opportunity.base_opportunity.pair.stablecoin_address;
        let user_balance = profile.balances.get(token.clone()).unwrap_or(0);
        if user_balance < trade_amount {
            return Self::create_failed_execution(&env, &opportunity, "INSUFFICIENT_USER_BALANCE");
        }

        let history_key = UserStorageKey::TradeHistory(user.clone());
        let history: UserTradeHistory = env.storage().persistent().get(&history_key).unwrap();

        if history.daily_volume + trade_amount > profile.risk_limits.max_daily_volume {
            return Self::create_failed_execution(&env, &opportunity, "USER_DAILY_LIMIT_EXCEEDED");
        }

        if !profile.trading_config.enabled {
            return Self::create_failed_execution(&env, &opportunity, "USER_BOT_DISABLED");
        }

        // ✅ Deduct from internal balance BEFORE trade
        profile
            .balances
            .set(token.clone(), user_balance - trade_amount);
        env.storage().persistent().set(&profile_key, &profile);

        let simulation_result =
            Self::simulate_arbitrage_trade(&env, &opportunity, trade_amount, &venue_address);

        if let Some(sim) = simulation_result {
            let slippage_bps = calculate_slippage_bps(
                opportunity.base_opportunity.estimated_profit,
                sim.amount_out - trade_amount,
            );

            if slippage_bps > profile.trading_config.slippage_tolerance_bps {
                // ✅ Refund on failed slippage check
                let refund_balance =
                    profile.balances.get(token.clone()).unwrap_or(0) + trade_amount;
                profile.balances.set(token.clone(), refund_balance);
                env.storage().persistent().set(&profile_key, &profile);
                return Self::create_failed_execution(&env, &opportunity, "USER_SLIPPAGE_TOO_HIGH");
            }
        }

        // ✅ Execute trade using contract's funds
        let execution =
            Self::execute_contract_trade(&env, &user, &opportunity, trade_amount, &venue_address);

        // ✅ Update balance based on trade result
        if execution.status == Symbol::new(&env, "SUCCESS") {
            let final_balance =
                profile.balances.get(token.clone()).unwrap_or(0) + execution.actual_profit;
            profile.balances.set(token.clone(), final_balance);
            profile.total_profit_loss += execution.actual_profit;
        } else {
            // ✅ Refund on failed trade
            let refund_balance = profile.balances.get(token.clone()).unwrap_or(0) + trade_amount;
            profile.balances.set(token.clone(), refund_balance);
        }

        env.storage().persistent().set(&profile_key, &profile);
        Self::update_user_trade_history(&env, &user, &execution);

        execution
    }

    pub fn get_user_performance_metrics(env: Env, user: Address, days: u32) -> PerformanceMetrics {
        let history_key = UserStorageKey::TradeHistory(user);
        let history: UserTradeHistory = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| UserTradeHistory {
                trades: Vec::new(&env),
                daily_volume: 0,
                success_count: 0,
                last_trade_timestamp: 0,
            });

        let ledger_timestamp = env.ledger().timestamp();
        let cutoff_time = ledger_timestamp.saturating_sub(days as u64 * 86400);

        Self::calculate_metrics_from_trades(&env, &history.trades, cutoff_time, days)
    }

    pub fn get_user_balances(env: Env, user: Address) -> Map<Address, i128> {
        let profile_key = UserStorageKey::Profile(user);
        // Safe handling - return empty map if user doesn't exist
        if let Some(profile) = env
            .storage()
            .persistent()
            .get::<UserStorageKey, UserProfile>(&profile_key)
        {
            profile.balances
        } else {
            // Return empty balances map for uninitialized users
            Map::new(&env)
        }
    }

    pub fn get_user_config(env: Env, user: Address) -> ArbitrageConfig {
        let profile_key = UserStorageKey::Profile(user);
        if let Some(profile) = env
            .storage()
            .persistent()
            .get::<UserStorageKey, UserProfile>(&profile_key)
        {
            profile.trading_config
        } else {
            // Return default config for uninitialized users
            ArbitrageConfig {
                enabled: false,
                min_profit_bps: 50,
                max_trade_size: 0,
                slippage_tolerance_bps: 100,
                max_gas_price: 1000,
                min_liquidity: 0,
            }
        }
    }

    pub fn update_user_config(env: Env, user: Address, new_config: ArbitrageConfig) {
        user.require_auth();

        let profile_key = UserStorageKey::Profile(user.clone());
        let mut profile: UserProfile = env
            .storage()
            .persistent()
            .get(&profile_key)
            .expect("User not initialized");

        profile.trading_config = new_config;
        env.storage().persistent().set(&profile_key, &profile);

        env.events().publish(
            (
                Symbol::new(&env, "user"),
                Symbol::new(&env, "config_updated"),
            ),
            (user,),
        );
    }

    pub fn get_user_trade_history(env: Env, user: Address, limit: u32) -> Vec<TradeExecution> {
        let history_key = UserStorageKey::TradeHistory(user);
        let history_data: UserTradeHistory = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| UserTradeHistory {
                trades: Vec::new(&env),
                daily_volume: 0,
                success_count: 0,
                last_trade_timestamp: 0,
            });

        let trades = history_data.trades;

        if limit == 0 {
            return trades;
        }

        let start_idx = if trades.len() > limit {
            trades.len() - limit
        } else {
            0
        };

        let mut result = Vec::new(&env);
        for i in start_idx..trades.len() {
            result.push_back(trades.get(i).unwrap());
        }

        result
    }

    pub fn set_dao_governance(env: Env, admin: Address, dao_address: Address) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        if env
            .storage()
            .instance()
            .has(&Symbol::new(&env, "dao_address"))
        {
            panic!("DAO governance already set");
        }

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "dao_address"), &dao_address);

        env.events().publish(
            (
                Symbol::new(&env, "dao_governance"),
                Symbol::new(&env, "set"),
            ),
            (dao_address,),
        );
    }

    pub fn update_config_dao(env: Env, caller: Address, new_config: ArbitrageConfig) {
        caller.require_auth();
        Self::require_dao_or_admin(&env, &caller);

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "config"), &new_config);

        env.events().publish(
            (
                Symbol::new(&env, "config"),
                Symbol::new(&env, "updated_by_dao"),
            ),
            (caller,),
        );
    }

    pub fn add_enhanced_pair_dao(env: Env, caller: Address, pair: EnhancedStablecoinPair) {
        caller.require_auth();
        Self::require_dao_or_admin(&env, &caller);
        Self::add_enhanced_pair(env, caller, pair);
    }

    pub fn add_trading_venue_dao(env: Env, caller: Address, venue: TradingVenue) {
        caller.require_auth();
        Self::require_dao_or_admin(&env, &caller);
        Self::add_trading_venue(env, caller, venue);
    }

    pub fn pause_pair_dao(env: Env, caller: Address, stablecoin_symbol: Symbol) {
        caller.require_auth();
        Self::require_dao_or_admin(&env, &caller);
        Self::pause_pair(env, caller, stablecoin_symbol);
    }

    pub fn add_keeper(env: Env, caller: Address, keeper: Address) {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let mut keepers: Vec<Address> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "keepers"))
            .unwrap_or(Vec::new(&env));

        keepers.push_back(keeper);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "keepers"), &keepers);
    }

    pub fn transfer_admin(env: Env, current_admin: Address, new_admin: Address) {
        current_admin.require_auth();
        Self::require_admin(&env, &current_admin);

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "admin"), &new_admin);

        env.events().publish(
            (Symbol::new(&env, "admin"), Symbol::new(&env, "transferred")),
            (current_admin, new_admin),
        );
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "admin"))
            .unwrap()
    }

    pub fn add_enhanced_pair(env: Env, caller: Address, pair: EnhancedStablecoinPair) {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let mut pairs: Vec<EnhancedStablecoinPair> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "pairs"))
            .unwrap_or(Vec::new(&env));

        pairs.push_back(pair);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "pairs"), &pairs);
    }

    pub fn add_trading_venue(env: Env, caller: Address, venue: TradingVenue) {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let mut venues: Vec<TradingVenue> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "trading_venues"))
            .unwrap_or(Vec::new(&env));

        venues.push_back(venue);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "trading_venues"), &venues);
    }

    pub fn scan_advanced_opportunities(env: Env) -> Vec<EnhancedArbitrageOpportunity> {
        let pairs: Vec<EnhancedStablecoinPair> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "pairs"))
            .unwrap_or(Vec::new(&env));

        let forex_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "forex_oracle"))
            .unwrap();
        let crypto_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "crypto_oracle"))
            .unwrap();
        let stellar_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "stellar_oracle"))
            .unwrap();

        let mut opportunities: Vec<EnhancedArbitrageOpportunity> = Vec::new(&env);

        for pair in pairs.iter() {
            if let Some(opportunity) = Self::check_enhanced_arbitrage(
                &env,
                &pair,
                &forex_oracle,
                &crypto_oracle,
                &stellar_oracle,
            ) {
                opportunities.push_back(opportunity);
            }
        }

        opportunities
    }

    pub fn execute_enhanced_arbitrage(
        env: Env,
        caller: Address,
        opportunity: EnhancedArbitrageOpportunity,
        trade_amount: i128,
        venue_address: Address,
    ) -> TradeExecution {
        caller.require_auth();
        Self::require_keeper_or_admin(&env, &caller);

        let risk_manager: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "risk_manager"))
            .unwrap();

        let risk_check = Self::check_trade_risk(&env, &risk_manager, trade_amount);
        if risk_check != Symbol::new(&env, "APPROVED") {
            return TradeExecution {
                opportunity: ArbitrageOpportunity::from_enhanced(&opportunity),
                executed_amount: 0,
                actual_profit: 0,
                gas_cost: 0,
                execution_timestamp: env.ledger().timestamp(),
                status: risk_check,
            };
        }

        let config: ArbitrageConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .unwrap();

        if !config.enabled {
            return Self::create_failed_execution(&env, &opportunity, "DISABLED");
        }

        if !validate_trade_size(trade_amount, &config) {
            return Self::create_failed_execution(&env, &opportunity, "INVALID_SIZE");
        }

        let simulation_result =
            Self::simulate_arbitrage_trade(&env, &opportunity, trade_amount, &venue_address);

        if let Some(sim) = simulation_result {
            let slippage_bps = calculate_slippage_bps(
                opportunity.base_opportunity.estimated_profit,
                sim.amount_out - trade_amount,
            );

            if slippage_bps > config.slippage_tolerance_bps {
                return Self::create_failed_execution(&env, &opportunity, "SLIPPAGE_TOO_HIGH");
            }
        }

        let execution = Self::execute_real_trade(&env, &opportunity, trade_amount, &venue_address);

        if execution.status == Symbol::new(&env, "SUCCESS") {
            Self::update_risk_manager(&env, &risk_manager, &caller, trade_amount);
        }

        Self::store_trade_execution(&env, &execution);

        execution
    }

    pub fn pause_pair(env: Env, caller: Address, stablecoin_symbol: Symbol) {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let pairs: Vec<EnhancedStablecoinPair> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "pairs"))
            .unwrap_or(Vec::new(&env));

        let mut updated_pairs: Vec<EnhancedStablecoinPair> = Vec::new(&env);
        for pair in pairs.iter() {
            let mut updated_pair = pair.clone();
            if pair.base.stablecoin_symbol == stablecoin_symbol {
                updated_pair.enabled = false;
            }
            updated_pairs.push_back(updated_pair);
        }

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "pairs"), &updated_pairs);
    }

    pub fn get_performance_metrics(env: Env, days: u32) -> PerformanceMetrics {
        let history: Vec<TradeExecution> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "trade_history"))
            .unwrap_or(Vec::new(&env));

        let ledger_timestamp = env.ledger().timestamp();
        let cutoff_time = ledger_timestamp.saturating_sub(days as u64 * 86400);

        Self::calculate_metrics_from_trades(&env, &history, cutoff_time, days)
    }

    pub fn add_pair(env: Env, caller: Address, pair: StablecoinPair) {
        let enhanced_pair = EnhancedStablecoinPair::from_basic(&env, pair);
        Self::add_enhanced_pair(env, caller, enhanced_pair);
    }

    pub fn scan_opportunities(env: Env) -> Vec<ArbitrageOpportunity> {
        let env_clone = env.clone();
        let enhanced = Self::scan_advanced_opportunities(env);
        let mut basic = Vec::new(&env_clone);
        for enh in enhanced.iter() {
            basic.push_back(enh.base_opportunity.clone());
        }
        basic
    }

    pub fn execute_arbitrage(
        env: Env,
        caller: Address,
        opportunity: ArbitrageOpportunity,
        trade_amount: i128,
    ) -> TradeExecution {
        let enhanced = EnhancedArbitrageOpportunity::from_basic(&env, opportunity);
        let default_venue = Address::from_string(&String::from_str(&env, "DEFAULT_VENUE"));
        Self::execute_enhanced_arbitrage(env, caller, enhanced, trade_amount, default_venue)
    }

    pub fn get_config(env: Env) -> ArbitrageConfig {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .unwrap()
    }

    pub fn update_config(env: Env, caller: Address, new_config: ArbitrageConfig) {
        caller.require_auth();
        Self::require_admin(&env, &caller);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "config"), &new_config);
    }

    pub fn emergency_stop(env: Env, caller: Address) {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let mut config: ArbitrageConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .unwrap();
        config.enabled = false;
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "config"), &config);
    }

    pub fn get_pairs(env: Env) -> Vec<StablecoinPair> {
        let enhanced: Vec<EnhancedStablecoinPair> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "pairs"))
            .unwrap_or(Vec::new(&env));

        let mut basic = Vec::new(&env);
        for pair in enhanced.iter() {
            basic.push_back(pair.base.clone());
        }
        basic
    }

    pub fn get_trade_history(env: Env, limit: u32) -> Vec<TradeExecution> {
        let history: Vec<TradeExecution> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "trade_history"))
            .unwrap_or(Vec::new(&env));

        if limit == 0 {
            return history;
        }

        let start_idx = if history.len() > limit {
            history.len() - limit
        } else {
            0
        };

        let mut result = Vec::new(&env);
        for i in start_idx..history.len() {
            result.push_back(history.get(i).unwrap());
        }

        result
    }

    fn execute_trade_for_user(
        env: &Env,
        user: &Address,
        opportunity: &EnhancedArbitrageOpportunity,
        trade_amount: i128,
        venue_address: &Address,
    ) -> TradeExecution {
        Self::execute_contract_trade(env, user, opportunity, trade_amount, venue_address)
    }

    fn update_user_trade_history(env: &Env, user: &Address, execution: &TradeExecution) {
        let history_key = UserStorageKey::TradeHistory(user.clone());
        let mut history: UserTradeHistory = env.storage().persistent().get(&history_key).unwrap();

        history.trades.push_back(execution.clone());
        history.daily_volume += execution.executed_amount;
        history.last_trade_timestamp = execution.execution_timestamp;

        if execution.status == Symbol::new(env, "SUCCESS") {
            history.success_count += 1;
        }

        if history.trades.len() > 100 {
            let mut new_trades = Vec::new(env);
            for i in 1..history.trades.len() {
                new_trades.push_back(history.trades.get(i).unwrap());
            }
            history.trades = new_trades;
        }

        env.storage().persistent().set(&history_key, &history);
    }

    fn check_enhanced_arbitrage(
        env: &Env,
        pair: &EnhancedStablecoinPair,
        forex_oracle: &Address,
        crypto_oracle: &Address,
        stellar_oracle: &Address,
    ) -> Option<EnhancedArbitrageOpportunity> {
        env.events().publish(
            (
                Symbol::new(env, "arbitrage"),
                Symbol::new(env, "checking_pair"),
            ),
            (
                pair.base.fiat_symbol.clone(),
                pair.base.stablecoin_symbol.clone(),
            ),
        );

        if !pair.enabled {
            env.events().publish(
                (
                    Symbol::new(env, "arbitrage"),
                    Symbol::new(env, "pair_disabled"),
                ),
                (
                    pair.base.fiat_symbol.clone(),
                    pair.base.stablecoin_symbol.clone(),
                ),
            );
            return None;
        }

        env.events().publish(
            (
                Symbol::new(env, "arbitrage"),
                Symbol::new(env, "fetching_fiat_price"),
            ),
            (pair.base.fiat_symbol.clone(),),
        );

        let fiat_price = Self::get_price_with_fallback(
            env,
            &pair.price_sources.fiat_sources,
            &pair.base.fiat_symbol,
            forex_oracle,
            stellar_oracle,
        )?;

        env.events().publish(
            (
                Symbol::new(env, "arbitrage"),
                Symbol::new(env, "fiat_price_fetched"),
            ),
            (fiat_price.price, fiat_price.timestamp),
        );

        env.events().publish(
            (
                Symbol::new(env, "arbitrage"),
                Symbol::new(env, "fetching_stablecoin_price"),
            ),
            (pair.base.stablecoin_symbol.clone(),),
        );

        let stablecoin_price = Self::get_price_with_fallback(
            env,
            &pair.price_sources.stablecoin_sources,
            &pair.base.stablecoin_symbol,
            crypto_oracle,
            stellar_oracle,
        )?;

        env.events().publish(
            (
                Symbol::new(env, "arbitrage"),
                Symbol::new(env, "stablecoin_price_fetched"),
            ),
            (stablecoin_price.price, stablecoin_price.timestamp),
        );

        let expected_price = (fiat_price.price * pair.base.target_peg) / 10000;
        let deviation_bps = calculate_deviation_bps(stablecoin_price.price, expected_price);

        env.events().publish(
            (
                Symbol::new(env, "arbitrage"),
                Symbol::new(env, "price_calculation"),
            ),
            (
                expected_price,
                deviation_bps,
                pair.base.deviation_threshold_bps,
            ),
        );

        if deviation_bps >= pair.base.deviation_threshold_bps {
            env.events().publish(
                (
                    Symbol::new(env, "arbitrage"),
                    Symbol::new(env, "opportunity_found"),
                ),
                (deviation_bps,),
            );

            // Continue with opportunity creation...
            let trade_direction = if stablecoin_price.price > expected_price {
                Symbol::new(env, "SELL")
            } else {
                Symbol::new(env, "BUY")
            };

            let estimated_profit = Self::calculate_enhanced_profit(
                env,
                stablecoin_price.price,
                expected_price,
                &pair.fee_config,
            );

            let opportunity = EnhancedArbitrageOpportunity {
                base_opportunity: ArbitrageOpportunity {
                    pair: pair.base.clone(),
                    stablecoin_price: stablecoin_price.price,
                    fiat_rate: fiat_price.price,
                    deviation_bps,
                    estimated_profit,
                    trade_direction,
                    timestamp: env.ledger().timestamp(),
                },
                twap_price: None, // Simplified for debugging
                confidence_score: 8500,
                max_trade_size: pair.risk_config.max_position_size,
                venue_recommendations: Vec::new(env),
            };

            Some(opportunity)
        } else {
            env.events().publish(
                (
                    Symbol::new(env, "arbitrage"),
                    Symbol::new(env, "deviation_too_low"),
                ),
                (deviation_bps, pair.base.deviation_threshold_bps),
            );
            None
        }
    }

    fn get_price_with_fallback(
        env: &Env,
        sources: &Vec<OracleSource>,
        symbol: &Symbol,
        primary_oracle: &Address,
        fallback_oracle: &Address,
    ) -> Option<PriceData> {
        env.events().publish(
            (Symbol::new(env, "debug"), Symbol::new(env, "price_fetch_start")),
            (symbol.clone(), sources.len()),
        );
    
        let current_time = env.ledger().timestamp();
        let max_age = 600;
    
        for (index, source) in sources.iter().enumerate() {
            // FIX: Use explicit oracle address from source instead of routing logic
            let oracle_addr = if let Some(addr) = &source.address {
                addr
            } else {
                // Fallback to type-based routing only if no explicit address
                match source.oracle_type {
                    OracleType::Forex => primary_oracle,
                    OracleType::Crypto => &Address::from_string(&String::from_str(env, "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63")), // Force crypto oracle
                    OracleType::Stellar => fallback_oracle,
                }
            };
    
            env.events().publish(
                (Symbol::new(env, "debug"), Symbol::new(env, "trying_oracle")),
                (index as u32, oracle_addr.clone(), source.oracle_type.clone()),
            );
    
            let client = ReflectorClient::new(env, oracle_addr);
            
            // FIX: Try different asset formats for crypto assets
            let asset = if source.oracle_type == OracleType::Crypto {
                // Try multiple asset formats for crypto assets
                if let Some(price_data) = Self::try_crypto_asset_formats(env, &client, symbol, current_time, max_age) {
                    return Some(price_data);
                }
                continue;
            } else {
                match source.asset_type {
                    AssetType::Symbol => Asset::Other(symbol.clone()),
                    AssetType::Address => Asset::Stellar(source.address.clone().unwrap()),
                }
            };
    
            if let Some(price_data) = client.lastprice(&asset) {
                env.events().publish(
                    (Symbol::new(env, "debug"), Symbol::new(env, "oracle_response")),
                    (price_data.price, price_data.timestamp),
                );
    
                if check_price_freshness(&price_data, current_time, max_age) {
                    env.events().publish(
                        (Symbol::new(env, "debug"), Symbol::new(env, "price_accepted")),
                        (price_data.price,),
                    );
                    return Some(price_data);
                }
            } else {
                env.events().publish(
                    (Symbol::new(env, "debug"), Symbol::new(env, "oracle_null")),
                    (oracle_addr.clone(),),
                );
            }
        }
    
        None
    }
    // NEW: Helper function to create crypto-to-crypto pairs
pub fn add_crypto_to_crypto_pair(
    env: Env,
    caller: Address,
    base_crypto: Symbol,        // e.g., "USDC"
    quote_crypto: Symbol,       // e.g., "XLM"
    base_address: Address,      // Token contract address for base
    quote_address: Address,     // Token contract address for quote
    deviation_threshold: u32,   // e.g., 50 bps
) {
    caller.require_auth();
    Self::require_admin(&env, &caller);

    let crypto_oracle = Address::from_string(&String::from_str(&env, "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63"));

    let pair = EnhancedStablecoinPair {
        base: StablecoinPair {
            deviation_threshold_bps: deviation_threshold,
            fiat_symbol: base_crypto.clone(),
            stablecoin_address: quote_address.clone(),
            stablecoin_symbol: quote_crypto.clone(),
            target_peg: 10000,
        },
        enabled: true,
        fee_config: FeeConfiguration {
            bridge_fee_bps: 0,
            gas_fee_bps: 10,
            keeper_fee_bps: 0,
            trading_fee_bps: 30,
        },
        price_sources: PriceSources {
            fallback_enabled: true,
            fiat_sources: Vec::from_array(&env, [
                OracleSource {
                    address: Some(crypto_oracle.clone()),
                    asset_type: AssetType::Symbol,
                    max_age_seconds: 3600,
                    oracle_type: OracleType::Crypto,
                    priority: 1,
                }
            ]),
            min_sources_required: 1,
            stablecoin_sources: Vec::from_array(&env, [
                OracleSource {
                    address: Some(crypto_oracle.clone()),
                    asset_type: AssetType::Symbol,
                    max_age_seconds: 3600,
                    oracle_type: OracleType::Crypto,
                    priority: 1,
                }
            ]),
        },
        risk_config: RiskConfiguration {
            correlation_limit: 50000000000,
            max_daily_volume: 100000000000,
            max_position_size: 50000000000,
            volatility_threshold_bps: 10000,
        },
        twap_config: TWAPConfiguration {
            enabled: false,
            min_deviation_bps: 50,
            periods: 1,
        },
    };

    let mut pairs: Vec<EnhancedStablecoinPair> = env
        .storage()
        .instance()
        .get(&Symbol::new(&env, "pairs"))
        .unwrap_or(Vec::new(&env));

    pairs.push_back(pair);
    env.storage()
        .instance()
        .set(&Symbol::new(&env, "pairs"), &pairs);

    env.events().publish(
        (Symbol::new(&env, "crypto_pair"), Symbol::new(&env, "added")),
        (base_crypto, quote_crypto),
    );
}

    // NEW: Helper function to try different crypto asset formats
   // Fixed version without to_string()
   fn try_crypto_asset_formats(
    env: &Env,
    client: &ReflectorClient,
    symbol: &Symbol,
    current_time: u64,
    max_age: u64,
) -> Option<PriceData> {
    let formats_to_try = vec![
        &env,
        Asset::Other(symbol.clone()),                    // "XLM"
        Asset::Other(Symbol::new(env, "XLMUSD")),        // "XLMUSD" 
        Asset::Other(Symbol::new(env, "XLMUSDT")),       // "XLMUSDT"
        Asset::Other(Symbol::new(env, "XLM_USD")),       // "XLM_USD" (underscore allowed)
    ];

    for asset in formats_to_try.iter() {
        env.events().publish(
            (Symbol::new(env, "debug"), Symbol::new(env, "trying_asset_format")),
            (asset.clone(),),
        );

        if let Some(price_data) = client.lastprice(&asset) {
            env.events().publish(
                (Symbol::new(env, "debug"), Symbol::new(env, "asset_format_success")),
                (asset.clone(), price_data.price),
            );

            if check_price_freshness(&price_data, current_time, max_age) {
                return Some(price_data);
            }
        }
    }

    None
}

    
    pub fn debug_test_oracle(
        env: Env,
        oracle_address: Address,
        symbol: Symbol,
        asset_type: AssetType,
    ) -> Option<PriceData> {
        let client = ReflectorClient::new(&env, &oracle_address);
        let asset = match asset_type {
            AssetType::Symbol => Asset::Other(symbol),
            AssetType::Address => Asset::Stellar(oracle_address.clone()),
        };

        env.events().publish(
            (
                Symbol::new(&env, "debug_oracle"),
                Symbol::new(&env, "testing"),
            ),
            (oracle_address.clone(), asset.clone()),
        );

        let result = client.lastprice(&asset);

        env.events().publish(
            (
                Symbol::new(&env, "debug_oracle"),
                Symbol::new(&env, "result"),
            ),
            match &result {
                Some(data) => (data.price, data.timestamp),
                None => (0i128, 0u64),
            },
        );

        result
    }

    // Debug function to manually test pair evaluation
    pub fn debug_evaluate_pair(env: Env, pair_index: u32) -> Option<EnhancedArbitrageOpportunity> {
        let pairs: Vec<EnhancedStablecoinPair> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "pairs"))
            .unwrap_or(Vec::new(&env));

        if pair_index >= pairs.len() {
            return None;
        }

        let pair = pairs.get(pair_index).unwrap();

        env.events().publish(
            (
                Symbol::new(&env, "debug_pair"),
                Symbol::new(&env, "evaluating"),
            ),
            (
                pair.base.fiat_symbol.clone(),
                pair.base.stablecoin_symbol.clone(),
                pair.enabled,
            ),
        );

        let forex_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "forex_oracle"))
            .unwrap();
        let crypto_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "crypto_oracle"))
            .unwrap();
        let stellar_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "stellar_oracle"))
            .unwrap();

        Self::check_enhanced_arbitrage(&env, &pair, &forex_oracle, &crypto_oracle, &stellar_oracle)
    }

    // Debug function to get price source details
    pub fn debug_get_price_sources(env: Env, pair_index: u32) -> Option<PriceSources> {
        let pairs: Vec<EnhancedStablecoinPair> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "pairs"))
            .unwrap_or(Vec::new(&env));

        if pair_index >= pairs.len() {
            return None;
        }

        Some(pairs.get(pair_index).unwrap().price_sources.clone())
    }

    // Debug function to manually test price fetching
    pub fn debug_fetch_prices(
        env: Env,
        fiat_symbol: Symbol,
        stablecoin_symbol: Symbol,
        price_sources: PriceSources,
    ) -> (Option<PriceData>, Option<PriceData>) {
        let forex_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "forex_oracle"))
            .unwrap();
        let crypto_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "crypto_oracle"))
            .unwrap();
        let stellar_oracle: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "stellar_oracle"))
            .unwrap();

        let fiat_price = Self::get_price_with_fallback(
            &env,
            &price_sources.fiat_sources,
            &fiat_symbol,
            &forex_oracle,
            &stellar_oracle,
        );

        let stablecoin_price = Self::get_price_with_fallback(
            &env,
            &price_sources.stablecoin_sources,
            &stablecoin_symbol,
            &crypto_oracle,
            &stellar_oracle,
        );

        (fiat_price, stablecoin_price)
    }

    fn get_twap_price(env: &Env, oracle: &Address, symbol: &Symbol, periods: u32) -> Option<i128> {
        let client = ReflectorClient::new(env, oracle);
        let asset = Asset::Other(symbol.clone());
        client.twap(&asset, &periods)
    }

    fn validate_cross_price(
        env: &Env,
        oracle: &Address,
        stablecoin_symbol: &Symbol,
        fiat_symbol: &Symbol,
        stablecoin_price: i128,
        fiat_price: i128,
    ) -> bool {
        let client = ReflectorClient::new(env, oracle);
        let stablecoin_asset = Asset::Other(stablecoin_symbol.clone());
        let fiat_asset = Asset::Other(fiat_symbol.clone());

        if let Some(cross_price_data) = client.x_last_price(&stablecoin_asset, &fiat_asset) {
            let expected_cross = stablecoin_price / fiat_price;
            let deviation_bps = calculate_deviation_bps(cross_price_data.price, expected_cross);
            deviation_bps < 500
        } else {
            true
        }
    }

    fn calculate_enhanced_profit(
        _env: &Env,
        stablecoin_price: i128,
        expected_price: i128,
        fee_config: &FeeConfiguration,
    ) -> i128 {
        let price_diff = if stablecoin_price > expected_price {
            stablecoin_price - expected_price
        } else {
            expected_price - stablecoin_price
        };

        let total_fees_bps =
            fee_config.trading_fee_bps + fee_config.gas_fee_bps + fee_config.bridge_fee_bps;

        let gross_profit_per_unit = price_diff;
        let fee_per_unit = (gross_profit_per_unit * total_fees_bps as i128) / 10000;

        gross_profit_per_unit - fee_per_unit
    }

    fn calculate_confidence_score(deviation_bps: u32, risk_config: &RiskConfiguration) -> u32 {
        let deviation_score = (deviation_bps * 100).min(5000);
        let base_score = 3000;
        let risk_adjustment = if risk_config.max_position_size > 100000_0000000 {
            1000
        } else {
            500
        };

        (deviation_score + base_score + risk_adjustment).min(10000)
    }

    fn get_venue_recommendations(env: &Env, _token_address: &Address) -> Vec<TradingVenue> {
        let venues: Vec<TradingVenue> = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "trading_venues"))
            .unwrap_or(Vec::new(env));

        let mut recommendations = Vec::new(env);
        for venue in venues.iter() {
            if venue.enabled {
                recommendations.push_back(venue);
            }
        }

        recommendations
    }

    fn execute_real_trade(
        env: &Env,
        opportunity: &EnhancedArbitrageOpportunity,
        trade_amount: i128,
        _venue_address: &Address,
    ) -> TradeExecution {
        let token_in = &opportunity.base_opportunity.pair.stablecoin_address;
        let token_out = &opportunity.base_opportunity.pair.stablecoin_address;

        let deadline = env.ledger().timestamp() + 300;

        let config: ArbitrageConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "config"))
            .unwrap();

        let min_amount_out =
            trade_amount - ((trade_amount * config.slippage_tolerance_bps as i128) / 10000);

        match crate::dex::execute_real_swap(
            env,
            token_in,
            token_out,
            trade_amount,
            min_amount_out,
            &env.current_contract_address(),
            deadline,
        ) {
            Ok(swap_result) => {
                let gas_cost = crate::dex::estimate_gas_cost(env, 5);
                let net_profit = swap_result.amount_out - trade_amount - gas_cost;

                TradeExecution {
                    opportunity: opportunity.base_opportunity.clone(),
                    executed_amount: trade_amount,
                    actual_profit: net_profit,
                    gas_cost,
                    execution_timestamp: env.ledger().timestamp(),
                    status: Symbol::new(env, "SUCCESS"),
                }
            }
            Err(error) => {
                let error_symbol = match error {
                    crate::dex::DEXError::InsufficientLiquidity => {
                        Symbol::new(env, "INSUFFICIENT_LIQUIDITY")
                    }
                    crate::dex::DEXError::SlippageExceeded => Symbol::new(env, "SLIPPAGE_EXCEEDED"),
                    crate::dex::DEXError::DeadlineExceeded => Symbol::new(env, "DEADLINE_EXCEEDED"),
                    _ => Symbol::new(env, "SWAP_FAILED"),
                };

                TradeExecution {
                    opportunity: opportunity.base_opportunity.clone(),
                    executed_amount: 0,
                    actual_profit: 0,
                    gas_cost: 0,
                    execution_timestamp: env.ledger().timestamp(),
                    status: error_symbol,
                }
            }
        }
    }

    fn simulate_arbitrage_trade(
        env: &Env,
        opportunity: &EnhancedArbitrageOpportunity,
        trade_amount: i128,
        _venue_address: &Address,
    ) -> Option<SwapResult> {
        let token_in = &opportunity.base_opportunity.pair.stablecoin_address;
        let token_out = &opportunity.base_opportunity.pair.stablecoin_address;

        crate::dex::simulate_trade(env, token_in, token_out, trade_amount)
    }
    fn check_trade_risk(env: &Env, risk_manager: &Address, trade_size: i128) -> Symbol {
        let risk_client = RiskManagerClient::new(env, risk_manager);
        risk_client.check_trade_risk(&trade_size)
    }

    fn update_risk_manager(env: &Env, risk_manager: &Address, caller: &Address, volume: i128) {
        let risk_client = RiskManagerClient::new(env, risk_manager);
        risk_client.update_daily_volume(caller, &volume);
    }

    fn create_failed_execution(
        env: &Env,
        opportunity: &EnhancedArbitrageOpportunity,
        reason: &str,
    ) -> TradeExecution {
        let execution = TradeExecution {
            opportunity: opportunity.base_opportunity.clone(),
            executed_amount: 0,
            actual_profit: 0,
            gas_cost: 0,
            execution_timestamp: env.ledger().timestamp(),
            status: Symbol::new(env, reason),
        };

        env.events().publish(
            (
                Symbol::new(env, "trade_execution"),
                Symbol::new(env, "failed"),
            ),
            (execution.clone(),),
        );

        execution
    }

    fn require_keeper_or_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "admin"))
            .unwrap();
        if caller == &admin {
            return;
        }

        let keepers: Vec<Address> = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "keepers"))
            .unwrap_or(Vec::new(env));

        for keeper in keepers.iter() {
            if caller == &keeper {
                return;
            }
        }

        panic!("Unauthorized: caller is not admin or keeper");
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "admin"))
            .unwrap();
        if caller != &admin {
            panic!("Unauthorized: caller is not admin");
        }
    }

    fn require_dao_or_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "admin"))
            .unwrap();
        if caller == &admin {
            return;
        }

        if let Some(dao_address) = env
            .storage()
            .instance()
            .get::<Symbol, Address>(&Symbol::new(env, "dao_address"))
        {
            if caller == &dao_address {
                return;
            }
        }

        panic!("Unauthorized: caller is not admin or DAO");
    }

    fn store_trade_execution(env: &Env, execution: &TradeExecution) {
        let mut history: Vec<TradeExecution> = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "trade_history"))
            .unwrap_or(Vec::new(env));

        history.push_back(execution.clone());

        if history.len() > 100 {
            let mut new_history = Vec::new(env);
            for i in 1..history.len() {
                new_history.push_back(history.get(i).unwrap());
            }
            history = new_history;
        }

        env.storage()
            .instance()
            .set(&Symbol::new(env, "trade_history"), &history);

        env.events().publish(
            (
                Symbol::new(env, "trade_execution"),
                Symbol::new(env, "stored"),
            ),
            (execution.clone(),),
        );
    }

    fn calculate_metrics_from_trades(
        env: &Env,
        trades: &Vec<TradeExecution>,
        cutoff_time: u64,
        period_days: u32,
    ) -> PerformanceMetrics {
        let mut total_profit = 0i128;
        let mut total_trades = 0u32;
        let mut successful_trades = 0u32;
        let mut total_volume = 0i128;

        for trade in trades.iter() {
            if trade.execution_timestamp >= cutoff_time {
                total_trades += 1;
                total_volume += trade.executed_amount;
                total_profit += trade.actual_profit;

                if trade.status == Symbol::new(env, "SUCCESS") {
                    successful_trades += 1;
                }
            }
        }

        let success_rate_bps = if total_trades > 0 {
            (successful_trades * 10000) / total_trades
        } else {
            0
        };

        PerformanceMetrics {
            total_profit,
            total_trades,
            successful_trades,
            success_rate_bps,
            total_volume,
            avg_profit_per_trade: if total_trades > 0 {
                total_profit / total_trades as i128
            } else {
                0
            },
            period_days,
        }
    }

    fn execute_contract_trade(
        env: &Env,
        user: &Address,
        opportunity: &EnhancedArbitrageOpportunity,
        trade_amount: i128,
        venue_address: &Address,
    ) -> TradeExecution {
        let token_in = &opportunity.base_opportunity.pair.stablecoin_address;
        let token_out = &opportunity.base_opportunity.pair.stablecoin_address;

        let deadline = env.ledger().timestamp() + 300;

        let config: ArbitrageConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "config"))
            .unwrap();

        let min_amount_out =
            trade_amount - ((trade_amount * config.slippage_tolerance_bps as i128) / 10000);
        let dex_client = StellarDEXClient::new(env, venue_address);

        let path = Vec::from_array(env, [token_in.clone(), token_out.clone()]);

        let amounts = dex_client.swap_exact_tokens_for_tokens(
            &trade_amount,
            &min_amount_out,
            &path,
            &env.current_contract_address(),
            &deadline,
        );

        let amount_out = amounts.get(1).unwrap_or(0);
        let gas_cost = estimate_gas_cost(env, 3);
        let net_profit = amount_out - trade_amount - gas_cost;

        let execution = TradeExecution {
            opportunity: opportunity.base_opportunity.clone(),
            executed_amount: trade_amount,
            actual_profit: net_profit,
            gas_cost,
            execution_timestamp: env.ledger().timestamp(),
            status: Symbol::new(env, "SUCCESS"),
        };

        env.events().publish(
            (Symbol::new(env, "user_trade"), Symbol::new(env, "executed")),
            (user.clone(), execution.clone()),
        );

        execution
    }
}

#[soroban_sdk::contractclient(name = "TokenClient")]
pub trait Token {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);
}

#[soroban_sdk::contractclient(name = "ArbBotClient")]
pub trait ArbitrageBotContract {
    fn update_config_dao(env: Env, caller: Address, new_config: ArbitrageConfig);
    fn add_enhanced_pair_dao(env: Env, caller: Address, pair: EnhancedStablecoinPair);
    fn add_trading_venue_dao(env: Env, caller: Address, venue: TradingVenue);
    fn pause_pair_dao(env: Env, caller: Address, stablecoin_symbol: Symbol);
    fn emergency_stop(env: Env, caller: Address);
    fn transfer_admin(env: Env, current_admin: Address, new_admin: Address);
}

mod test;
