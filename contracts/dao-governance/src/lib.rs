#![no_std]
#![allow(dead_code)]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, String, Symbol, Vec,
};

use shared_types::{ArbitrageConfig, EnhancedStablecoinPair, TradingVenue};

const KALE_TOKEN_ADDRESS: &str = "CAAVU2UQJLMZ3GUZFM56KVNHLPA3ZSSNR4VP2U53YBXFD2GI3QLIVHZZ";

const EXECUTION_TIMELOCK: u64 = 24 * 60 * 60;

const MAX_DESCRIPTION_LENGTH: u32 = 1000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalType {
    UpdateConfig,
    AddTradingPair,
    AddTradingVenue,
    PausePair,
    UpdateRiskManager,
    EmergencyStop,
    TransferAdmin,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Failed,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalData {
    pub config_data: Option<ArbitrageConfig>,
    pub pair_data: Option<EnhancedStablecoinPair>,
    pub venue_data: Option<TradingVenue>,
    pub symbol_data: Option<Symbol>,
    pub admin_address: Option<Address>,
    pub generic_data: Option<Bytes>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub proposal_type: ProposalType,
    pub title: String,
    pub description: String,
    pub target_contract: Address,
    pub proposal_data: ProposalData,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub execution_earliest: u64,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub status: ProposalStatus,
    pub quorum_required: i128,
    pub executed_at: Option<u64>,
    pub cancelled_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Vote {
    pub voter: Address,
    pub proposal_id: u64,
    pub voting_power: i128,
    pub vote_yes: bool,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakeInfo {
    pub amount: i128,
    pub staked_at: u64,
    pub last_stake_update: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DAOConfig {
    pub min_stake_to_propose: i128,
    pub voting_duration_ledgers: u64,
    pub quorum_percentage: u32,
    pub execution_delay: u64,
    pub proposal_threshold_bps: u32,
}

#[contract]
pub struct DAOGovernance;

#[contractimpl]
impl DAOGovernance {
    pub fn initialize(
        env: Env,
        admin: Address,
        arbitrage_bot_address: Address,
        dao_config: DAOConfig,
    ) {
        admin.require_auth();

        if env
            .storage()
            .instance()
            .has(&Symbol::new(&env, "initialized"))
        {
            panic!("DAO already initialized");
        }

        if dao_config.quorum_percentage > 100 {
            panic!("Quorum percentage cannot exceed 100");
        }
        if dao_config.proposal_threshold_bps > 10000 {
            panic!("Proposal threshold cannot exceed 100%");
        }

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "admin"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "arbitrage_bot"), &arbitrage_bot_address);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "dao_config"), &dao_config);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "proposal_counter"), &0u64);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "total_staked"), &0i128);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "initialized"), &true);
        env.events().publish(
            (Symbol::new(&env, "dao"), Symbol::new(&env, "initialized")),
            (admin, arbitrage_bot_address),
        );
    }

    pub fn stake_kale(env: Env, staker: Address, amount: i128) {
        staker.require_auth();

        if amount <= 0 {
            panic!("Stake amount must be positive");
        }

        let kale_token = Address::from_string(&String::from_str(&env, KALE_TOKEN_ADDRESS));
        let token_client = TokenClient::new(&env, &kale_token);

        let user_balance = token_client.balance(&staker);
        if user_balance < amount {
            panic!("Insufficient KALE balance");
        }

        token_client.transfer(&staker, &env.current_contract_address(), &amount);

        let stake_key = (Symbol::new(&env, "stake"), staker.clone());
        let current_stake: StakeInfo =
            env.storage()
                .persistent()
                .get(&stake_key)
                .unwrap_or(StakeInfo {
                    amount: 0,
                    staked_at: env.ledger().timestamp(),
                    last_stake_update: env.ledger().timestamp(),
                });

        let new_stake = StakeInfo {
            amount: current_stake.amount + amount,
            staked_at: current_stake.staked_at,
            last_stake_update: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&stake_key, &new_stake);

        let total_staked = Self::get_total_staked(&env);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "total_staked"), &(total_staked + amount));

        env.events().publish(
            (
                Symbol::new(&env, "kale_staked"),
                Symbol::new(&env, "success"),
            ),
            (staker, amount, new_stake.amount),
        );
    }

    pub fn unstake_kale(env: Env, staker: Address, amount: i128) {
        staker.require_auth();

        let stake_key = (Symbol::new(&env, "stake"), staker.clone());
        let stake_info: StakeInfo = env
            .storage()
            .persistent()
            .get(&stake_key)
            .expect("No stake found");

        if stake_info.amount < amount {
            panic!("Insufficient staked amount");
        }

        let cooldown_period = 7 * 24 * 60 * 60;
        let ledger_time = env.ledger().timestamp();
        if ledger_time < stake_info.last_stake_update + cooldown_period {
            panic!("Cooldown period not met");
        }

        let new_stake = StakeInfo {
            amount: stake_info.amount - amount,
            staked_at: stake_info.staked_at,
            last_stake_update: stake_info.last_stake_update,
        };

        if new_stake.amount > 0 {
            env.storage().persistent().set(&stake_key, &new_stake);
        } else {
            env.storage().persistent().remove(&stake_key);
        }

        let total_staked = Self::get_total_staked(&env);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "total_staked"), &(total_staked - amount));

        let kale_token = Address::from_string(&String::from_str(&env, KALE_TOKEN_ADDRESS));
        let token_client = TokenClient::new(&env, &kale_token);
        token_client.transfer(&env.current_contract_address(), &staker, &amount);

        env.events().publish(
            (
                Symbol::new(&env, "kale_unstaked"),
                Symbol::new(&env, "success"),
            ),
            (staker, amount, new_stake.amount),
        );
    }

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        proposal_type: ProposalType,
        title: String,
        description: String,
        proposal_data: ProposalData,
    ) -> u64 {
        proposer.require_auth();

        if title.len() > 100 {
            panic!("Title too long");
        }
        if description.len() > MAX_DESCRIPTION_LENGTH {
            panic!("Description too long");
        }

        let dao_config: DAOConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "dao_config"))
            .unwrap();

        let stake_key = (Symbol::new(&env, "stake"), proposer.clone());
        let stake_info: StakeInfo = env
            .storage()
            .persistent()
            .get(&stake_key)
            .expect("Must stake KALE to create proposals");

        if stake_info.amount < dao_config.min_stake_to_propose {
            panic!("Insufficient stake to create proposal");
        }

        let total_staked = Self::get_total_staked(&env);
        let required_stake = (total_staked * dao_config.proposal_threshold_bps as i128) / 10000;
        if stake_info.amount < required_stake {
            panic!("Insufficient stake relative to total staked");
        }

        let proposal_id: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "proposal_counter"))
            .unwrap();
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "proposal_counter"), &(proposal_id + 1));

        let voting_ends_at = env.ledger().sequence() as u64 + dao_config.voting_duration_ledgers;
        let execution_earliest = env.ledger().timestamp() + dao_config.execution_delay;

        let quorum_required = (total_staked * dao_config.quorum_percentage as i128) / 100;

        let target_contract: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "arbitrage_bot"))
            .unwrap();

        let proposal = Proposal {
            id: proposal_id,
            proposer: proposer.clone(),
            proposal_type,
            title,
            description,
            target_contract,
            proposal_data,
            created_at: env.ledger().timestamp(),
            voting_ends_at,
            execution_earliest,
            yes_votes: 0,
            no_votes: 0,
            status: ProposalStatus::Active,
            quorum_required,
            executed_at: None,
            cancelled_at: None,
        };

        Self::validate_proposal_data(&env, &proposal);

        let proposal_key = (Symbol::new(&env, "proposal"), proposal_id);
        env.storage().persistent().set(&proposal_key, &proposal);
        env.events().publish(
            (
                Symbol::new(&env, "proposal_created"),
                Symbol::new(&env, "success"),
            ),
            (proposal_id, proposer),
        );

        proposal_id
    }

    pub fn cancel_proposal(env: Env, proposer: Address, proposal_id: u64) {
        proposer.require_auth();

        let proposal_key = (Symbol::new(&env, "proposal"), proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_key)
            .expect("Proposal not found");

        if proposal.proposer != proposer {
            panic!("Only proposer can cancel");
        }

        if proposal.status != ProposalStatus::Active {
            panic!("Can only cancel active proposals");
        }

        proposal.status = ProposalStatus::Cancelled;
        proposal.cancelled_at = Some(env.ledger().timestamp());
        env.storage().persistent().set(&proposal_key, &proposal);

        env.events().publish(
            (
                Symbol::new(&env, "proposal_cancelled"),
                Symbol::new(&env, "success"),
            ),
            (proposal_id, proposer),
        );
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u64, vote_yes: bool) {
        voter.require_auth();

        let proposal_key = (Symbol::new(&env, "proposal"), proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_key)
            .expect("Proposal not found");

        if (env.ledger().sequence() as u64) > proposal.voting_ends_at {
            panic!("Voting period has ended");
        }

        if proposal.status != ProposalStatus::Active {
            panic!("Proposal is not active");
        }

        let stake_key = (Symbol::new(&env, "stake"), voter.clone());
        let stake_info: StakeInfo = env
            .storage()
            .persistent()
            .get(&stake_key)
            .expect("Must stake KALE to vote");

        let voting_power = if stake_info.staked_at <= proposal.created_at {
            stake_info.amount
        } else {
            0
        };

        if voting_power == 0 {
            panic!("No voting power at proposal creation time");
        }

        let vote_key = (Symbol::new(&env, "vote"), voter.clone(), proposal_id);
        if env.storage().persistent().has(&vote_key) {
            panic!("Already voted on this proposal");
        }

        let vote = Vote {
            voter: voter.clone(),
            proposal_id,
            voting_power,
            vote_yes,
            timestamp: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&vote_key, &vote);

        if vote_yes {
            proposal.yes_votes += voting_power;
        } else {
            proposal.no_votes += voting_power;
        }

        env.storage().persistent().set(&proposal_key, &proposal);

        env.events().publish(
            (Symbol::new(&env, "vote_cast"), Symbol::new(&env, "success")),
            (voter, proposal_id, vote_yes, voting_power),
        );
    }

    pub fn finalize_proposal(env: Env, proposal_id: u64) {
        let proposal_key = (Symbol::new(&env, "proposal"), proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_key)
            .expect("Proposal not found");

        if (env.ledger().sequence() as u64) <= proposal.voting_ends_at {
            panic!("Voting period not yet ended");
        }

        if proposal.status != ProposalStatus::Active {
            panic!("Proposal is not active");
        }

        let total_votes = proposal.yes_votes + proposal.no_votes;

        if total_votes >= proposal.quorum_required && proposal.yes_votes > proposal.no_votes {
            proposal.status = ProposalStatus::Passed;
        } else {
            proposal.status = ProposalStatus::Failed;
        }

        env.storage().persistent().set(&proposal_key, &proposal);

        env.events().publish(
            (
                Symbol::new(&env, "proposal_finalized"),
                Symbol::new(&env, "success"),
            ),
            (proposal_id, proposal.status.clone()),
        );
    }

    pub fn execute_proposal(env: Env, executor: Address, proposal_id: u64) {
        executor.require_auth();

        let proposal_key = (Symbol::new(&env, "proposal"), proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_key)
            .expect("Proposal not found");

        if proposal.status != ProposalStatus::Passed {
            panic!("Proposal has not passed");
        }

        if env.ledger().timestamp() < proposal.execution_earliest {
            panic!("Execution timelock not met");
        }

        match proposal.proposal_type {
            ProposalType::UpdateConfig => {
                Self::execute_config_update(&env, &proposal);
            }
            ProposalType::AddTradingPair => {
                Self::execute_add_trading_pair(&env, &proposal);
            }
            ProposalType::AddTradingVenue => {
                Self::execute_add_trading_venue(&env, &proposal);
            }
            ProposalType::PausePair => {
                Self::execute_pause_pair(&env, &proposal);
            }
            ProposalType::EmergencyStop => {
                Self::execute_emergency_stop(&env, &proposal);
            }
            ProposalType::TransferAdmin => {
                Self::execute_transfer_admin(&env, &proposal);
            }
            ProposalType::UpdateRiskManager => {
                Self::execute_update_risk_manager(&env, &proposal);
            }
        }

        proposal.status = ProposalStatus::Executed;
        proposal.executed_at = Some(env.ledger().timestamp());
        env.storage().persistent().set(&proposal_key, &proposal);

        env.events().publish(
            (
                Symbol::new(&env, "proposal_executed"),
                Symbol::new(&env, "success"),
            ),
            (proposal_id, executor),
        );
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        let proposal_key = (Symbol::new(&env, "proposal"), proposal_id);
        env.storage()
            .persistent()
            .get(&proposal_key)
            .expect("Proposal not found")
    }

    pub fn get_all_proposals(env: Env) -> Vec<Proposal> {
        let proposal_count: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "proposal_counter"))
            .unwrap_or(0);

        let mut proposals = Vec::new(&env);

        for i in 0..proposal_count {
            let proposal_key = (Symbol::new(&env, "proposal"), i);
            if let Some(proposal) = env
                .storage()
                .persistent()
                .get::<(Symbol, u64), Proposal>(&proposal_key)
            {
                proposals.push_back(proposal);
            }
        }

        proposals
    }

    pub fn get_proposals_paginated(env: Env, start: u64, limit: u32) -> Vec<Proposal> {
        let proposal_count: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "proposal_counter"))
            .unwrap_or(0);

        let mut proposals = Vec::new(&env);
        let end = (start + limit as u64).min(proposal_count);

        for i in start..end {
            let proposal_key = (Symbol::new(&env, "proposal"), i);
            if let Some(proposal) = env
                .storage()
                .persistent()
                .get::<(Symbol, u64), Proposal>(&proposal_key)
            {
                proposals.push_back(proposal);
            }
        }

        proposals
    }

    pub fn get_active_proposals(env: Env) -> Vec<Proposal> {
        let proposal_count: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "proposal_counter"))
            .unwrap_or(0);

        let mut active_proposals = Vec::new(&env);

        for i in 0..proposal_count {
            let proposal_key = (Symbol::new(&env, "proposal"), i);
            if let Some(proposal) = env
                .storage()
                .persistent()
                .get::<(Symbol, u64), Proposal>(&proposal_key)
            {
                if proposal.status == ProposalStatus::Active {
                    active_proposals.push_back(proposal);
                }
            }
        }

        active_proposals
    }
    pub fn get_proposal_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "proposal_counter"))
            .unwrap_or(0)
    }

    pub fn get_stake(env: Env, user: Address) -> i128 {
        let stake_key = (Symbol::new(&env, "stake"), user);
        env.storage()
            .persistent()
            .get(&stake_key)
            .map(|info: StakeInfo| info.amount)
            .unwrap_or(0)
    }

    pub fn get_stake_info(env: Env, user: Address) -> Option<StakeInfo> {
        let stake_key = (Symbol::new(&env, "stake"), user);
        env.storage().persistent().get(&stake_key)
    }

    pub fn get_total_staked(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&Symbol::new(env, "total_staked"))
            .unwrap_or(0i128)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "admin"))
            .unwrap()
    }

    pub fn get_dao_config(env: Env) -> DAOConfig {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "dao_config"))
            .unwrap()
    }

    pub fn get_user_vote(env: Env, user: Address, proposal_id: u64) -> Option<Vote> {
        let vote_key = (Symbol::new(&env, "vote"), user, proposal_id);
        env.storage().persistent().get(&vote_key)
    }

    fn validate_proposal_data(_env: &Env, proposal: &Proposal) {
        match &proposal.proposal_type {
            ProposalType::TransferAdmin => {
                if proposal.proposal_data.admin_address.is_none() {
                    panic!("admin_address required for TransferAdmin proposal");
                }
            }
            ProposalType::UpdateConfig => {
                if proposal.proposal_data.config_data.is_none() {
                    panic!("Config data required for UpdateConfig proposal");
                }
            }
            ProposalType::AddTradingPair => {
                if proposal.proposal_data.pair_data.is_none() {
                    panic!("Pair data required for AddTradingPair proposal");
                }
            }
            ProposalType::AddTradingVenue => {
                if proposal.proposal_data.venue_data.is_none() {
                    panic!("Venue data required for AddTradingVenue proposal");
                }
            }
            ProposalType::PausePair => {
                if proposal.proposal_data.symbol_data.is_none() {
                    panic!("Symbol data required for PausePair proposal");
                }
            }
            _ => {}
        }
    }

    fn execute_config_update(env: &Env, proposal: &Proposal) {
        let bot_client = ArbBotClient::new(env, &proposal.target_contract);

        if let Some(config) = &proposal.proposal_data.config_data {
            bot_client.update_config_dao(&env.current_contract_address(), config);
        } else {
            panic!("No config data in proposal");
        }
    }

    fn execute_add_trading_pair(env: &Env, proposal: &Proposal) {
        let bot_client = ArbBotClient::new(env, &proposal.target_contract);

        if let Some(pair) = &proposal.proposal_data.pair_data {
            bot_client.add_enhanced_pair_dao(&env.current_contract_address(), pair);
        } else {
            panic!("No pair data in proposal");
        }
    }

    fn execute_add_trading_venue(env: &Env, proposal: &Proposal) {
        let bot_client = ArbBotClient::new(env, &proposal.target_contract);

        if let Some(venue) = &proposal.proposal_data.venue_data {
            bot_client.add_trading_venue_dao(&env.current_contract_address(), venue);
        } else {
            panic!("No venue data in proposal");
        }
    }
    fn execute_pause_pair(env: &Env, proposal: &Proposal) {
        let bot_client = ArbBotClient::new(env, &proposal.target_contract);

        if let Some(symbol) = &proposal.proposal_data.symbol_data {
            bot_client.pause_pair_dao(&env.current_contract_address(), symbol);
        } else {
            panic!("No symbol data in proposal");
        }
    }

    fn execute_emergency_stop(env: &Env, proposal: &Proposal) {
        let bot_client = ArbBotClient::new(env, &proposal.target_contract);
        bot_client.emergency_stop(&env.current_contract_address());
    }
    fn execute_transfer_admin(env: &Env, proposal: &Proposal) {
        if let Some(new_admin) = &proposal.proposal_data.admin_address {
            env.storage()
                .instance()
                .set(&Symbol::new(env, "admin"), new_admin);
            env.events().publish(
                (
                    Symbol::new(env, "admin_transferred"),
                    Symbol::new(env, "success"),
                ),
                (new_admin.clone(),),
            );
        } else {
            panic!("No admin_address in proposal");
        }
    }

    fn execute_update_risk_manager(env: &Env, proposal: &Proposal) {
        env.events().publish(
            (
                Symbol::new(env, "risk_manager"),
                Symbol::new(env, "update_executed"),
            ),
            (proposal.id,),
        );
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(env, "admin"))
            .unwrap();
        if caller != &admin {
            panic!("Unauthorized: caller is not admin");
        }
    }

    pub fn upgrade_contract(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let wasm_hash_clone = new_wasm_hash.clone();

        env.deployer().update_current_contract_wasm(wasm_hash_clone);

        env.events().publish(
            (Symbol::new(&env, "contract"), Symbol::new(&env, "upgraded")),
            (admin, new_wasm_hash),
        );
    }

    pub fn get_version(_env: Env) -> u32 {
        2
    }

    pub fn update_min_stake_admin(env: Env, admin: Address, new_min_stake: i128) {
        admin.require_auth();
        Self::require_admin(&env, &admin);

        let mut config: DAOConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "dao_config"))
            .unwrap();

        let old_min_stake = config.min_stake_to_propose;
        config.min_stake_to_propose = new_min_stake;

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "dao_config"), &config);

        env.events().publish(
            (Symbol::new(&env, "min_stake"), Symbol::new(&env, "updated")),
            (old_min_stake, new_min_stake, admin),
        );
    }
}

#[soroban_sdk::contractclient(name = "TokenClient")]
pub trait Token {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);
}

#[soroban_sdk::contractclient(name = "ArbBotClient")]
pub trait ArbitrageBotContract {
    fn update_config_dao(env: Env, caller: Address, new_config: ArbitrageConfig);
    fn add_enhanced_pair_dao(env: Env, caller: Address, pair: EnhancedStablecoinPair);
    fn add_trading_venue_dao(env: Env, caller: Address, venue: TradingVenue);
    fn pause_pair_dao(env: Env, caller: Address, stablecoin_symbol: Symbol);
    fn emergency_stop(env: Env, caller: Address);
    fn transfer_admin(env: Env, current_admin: Address, new_admin: Address);
}
