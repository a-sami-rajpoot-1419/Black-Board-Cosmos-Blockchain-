# Architecture

## Mental model

- Contract is the backend: state lives on-chain
- Frontend is a client: queries state + sends signed transactions
- Keplr is identity/signing: keys are in the wallet

# Architecture

## Components

BlockBoard Cosmos is a minimal end-to-end CosmWasm dApp with three pieces:

1. **Local chain**: a Cosmos SDK chain with CosmWasm enabled (`wasmd`) running in Docker.
2. **Smart contract**: a CosmWasm contract compiled to WASM.
3. **Frontend**: a Vite + React UI that uses CosmJS and Keplr to query/execute the contract.

## End-to-end flow

This is the “happy path” from zero to a working UI:

1. **Start the chain**
	- Docker Compose boots `wasmd`, exposes:
	  - RPC: `http://localhost:26657`
	  - REST: `http://localhost:1317`
	- Chain defaults are documented across the repo (notably: `chain-id=localwasm`, denom `stake`).

2. **Build the contract (WASM)**
	- Recommended: build via `cosmwasm/rust-optimizer`.
	- This avoids Windows toolchain/linker pitfalls and produces a WASM `wasmd` will accept.

3. **Upload (`store`) the WASM**
	- `wasmd tx wasm store ...` writes the bytecode on-chain.
	- The result includes a **`code_id`** (the on-chain reference to the uploaded contract code).

4. **Instantiate the contract**
	- `wasmd tx wasm instantiate <code_id> ...` creates a **contract instance**.
	- The result includes a **contract address** (e.g. `wasm1...`).

5. **Configure the frontend**
	- The frontend reads chain settings + contract address from env variables.
	- After instantiate, the contract address is placed in `frontend/.env` as `VITE_CONTRACT_ADDRESS=...`.

6. **Connect Keplr + interact**
	- The frontend asks Keplr to add the local chain (`experimentalSuggestChain`) and then enables it.
	- Queries are free; executes require gas/fees, so the Keplr account must be funded.

## Contract model

### State

The contract stores:

- `last_message: String`
- `message_count: u64`

### Messages

**Execute:** `set_message { message }`

- Validates the message is non-empty and length ≤ 140.
- Updates `last_message`.
- Increments `message_count`.

**Query:** `get_message {}`

- Returns `last_message` and `message_count`.

## Frontend → chain communication

Two paths exist in the UI:

1. **Read-only queries (no signature required)**
	- The frontend uses CosmJS query clients pointed at RPC.
	- These calls do not require Keplr and do not spend tokens.

2. **Transactions (signature required)**
	- The frontend requests a signer from Keplr.
	- It uses CosmJS signing clients to broadcast transactions.
	- The wallet must have funds for fees (even on a local chain).

## Why Docker for the chain?

- Reproducible local node on Windows/macOS/Linux.
- No need to install/build Cosmos SDK/wasmd natively.
- Easy reset by deleting the mounted chain data directory.

## Why `rust-optimizer` for WASM?

- Produces compatible WASM (avoids common validation failures like “bulk memory” issues).
- Avoids Windows native linker requirements.
- Ensures consistent, release-grade builds.

## Why Keplr (not MetaMask)?

- Keplr is the standard wallet for Cosmos SDK chains and supports Amino/Direct signing used by CosmJS.
- MetaMask is EVM-centric; it can’t directly sign Cosmos SDK transactions for `wasmd`.
