use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

#[soroban_sdk::contractclient(name = "ReflectorClient")]
pub trait Contract {
    fn base(e: Env) -> Asset;

    fn assets(e: Env) -> Vec<Asset>;

    fn decimals(e: Env) -> u32;

    fn price(e: Env, asset: Asset, timestamp: u64) -> Option<PriceData>;

    fn lastprice(e: Env, asset: Asset) -> Option<PriceData>;

    fn prices(e: Env, asset: Asset, records: u32) -> Option<Vec<PriceData>>;

    fn x_last_price(e: Env, base_asset: Asset, quote_asset: Asset) -> Option<PriceData>;

    fn x_price(e: Env, base_asset: Asset, quote_asset: Asset, timestamp: u64) -> Option<PriceData>;

    fn x_prices(
        e: Env,
        base_asset: Asset,
        quote_asset: Asset,
        records: u32,
    ) -> Option<Vec<PriceData>>;

    fn twap(e: Env, asset: Asset, records: u32) -> Option<i128>;

    fn x_twap(e: Env, base_asset: Asset, quote_asset: Asset, records: u32) -> Option<i128>;

    fn resolution(e: Env) -> u32;

    fn period(e: Env) -> Option<u64>;

    fn last_timestamp(e: Env) -> u64;

    fn version(e: Env) -> u32;

    fn admin(e: Env) -> Option<Address>;
}

// Quoted asset definition
#[contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum Asset {
    Stellar(Address),
    Other(Symbol),
}

// Price record definition
#[contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[soroban_sdk::contracterror(export = false)]
#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum Error {
    AlreadyInitialized = 0,
    Unauthorized = 1,
    AssetMissing = 2,
    AssetAlreadyExists = 3,
    InvalidConfigVersion = 4,
    InvalidTimestamp = 5,
    InvalidUpdateLength = 6,
    AssetLimitExceeded = 7,
}
