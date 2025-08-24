#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, testutils::Address as _};

#[test]
fn test_risk_check() {
    let env = Env::default();
    let contract_id = env.register(RiskManager, ());
    let client = RiskManagerClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let limits = RiskLimits {
        max_daily_volume: 1000000_0000000,
        max_position_size: 100000_0000000,
        max_drawdown_bps: 500,
        var_limit: 50000_0000000,
    };
    
    client.initialize(&admin, &limits);
    
    let result = client.check_trade_risk(&50000_0000000i128);
    assert_eq!(result, Symbol::new(&env, "APPROVED"));
    
    let result = client.check_trade_risk(&200000_0000000i128);
    assert_eq!(result, Symbol::new(&env, "POSITION_TOO_LARGE"));
}
