#![no_std]

//! FarmFund Soroban Smart Contract Escrow
//!
//! Enforces strict separation between:
//! 1. Sponsor-to-Farmer 30% Support Escrow (`SupportAgreement`)
//!    - Sponsors receive an agreed 30% Farm Produce Share or 30% Farm Funds Share.
//! 2. Farmer-to-Worker Direct Wage Escrow (`WorkerWageAgreement`)
//!    - Farm workers receive 100% of their agreed wages with 0% sponsor deduction.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AgreementAlreadyExists = 1,
    AgreementNotFound = 2,
    InvalidAmount = 3,
    InvalidSharePercentage = 4,
    InvalidSponsorShareOnWorkerWage = 5,
    InvalidStateTransition = 6,
    UnauthorizedCaller = 7,
    SelfFundingForbidden = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    Created,
    Funded,
    InProgress,
    MilestoneSubmitted,
    Approved,
    Released,
    Disputed,
    Refunded,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ShareArrangement {
    ProduceShare30Percent,
    FundsShare30Percent,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SupportAgreement {
    pub agreement_id: String,
    pub sponsor: Address,
    pub farmer: Address,
    pub token: Address,
    pub principal_usdc: i128,
    pub released_usdc: i128,
    pub sponsor_share_bps: u32, // Fixed at 3000 (30.00%)
    pub arrangement: ShareArrangement,
    pub state: EscrowState,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WorkerWageAgreement {
    pub agreement_id: String,
    pub farmer: Address,
    pub worker: Address,
    pub token: Address,
    pub agreed_wage_usdc: i128,
    pub released_wage_usdc: i128,
    pub sponsor_deduction_bps: u32, // Strictly 0 (0.00% sponsor deduction)
    pub state: EscrowState,
}

#[contracttype]
pub enum DataKey {
    Admin,
    SupportAgreement(String),
    WorkerWageAgreement(String),
}

#[contract]
pub struct FarmFundEscrowContract;

#[contractimpl]
impl FarmFundEscrowContract {
    /// Initializes the contract administrator for dispute resolution.
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Creates and locks USDC for a Sponsor-to-Farmer 30% Farm Support Agreement.
    pub fn fund_support_escrow(
        env: Env,
        agreement_id: String,
        sponsor: Address,
        farmer: Address,
        token: Address,
        principal_usdc: i128,
        arrangement: ShareArrangement,
    ) -> Result<SupportAgreement, EscrowError> {
        sponsor.require_auth();

        if sponsor == farmer {
            return Err(EscrowError::SelfFundingForbidden);
        }
        if principal_usdc <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let key = DataKey::SupportAgreement(agreement_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(EscrowError::AgreementAlreadyExists);
        }

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sponsor, &env.current_contract_address(), &principal_usdc);

        let record = SupportAgreement {
            agreement_id: agreement_id.clone(),
            sponsor,
            farmer,
            token,
            principal_usdc,
            released_usdc: 0,
            sponsor_share_bps: 3000, // 30% sponsor share
            arrangement,
            state: EscrowState::Funded,
        };

        env.storage().persistent().set(&key, &record);
        Ok(record)
    }

    /// Farmer submits a milestone for a funded Sponsor Support Agreement.
    pub fn submit_support_milestone(
        env: Env,
        agreement_id: String,
        farmer: Address,
    ) -> Result<SupportAgreement, EscrowError> {
        farmer.require_auth();
        let key = DataKey::SupportAgreement(agreement_id);
        let mut record: SupportAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if record.farmer != farmer {
            return Err(EscrowError::UnauthorizedCaller);
        }
        if record.state != EscrowState::Funded && record.state != EscrowState::InProgress {
            return Err(EscrowError::InvalidStateTransition);
        }

        record.state = EscrowState::MilestoneSubmitted;
        env.storage().persistent().set(&key, &record);
        Ok(record)
    }

    /// Sponsor approves and releases escrowed USDC to the Farmer.
    pub fn release_support_escrow(
        env: Env,
        agreement_id: String,
        sponsor: Address,
        release_amount: i128,
    ) -> Result<SupportAgreement, EscrowError> {
        sponsor.require_auth();
        let key = DataKey::SupportAgreement(agreement_id);
        let mut record: SupportAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if record.sponsor != sponsor {
            return Err(EscrowError::UnauthorizedCaller);
        }
        let remaining = record.principal_usdc - record.released_usdc;
        if release_amount <= 0 || release_amount > remaining {
            return Err(EscrowError::InvalidAmount);
        }

        let token_client = token::Client::new(&env, &record.token);
        token_client.transfer(
            &env.current_contract_address(),
            &record.farmer,
            &release_amount,
        );

        record.released_usdc += release_amount;
        record.state = if record.released_usdc >= record.principal_usdc {
            EscrowState::Released
        } else {
            EscrowState::InProgress
        };

        env.storage().persistent().set(&key, &record);
        Ok(record)
    }

    /// Creates and locks USDC for a Farmer-to-Worker Direct Wage Agreement (0% Sponsor Deduction).
    pub fn fund_worker_wage_escrow(
        env: Env,
        agreement_id: String,
        farmer: Address,
        worker: Address,
        token: Address,
        agreed_wage_usdc: i128,
    ) -> Result<WorkerWageAgreement, EscrowError> {
        farmer.require_auth();

        if farmer == worker {
            return Err(EscrowError::SelfFundingForbidden);
        }
        if agreed_wage_usdc <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let key = DataKey::WorkerWageAgreement(agreement_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(EscrowError::AgreementAlreadyExists);
        }

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&farmer, &env.current_contract_address(), &agreed_wage_usdc);

        let record = WorkerWageAgreement {
            agreement_id: agreement_id.clone(),
            farmer,
            worker,
            token,
            agreed_wage_usdc,
            released_wage_usdc: 0,
            sponsor_deduction_bps: 0, // Strictly 0% sponsor deduction on worker wages
            state: EscrowState::Funded,
        };

        env.storage().persistent().set(&key, &record);
        Ok(record)
    }

    /// Releases 100% of the escrowed wage directly to the Farm Worker (0% sponsor deduction).
    pub fn release_worker_wage(
        env: Env,
        agreement_id: String,
        farmer: Address,
    ) -> Result<WorkerWageAgreement, EscrowError> {
        farmer.require_auth();
        let key = DataKey::WorkerWageAgreement(agreement_id);
        let mut record: WorkerWageAgreement = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::AgreementNotFound)?;

        if record.farmer != farmer {
            return Err(EscrowError::UnauthorizedCaller);
        }
        if record.sponsor_deduction_bps != 0 {
            return Err(EscrowError::InvalidSponsorShareOnWorkerWage);
        }
        if record.state != EscrowState::Funded
            && record.state != EscrowState::InProgress
            && record.state != EscrowState::MilestoneSubmitted
            && record.state != EscrowState::Approved
        {
            return Err(EscrowError::InvalidStateTransition);
        }

        let payout = record.agreed_wage_usdc - record.released_wage_usdc;
        if payout <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let token_client = token::Client::new(&env, &record.token);
        token_client.transfer(&env.current_contract_address(), &record.worker, &payout);

        record.released_wage_usdc = record.agreed_wage_usdc;
        record.state = EscrowState::Completed;
        env.storage().persistent().set(&key, &record);
        Ok(record)
    }
}
