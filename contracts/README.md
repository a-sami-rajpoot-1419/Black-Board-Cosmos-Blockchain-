# BlockBoard Contract

CosmWasm contract that stores:

- `last_message` (string)
- `message_count` (u64)

## State

- `last_message` starts as an empty string
- `message_count` starts as `0`

## Execute

### `PostMessage { message }`

Rules:

- Message is trimmed
- Must be non-empty
- Max length: 140 characters

On success:

- Updates `last_message`
- Increments `message_count`

## Query

### `GetLastMessage {}`

Returns:

- `{ "last_message": "..." }`

### `GetMessageCount {}`

Returns:

- `{ "message_count": 123 }`

## Build (recommended)

Use the Docker optimizer from repo root:

```bash
docker run --rm -v "%cd%\\contracts":/code \
	--mount type=volume,source=blockboard_cosmos_cache,target=/code/target \
	--mount type=volume,source=blockboard_cosmos_registry,target=/usr/local/cargo/registry \
	cosmwasm/rust-optimizer:0.17.0
```

Artifact output:

- `contracts/artifacts/blockboard.wasm`

## Tests

Unit tests live in `contracts/tests/` and are intended to be run with:

```bash
cargo test
```
