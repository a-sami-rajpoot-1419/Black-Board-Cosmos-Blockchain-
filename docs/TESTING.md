# Testing

## Contract

Run Rust unit tests in `contracts/`:

- Instantiate sets initial state
- Posting a message updates state
- Empty messages are rejected

## Frontend

Manual checks:

- Connect wallet (Keplr prompt)
- Reads last message and count
- Posts a valid message
- Rejects empty / >140 chars (client-side)
- Refresh page keeps state (on-chain)
