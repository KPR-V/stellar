#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskLimits {
    pub max_daily_volume: i128,
    pub max_position_size: i128,
    pub max_drawdown_bps: u32,
    pub var_limit: i128,
}

#[contract]
pub struct RiskManager;

#[contractimpl]
impl RiskManager {
    pub fn initialize(env: Env, admin: Address, limits: RiskLimits) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "admin"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "limits"), &limits);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "daily_volume"), &0i128);
    }

    pub fn check_trade_risk(env: Env, trade_size: i128) -> Symbol {
        let limits: RiskLimits = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "limits"))
            .unwrap();

        if trade_size > limits.max_position_size {
            return Symbol::new(&env, "POSITION_TOO_LARGE");
        }

        let daily_volume: i128 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "daily_volume"))
            .unwrap_or(0);

        if daily_volume + trade_size > limits.max_daily_volume {
            return Symbol::new(&env, "DAILY_LIMIT_EXCEEDED");
        }

        Symbol::new(&env, "APPROVED")
    }

    pub fn update_daily_volume(env: Env, caller: Address, volume_delta: i128) {
        caller.require_auth();

        let current_volume: i128 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "daily_volume"))
            .unwrap_or(0);

        env.storage().instance().set(
            &Symbol::new(&env, "daily_volume"),
            &(current_volume + volume_delta),
        );
    }

    pub fn get_limits(env: Env) -> RiskLimits {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "limits"))
            .unwrap()
    }
}
