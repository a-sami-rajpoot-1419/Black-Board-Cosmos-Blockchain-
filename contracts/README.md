# BlockBoard Contract

CosmWasm contract that stores:

- `last_message` (string)
- `message_count` (u64)

Execute:

- `PostMessage { message }`

Query:

- `GetLastMessage {}`
- `GetMessageCount {}`
