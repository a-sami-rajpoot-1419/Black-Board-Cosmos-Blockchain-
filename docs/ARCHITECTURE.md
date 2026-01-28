# Architecture

## Mental model

- Contract is the backend: state lives on-chain
- Frontend is a client: queries state + sends signed transactions
- Keplr is identity/signing: keys are in the wallet

## State

- `last_message: String`
- `message_count: u64`

## Messages

- Execute: `PostMessage { message }`
- Query: `GetLastMessage {}` / `GetMessageCount {}`
