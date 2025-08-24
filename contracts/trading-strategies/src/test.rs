#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Address, Env};

#[test]
fn test_twap_calculation() {
    let env = Env::default();
    let contract_id = env.register(TradingStrategies, ());
    let client = TradingStrategiesClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let historical_prices = vec![&env, 10000i128, 10100i128, 9900i128, 10050i128];
    let current_price = 10500i128;

    let strategy = TWAPStrategy {
        window_periods: 4,
        min_deviation_bps: 200,  // 2%
        position_size_pct: 1000, // 10%
    };

    let signal = client.calculate_twap_signal(&current_price, &historical_prices, &strategy);
    assert_eq!(signal, Symbol::new(&env, "SELL_SIGNAL"));
}
