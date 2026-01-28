use cosmwasm_schema::{cw_serde, QueryResponses};

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
pub enum ExecuteMsg {
    PostMessage { message: String },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(LastMessageResponse)]
    GetLastMessage {},

    #[returns(MessageCountResponse)]
    GetMessageCount {},
}

#[cw_serde]
pub struct LastMessageResponse {
    pub last_message: String,
}

#[cw_serde]
pub struct MessageCountResponse {
    pub message_count: u64,
}
