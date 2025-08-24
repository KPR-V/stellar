#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Symbol};

#[test]
fn test_initialize_testnet() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let risk_manager = Address::generate(&env);

    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &risk_manager);

    let retrieved_config = client.get_config();
    assert_eq!(config.min_profit_bps, retrieved_config.min_profit_bps);
    assert_eq!(config.enabled, retrieved_config.enabled);
}

#[test]
fn test_enhanced_pair_management() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    // Initialize
    let admin = Address::generate(&env);
    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &Address::generate(&env));

    // Create enhanced pair
    let base_pair = StablecoinPair {
        stablecoin_symbol: Symbol::new(&env, "USDC"),
        fiat_symbol: Symbol::new(&env, "USD"),
        stablecoin_address: Address::generate(&env),
        target_peg: 10000,
        deviation_threshold_bps: 25,
    };

    let enhanced_pair = EnhancedStablecoinPair::from_basic(&env, base_pair);

    env.mock_all_auths();
    client.add_enhanced_pair(&admin, &enhanced_pair);

    let pairs = client.get_pairs();
    assert_eq!(pairs.len(), 1);
    assert_eq!(
        pairs.get(0).unwrap().stablecoin_symbol,
        Symbol::new(&env, "USDC")
    );
}

#[test]
fn test_keeper_management() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let keeper = Address::generate(&env);

    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &Address::generate(&env));

    env.mock_all_auths();
    client.add_keeper(&admin, &keeper);
}

#[test]
fn test_trading_venue_management() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &Address::generate(&env));

    let venue = TradingVenue {
        dex_address: Address::generate(&env),
        fee_bps: 30,
        min_liquidity: 1000_0000000,
        enabled: true,
    };

    env.mock_all_auths();
    client.add_trading_venue(&admin, &venue);
}

#[test]
fn test_performance_metrics() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &Address::generate(&env));

    let metrics = client.get_performance_metrics(&30u32); // Last 30 days
    assert_eq!(metrics.total_trades, 0); // No trades yet
    assert_eq!(metrics.total_profit, 0);
}

#[test]
fn test_pair_pause_functionality() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &Address::generate(&env));

    // Add a pair first
    let base_pair = StablecoinPair {
        stablecoin_symbol: Symbol::new(&env, "USDC"),
        fiat_symbol: Symbol::new(&env, "USD"),
        stablecoin_address: Address::generate(&env),
        target_peg: 10000,
        deviation_threshold_bps: 25,
    };

    let enhanced_pair = EnhancedStablecoinPair::from_basic(&env, base_pair);

    env.mock_all_auths();
    client.add_enhanced_pair(&admin, &enhanced_pair);

    // Pause the pair
    client.pause_pair(&admin, &Symbol::new(&env, "USDC"));
}

#[test]
fn test_enhanced_opportunity_scanning() {
    let env = Env::default();
    let contract_id = env.register(ArbitrageBot, ());
    let client = ArbitrageBotClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let config = ArbitrageConfig {
        min_profit_bps: 50,
        max_trade_size: 100000_0000000,
        slippage_tolerance_bps: 100,
        enabled: true,
        max_gas_price: 1000000,
        min_liquidity: 1000_0000000,
    };

    client.initialize_testnet(&admin, &config, &Address::generate(&env));

    let opportunities = client.scan_advanced_opportunities();
    assert_eq!(opportunities.len(), 0); // No pairs added yet
}

#[test]
fn test_oracle_integration_testnet_addresses() {
    let env = Env::default();

    // Test that we can create addresses from the testnet oracle strings
    let stellar_oracle = Address::from_string(&String::from_str(&env, STELLAR_ORACLE_TESTNET));
    let forex_oracle = Address::from_string(&String::from_str(&env, FOREX_ORACLE_TESTNET));
    let crypto_oracle = Address::from_string(&String::from_str(&env, CRYPTO_ORACLE_TESTNET));

    // These should not panic and should create valid addresses
    assert_eq!(
        stellar_oracle.to_string(),
        String::from_str(&env, STELLAR_ORACLE_TESTNET)
    );
    assert_eq!(
        forex_oracle.to_string(),
        String::from_str(&env, FOREX_ORACLE_TESTNET)
    );
    assert_eq!(
        crypto_oracle.to_string(),
        String::from_str(&env, CRYPTO_ORACLE_TESTNET)
    );
}

#[test]
fn test_deviation_calculation() {
    let current_price = 1_0200i128; // $1.0200
    let target_price = 1_0000i128; // $1.0000

    let deviation = calculate_deviation_bps(current_price, target_price);
    assert_eq!(deviation, 200); // 2% deviation
}

#[test]
fn test_profit_estimation() {
    let opportunity = ArbitrageOpportunity {
        pair: StablecoinPair {
            stablecoin_symbol: Symbol::new(&Env::default(), "USDC"),
            fiat_symbol: Symbol::new(&Env::default(), "USD"),
            stablecoin_address: Address::generate(&Env::default()),
            target_peg: 10000,
            deviation_threshold_bps: 25,
        },
        stablecoin_price: 1_0200i128,
        fiat_rate: 1_0000i128,
        deviation_bps: 200,
        estimated_profit: 200, // $0.02 per unit
        trade_direction: Symbol::new(&Env::default(), "SELL"),
        timestamp: 1234567890,
    };

    let trade_amount = 10000_0000000i128; // $10,000
    let trading_fees_bps = 30u32; // 0.3%

    let profit = calculate_profit_estimate(&opportunity, trade_amount, trading_fees_bps);

    // Should account for fees and price difference
    assert!(profit > 0);
}
