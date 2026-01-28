use cosmwasm_std::Addr;
use cw_multi_test::{App, Contract, ContractWrapper, Executor};

use blockboard::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};

fn contract_blockboard() -> Box<dyn Contract<cosmwasm_std::Empty>> {
    let contract = ContractWrapper::new(blockboard::execute, blockboard::instantiate, blockboard::query);
    Box::new(contract)
}

fn setup_app() -> (App, Addr) {
    let mut app = App::default();
    let code_id = app.store_code(contract_blockboard());
    let addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked("creator"),
            &InstantiateMsg {},
            &[],
            "blockboard",
            None,
        )
        .unwrap();
    (app, addr)
}

#[test]
fn instantiate_sets_initial_state() {
    let (app, addr) = setup_app();

    let last: blockboard::msg::LastMessageResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::GetLastMessage {})
        .unwrap();
    assert_eq!(last.last_message, "");

    let count: blockboard::msg::MessageCountResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::GetMessageCount {})
        .unwrap();
    assert_eq!(count.message_count, 0);
}

#[test]
fn post_message_updates_state() {
    let (mut app, addr) = setup_app();

    app.execute_contract(
        Addr::unchecked("alice"),
        addr.clone(),
        &ExecuteMsg::PostMessage {
            message: "hello cosmos".to_string(),
        },
        &[],
    )
    .unwrap();

    let last: blockboard::msg::LastMessageResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::GetLastMessage {})
        .unwrap();
    assert_eq!(last.last_message, "hello cosmos");

    let count: blockboard::msg::MessageCountResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::GetMessageCount {})
        .unwrap();
    assert_eq!(count.message_count, 1);
}

#[test]
fn rejects_empty_message() {
    let (mut app, addr) = setup_app();

    let err = app
        .execute_contract(
            Addr::unchecked("alice"),
            addr,
            &ExecuteMsg::PostMessage {
                message: "   ".to_string(),
            },
            &[],
        )
        .unwrap_err();

    let msg = err.to_string();
    assert!(msg.contains("message cannot be empty"));
}
