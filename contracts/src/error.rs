use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("message cannot be empty")]
    EmptyMessage {},

    #[error("message too long (max 140 characters)")]
    MessageTooLong {},
}
