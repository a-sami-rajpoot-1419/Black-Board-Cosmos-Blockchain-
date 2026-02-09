# BlockBoard Cosmos

Cosmos-SDK + CosmWasm implementation of an on-chain message board.

You get:

- A local CosmWasm-enabled chain (`wasmd`) in Docker
- A CosmWasm contract that stores `last_message` and `message_count`
- A React (Vite) frontend that connects via **Keplr or MetaMask (Leap Cosmos Snap)** + CosmJS

## Repo layout

- `contracts/` CosmWasm smart contract (Rust)
- `frontend/` React UI (Vite) + Keplr/CosmJS integration
- `local-chain/` local `wasmd` chain (Docker compose + init script)
- `docs/` setup + architecture + testing notes
- `scripts/` helper scripts (faucet/funding, deploy helpers)

## Quickstart (local)

### 1) Start the local chain

From `local-chain/`:

```bash
docker compose up -d
```

RPC/REST:

- RPC: `http://localhost:26657`
- REST: `http://localhost:1317`

### 2) Build the contract WASM (recommended: Docker optimizer)

From repo root:

```bash
docker run --rm -v "%cd%\contracts":/code \
   --mount type=volume,source=blockboard_cosmos_cache,target=/code/target \
   --mount type=volume,source=blockboard_cosmos_registry,target=/usr/local/cargo/registry \
   cosmwasm/rust-optimizer:0.17.0
```

This produces:

- `contracts/artifacts/blockboard.wasm`

### 3) Upload + instantiate the contract

Follow the step-by-step guide in:

- `docs/DEPLOY_LOCAL.md`

After instantiate, set your frontend contract address:

- `frontend/.env` → `VITE_CONTRACT_ADDRESS=...`

### 4) Run the frontend

From `frontend/`:

```bash
npm.cmd install
npm.cmd run dev
```

Open:

- `http://localhost:5173/`

## Keplr notes

### Add the local chain

The frontend supports both Keplr and MetaMask (Leap Snap).

- Select **Keplr** in the wallet dropdown
- Click **Connect**

If Keplr needs the chain added/configured, it will prompt you during the connection flow.

## MetaMask (Snap) notes

MetaMask works via the **Leap Cosmos Snap** (Cosmos tx signing inside MetaMask).

- Setup/behavior: `docs/WALLET_METAMASK.md`
- The app includes a **Download Logs** button that exports safe JSON logs for debugging wallet + tx behavior.

### “Account does not exist on chain”

If you see:

`Account '<your_address>' does not exist on chain. Send some tokens there before trying to query sequence.`

Fund your Keplr address from the local validator:

```bash
docker exec -i blockboard-wasmd wasmd tx bank send validator <YOUR_KEPLR_ADDRESS> 2000000stake \
   --chain-id localwasm --node http://127.0.0.1:26657 --keyring-backend test \
   --fees 5000stake -y --broadcast-mode sync
```

Or use the helper:

```powershell
powershell -File scripts/fund-keplr.ps1 -Address <YOUR_KEPLR_ADDRESS>
```

## Testing

See `docs/TESTING.md` for a quick manual checklist.

## Design note

The frontend is intentionally strict about configuration: it will throw a clear error if required `VITE_*` values are missing.
