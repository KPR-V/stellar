#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TWAPStrategy {
    pub window_periods: u32,
    pub min_deviation_bps: u32,
    pub position_size_pct: u32,
}

#[contract]
pub struct TradingStrategies;

#[contractimpl]
impl TradingStrategies {
    pub fn initialize(env: Env, admin: Address) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "admin"), &admin);
    }

    pub fn calculate_twap_signal(
        env: Env,
        current_price: i128,
        historical_prices: Vec<i128>,
        strategy: TWAPStrategy,
    ) -> Symbol {
        if historical_prices.is_empty() {
            return Symbol::new(&env, "INSUFFICIENT_DATA");
        }

        let mut sum = 0i128;
        for i in 0..historical_prices.len() {
            sum += historical_prices.get(i).unwrap();
        }

        let twap = sum / historical_prices.len() as i128;
        let deviation_bps = if current_price > twap {
            ((current_price - twap) * 10000) / twap
        } else {
            ((twap - current_price) * 10000) / twap
        } as u32;

        if deviation_bps >= strategy.min_deviation_bps {
            if current_price > twap {
                Symbol::new(&env, "SELL_SIGNAL")
            } else {
                Symbol::new(&env, "BUY_SIGNAL")
            }
        } else {
            Symbol::new(&env, "NO_SIGNAL")
        }
    }
}

mod test;
