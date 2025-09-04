use soroban_sdk::{
    contractclient, contracterror, contracttype, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum DEXError {
    InsufficientLiquidity = 1,
    SlippageExceeded = 2,
    DeadlineExceeded = 3,
    TokenApprovalFailed = 4,
    SwapFailed = 5,
}

// ✅ FIXED: Soroswap Router interface with references
#[contractclient(name = "StellarDEXClient")]
pub trait SoroswapRouter {
    fn swap_exact_tokens_for_tokens(
        env: Env,
        amount_in: &i128,
        amount_out_min: &i128,
        path: &Vec<Address>,
        to: &Address,
        deadline: &u64,
    ) -> Vec<i128>;

    fn get_amounts_out(
        env: Env,
        amount_in: &i128,
        path: &Vec<Address>,
    ) -> Vec<i128>;
}

#[contractclient(name = "TokenClient")]
pub trait Token {
    fn approve(env: Env, spender: &Address, amount: &i128);
    fn transfer(env: Env, from: &Address, to: &Address, amount: &i128);
    fn balance(env: Env, id: &Address) -> i128;
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwapResult {
    pub amount_out: i128,
    pub fees_paid: i128,
    pub price_impact_bps: u32,
    pub success: bool,
}

// Soroswap testnet router address
pub const SOROSWAP_ROUTER_TESTNET: &str = "CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS";

// ✅ FIXED: Real swap execution with correct parameter passing
pub fn execute_real_swap(
    env: &Env,
    token_a: &Address,
    token_b: &Address,
    amount_in: i128,
    min_amount_out: i128,
    to: &Address,
    deadline: u64,
) -> Result<SwapResult, DEXError> {
    if env.ledger().timestamp() > deadline {
        return Err(DEXError::DeadlineExceeded);
    }

    let router_address = Address::from_string(&String::from_str(env, SOROSWAP_ROUTER_TESTNET));
    let router = StellarDEXClient::new(env, &router_address);

    let token_client = TokenClient::new(env, token_a);
    // ✅ FIXED: Pass by reference
    token_client.approve(&router_address, &amount_in);

    let path = Vec::from_array(env, [token_a.clone(), token_b.clone()]);

    // ✅ FIXED: Pass all arguments by reference
    let amounts = router.swap_exact_tokens_for_tokens(
        &amount_in,
        &min_amount_out,
        &path,
        to,
        &deadline,
    );

    if amounts.len() < 2 {
        return Err(DEXError::SwapFailed);
    }

    let amount_out = amounts.get(1).unwrap_or(0);
    if amount_out < min_amount_out {
        return Err(DEXError::SlippageExceeded);
    }

    let fees_paid = (amount_in * 30) / 10000;
    
    Ok(SwapResult {
        amount_out,
        fees_paid,
        price_impact_bps: 0,
        success: true,
    })
}

pub fn get_amounts_out_real(
    env: &Env,
    amount_in: i128,
    token_a: &Address,
    token_b: &Address,
) -> Result<i128, DEXError> {
    let router_address = Address::from_string(&String::from_str(env, SOROSWAP_ROUTER_TESTNET));
    let router = StellarDEXClient::new(env, &router_address);

    let path = Vec::from_array(env, [token_a.clone(), token_b.clone()]);
    // ✅ FIXED: Pass arguments by reference
    let amounts = router.get_amounts_out(&amount_in, &path);

    if amounts.len() < 2 {
        return Err(DEXError::InsufficientLiquidity);
    }

    Ok(amounts.get(1).unwrap_or(0))
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

pub fn estimate_gas_cost(env: &Env, complexity_score: u32) -> i128 {
    let base_cost = 100000i128;
    let variable_cost = (complexity_score as i128) * 2500;
    
    let network_multiplier = if env.ledger().sequence() % 100 > 80 {
        150
    } else {
        100
    };

    ((base_cost + variable_cost) * network_multiplier) / 100
}

pub fn simulate_trade(
    env: &Env,
    token_in: &Address,
    token_out: &Address,
    amount_in: i128,
) -> Option<SwapResult> {
    match get_amounts_out_real(env, amount_in, token_in, token_out) {
        Ok(amount_out) => Some(SwapResult {
            amount_out,
            fees_paid: (amount_in * 30) / 10000,
            price_impact_bps: 0,
            success: true,
        }),
        Err(_) => None,
    }
}
