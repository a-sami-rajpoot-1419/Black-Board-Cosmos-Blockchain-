pub mod error;
pub mod msg;
pub mod state;

use cosmwasm_std::{attr, entry_point, Deps, DepsMut, Env, MessageInfo, Response, StdResult};

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, LastMessageResponse, MessageCountResponse, QueryMsg};
use crate::state::{State, STATE};

const MAX_MESSAGE_CHARS: usize = 140;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let state = State {
        last_message: "".to_string(),
        message_count: 0,
    };
    STATE.save(deps.storage, &state)?;
    Ok(Response::new().add_attribute("method", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::PostMessage { message } => execute_post_message(deps, info, message),
    }
}

fn execute_post_message(
    deps: DepsMut,
    info: MessageInfo,
    message: String,
) -> Result<Response, ContractError> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err(ContractError::EmptyMessage {});
    }

    if trimmed.chars().count() > MAX_MESSAGE_CHARS {
        return Err(ContractError::MessageTooLong {});
    }

    STATE.update(deps.storage, |mut state| -> Result<_, ContractError> {
        state.last_message = trimmed.to_string();
        state.message_count = state
            .message_count
            .checked_add(1)
            .expect("message_count overflow");
        Ok(state)
    })?;

    Ok(Response::new()
        .add_attribute("action", "post_message")
        .add_attributes(vec![
            attr("sender", info.sender),
            attr("event", "message_posted"),
        ]))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<cosmwasm_std::Binary> {
    match msg {
        QueryMsg::GetLastMessage {} => {
            let state = STATE.load(deps.storage)?;
            cosmwasm_std::to_json_binary(&LastMessageResponse {
                last_message: state.last_message,
            })
        }
        QueryMsg::GetMessageCount {} => {
            let state = STATE.load(deps.storage)?;
            cosmwasm_std::to_json_binary(&MessageCountResponse {
                message_count: state.message_count,
            })
        }
    }
}
