use cosmwasm_schema::cw_serde;
use cw_storage_plus::Item;

#[cw_serde]
pub struct State {
    pub last_message: String,
    pub message_count: u64,
}

pub const STATE: Item<State> = Item::new("state");
