use crate::reflector::PriceData;
use shared_types::*;
use soroban_sdk::{Env, Symbol};

pub fn calculate_deviation_bps(current_price: i128, target_price: i128) -> u32 {
    let deviation = if current_price > target_price {
        current_price - target_price
    } else {
        target_price - current_price
    };

    if target_price == 0 {
        return u32::MAX;
    }

    ((deviation * 10000) / target_price) as u32
}

pub fn calculate_profit_estimate(
    opportunity: &ArbitrageOpportunity,
    trade_amount: i128,
    trading_fees_bps: u32,
) -> i128 {
    let price_diff = if opportunity.stablecoin_price > opportunity.fiat_rate {
        opportunity.stablecoin_price - opportunity.fiat_rate
    } else {
        opportunity.fiat_rate - opportunity.stablecoin_price
    };

    let gross_profit = (trade_amount * price_diff) / 10000;
    let trading_fees = (trade_amount * trading_fees_bps as i128) / 10000;

    gross_profit - trading_fees
}

pub fn validate_trade_size(trade_amount: i128, config: &ArbitrageConfig) -> bool {
    trade_amount > 0 && trade_amount <= config.max_trade_size
}

pub fn check_price_freshness(
    price_data: &PriceData,
    current_time: u64,
    max_age_seconds: u64,
) -> bool {
    current_time.saturating_sub(price_data.timestamp) <= max_age_seconds
}

pub fn calculate_position_size_with_risk(
    base_amount: i128,
    volatility_score: u32, // 0-10000, where 10000 = 100%
    max_risk_pct: u32,     // Maximum risk percentage in basis points
) -> i128 {
    let risk_adjustment = 10000u32.saturating_sub(volatility_score);
    let size_multiplier = (risk_adjustment * max_risk_pct) / 100000000; // Normalize
    (base_amount * size_multiplier as i128) / 10000
}

pub fn format_trade_direction_symbol(env: &Env, is_buy: bool) -> Symbol {
    if is_buy {
        Symbol::new(env, "BUY")
    } else {
        Symbol::new(env, "SELL")
    }
}
