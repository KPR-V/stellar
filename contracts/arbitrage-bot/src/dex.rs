use soroban_sdk::{
    contractclient, contracterror, contracttype, Address, Env, String, Vec as SorobanVec,
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

// ✅ FIXED: Soroswap Router Interface with correct argument counts
#[contractclient(name = "SoroswapRouterClient")]
pub trait SoroswapRouter {
    // Matches call with 6 arguments: env, amount_in, amount_out_min, path, to, deadline
    fn swap_exact_assets_for_assets(
        env: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: SorobanVec<Address>,
        to: Address,
        deadline: u64,
    ) -> SorobanVec<i128>;

    // Matches call with 3 arguments: env, amount_in, path
    fn get_amounts_out(env: Env, amount_in: i128, path: SorobanVec<Address>) -> SorobanVec<i128>;

    // Matches call with 3 arguments: env, token_a, token_b
    fn get_pair_reserves(env: Env, token_a: Address, token_b: Address) -> (i128, i128);
}

// ✅ FIXED: Token Client with correct argument count
#[contractclient(name = "TokenClient")]
pub trait Token {
    // Matches call with 3 arguments: env, spender, amount
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

// Real testnet addresses
pub const SOROSWAP_FACTORY_TESTNET: &str =
    "CDJTMBYKNUGINFQALHDMPLZYNGUV42GPN4B7QOYTWHRC4EE5IYJM6AES";
pub const SOROSWAP_ROUTER_TESTNET: &str =
    "CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS";
pub const USDC_TESTNET: &str = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
pub const XLM_TESTNET: &str = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

// ✅ FIXED: Real swap execution with corrected method calls
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
    let router = SoroswapRouterClient::new(env, &router_address);

    // ✅ FIXED: Correct token approval with 3 parameters
    let token_client = TokenClient::new(env, token_a);
    token_client.approve(&router_address, &amount_in);

    let mut path = SorobanVec::new(env);
    path.push_back(token_a.clone());
    path.push_back(token_b.clone());

    // ✅ FIXED: Correct swap call with 6 parameters
    let amounts =
        router.swap_exact_assets_for_assets(&amount_in, &min_amount_out, &path, &to, &deadline);

    if amounts.len() < 2 {
        return Err(DEXError::SwapFailed);
    }

    let amount_out = amounts.get(1).unwrap_or(0);
    if amount_out < min_amount_out {
        return Err(DEXError::SlippageExceeded);
    }

    // ✅ FIXED: Correct reserves call with 3 parameters
    let (reserve_a, reserve_b) = router.get_pair_reserves(&token_a, &token_b);

    let fees_paid = (amount_in * 30) / 10000;
    let price_impact = calculate_price_impact(amount_in, reserve_a, reserve_b);

    Ok(SwapResult {
        amount_out,
        fees_paid,
        price_impact_bps: price_impact,
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
    let router = SoroswapRouterClient::new(env, &router_address);

    let mut path = SorobanVec::new(env);
    path.push_back(token_a.clone());
    path.push_back(token_b.clone());

    // ✅ FIXED: Correct get_amounts_out call with 3 parameters
    let amounts = router.get_amounts_out(&amount_in, &path);

    if amounts.len() < 2 {
        return Err(DEXError::InsufficientLiquidity);
    }

    Ok(amounts.get(1).unwrap_or(0))
}

pub fn get_pair_info_real(
    env: &Env,
    token_a: &Address,
    token_b: &Address,
) -> Result<PairInfo, DEXError> {
    let router_address = Address::from_string(&String::from_str(env, SOROSWAP_ROUTER_TESTNET));
    let router = SoroswapRouterClient::new(env, &router_address);

    // ✅ FIXED: Correct get_pair_reserves call with 3 parameters
    let (reserve_a, reserve_b) = router.get_pair_reserves(&token_a, &token_b);

    if reserve_a == 0 || reserve_b == 0 {
        return Err(DEXError::InsufficientLiquidity);
    }

    Ok(PairInfo {
        reserve_a,
        reserve_b,
        fee_bps: 30,
        last_update: env.ledger().timestamp(),
    })
}

fn calculate_price_impact(amount_in: i128, reserve_in: i128, reserve_out: i128) -> u32 {
    if reserve_in == 0 || reserve_out == 0 {
        return u32::MAX;
    }

    let market_price = (reserve_out * 10000) / reserve_in;
    let new_reserve_in = reserve_in + amount_in;
    let new_reserve_out = (reserve_in * reserve_out) / new_reserve_in;
    let actual_out = reserve_out - new_reserve_out;
    let execution_price = (actual_out * 10000) / amount_in;

    let impact = if market_price > execution_price {
        market_price - execution_price
    } else {
        0
    };

    ((impact * 10000) / market_price) as u32
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
        Ok(amount_out) => match get_pair_info_real(env, token_in, token_out) {
            Ok(pair_info) => {
                let fees_paid = (amount_in * pair_info.fee_bps as i128) / 10000;
                let price_impact =
                    calculate_price_impact(amount_in, pair_info.reserve_a, pair_info.reserve_b);

                Some(SwapResult {
                    amount_out,
                    fees_paid,
                    price_impact_bps: price_impact,
                    success: true,
                })
            }
            Err(_) => None,
        },
        Err(_) => None,
    }
}

// ✅ FIXED: StellarDEXClient with correct method signature
pub struct StellarDEXClient;

impl StellarDEXClient {
    pub fn new(_env: &Env, _venue_address: &Address) -> Self {
        Self
    }

    // ✅ FIXED: Correct swap method signature with 7 parameters to match your lib.rs call
    pub fn swap(
        &self,
        env: Env,
        caller: &Address,
        token_in: &Address,
        token_out: &Address,
        amount_in: &i128,
        min_amount_out: &i128,
        deadline: &u64,
    ) -> SwapResult {
        match execute_real_swap(
            &env,
            token_in,
            token_out,
            *amount_in,
            *min_amount_out,
            caller,
            *deadline,
        ) {
            Ok(result) => result,
            Err(_) => SwapResult {
                amount_out: 0,
                fees_paid: 0,
                price_impact_bps: u32::MAX,
                success: false,
            },
        }
    }

    pub fn get_amounts_out(
        &self,
        env: &Env,
        amount_in: &i128,
        token_in: &Address,
        token_out: &Address,
    ) -> i128 {
        get_amounts_out_real(env, *amount_in, token_in, token_out).unwrap_or(0)
    }

    pub fn get_pair_info(
        &self,
        env: &Env,
        token_a: &Address,
        token_b: &Address,
    ) -> Option<PairInfo> {
        get_pair_info_real(env, token_a, token_b).ok()
    }
}
