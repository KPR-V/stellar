use soroban_sdk::{contractclient, contracttype, Address, Env};

// Stellar DEX/AMM interface for trading
#[contractclient(name = "StellarDEXClient")]
pub trait StellarDEX {
    fn swap(
        env: Env,
        caller: Address,
        token_a: Address,
        token_b: Address,
        amount_in: i128,
        min_amount_out: i128,
        deadline: u64,
    ) -> SwapResult;

    fn get_amounts_out(env: Env, amount_in: i128, token_a: Address, token_b: Address) -> i128;

    fn get_pair_info(env: Env, token_a: Address, token_b: Address) -> Option<PairInfo>;
}

// Standard token interface for approvals and transfers
#[contractclient(name = "TokenClient")]
pub trait Token {
    fn approve(env: Env, spender: Address, amount: i128);
    fn transfer(env: Env, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
    fn allowance(env: Env, from: Address, spender: Address) -> i128;
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwapResult {
    pub amount_out: i128,
    pub fees_paid: i128,
    pub price_impact_bps: u32,
    pub success: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PairInfo {
    pub reserve_a: i128,
    pub reserve_b: i128,
    pub fee_bps: u32,
    pub last_update: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TradingVenue {
    pub dex_address: Address,
    pub fee_bps: u32,
    pub min_liquidity: i128,
    pub enabled: bool,
}

pub fn calculate_slippage_bps(expected_out: i128, actual_out: i128) -> u32 {
    if expected_out == 0 {
        return u32::MAX;
    }

    let slippage = if expected_out > actual_out {
        expected_out - actual_out
    } else {
        0
    };

    ((slippage * 10000) / expected_out) as u32
}

pub fn estimate_gas_cost(_env: &Env, complexity_score: u32) -> i128 {
    // Base gas cost + complexity multiplier
    let base_cost = 50000i128;
    let variable_cost = (complexity_score as i128) * 1000;
    base_cost + variable_cost
}

pub fn simulate_trade(
    _env: &Env,
    dex_client: &StellarDEXClient,
    token_in: &Address,
    token_out: &Address,
    amount_in: i128,
) -> Option<SwapResult> {
    // FIXED: The generated client methods don't include env parameter
    // get_amounts_out(amount_in, token_a, token_b) -> i128
    let expected_out = dex_client.get_amounts_out(&amount_in, token_in, token_out);

    if expected_out > 0 {
        // FIXED: get_pair_info(token_a, token_b) -> Option<PairInfo>
        if let Some(pair_info) = dex_client.get_pair_info(token_in, token_out) {
            let fees_paid = (amount_in * pair_info.fee_bps as i128) / 10000;

            Some(SwapResult {
                amount_out: expected_out,
                fees_paid,
                price_impact_bps: 0, // Would calculate based on reserves
                success: true,
            })
        } else {
            None
        }
    } else {
        None
    }
}
