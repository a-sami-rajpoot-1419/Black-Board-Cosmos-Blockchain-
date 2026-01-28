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

## Keplr "account does not exist" (local chain)

If Keplr connects but you see an error like:

`Account '<your_address>' does not exist on chain. Send some tokens there before trying to query sequence.`

That means the address exists in Keplr, but it has never received any tokens on your local chain yet.

Fix: fund your Keplr address from the local validator (inside Docker):

```bash
docker exec -i blockboard-wasmd wasmd tx bank send validator <YOUR_KEPLR_ADDRESS> 2000000stake \
	--chain-id localwasm --node http://127.0.0.1:26657 --keyring-backend test \
	--fees 5000stake -y --broadcast-mode sync
```

Then reload the app and connect again.
