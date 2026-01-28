# Local Setup (wasmd + Keplr)

This repo assumes a **local CosmWasm-enabled chain** and a browser wallet (Keplr).

## Prerequisites (outside VS Code)

- Docker Desktop running
- Keplr browser extension installed
- Rust toolchain installed (for building contracts)
- Node.js installed (for frontend)

## 1) Create frontend env

Copy `frontend/.env.example` → `frontend/.env` and fill:

- `VITE_CHAIN_ID`
- `VITE_RPC_ENDPOINT`
- `VITE_DENOM` and `VITE_GAS_PRICE`
- `VITE_CONTRACT_ADDRESS` (fill after deploy)

The frontend is intentionally strict: it throws clear errors if env values are missing.

## 2) Start a local chain (Docker)

See `local-chain/README.md`.

## 3) Build + deploy the contract

High-level flow:

1. Build WASM from `contracts/`
2. Upload (`store`) the WASM to the chain
3. Instantiate the contract
4. Copy the contract address into `frontend/.env`

Notes:

- Keplr approvals happen in your browser (cannot be automated from VS Code).
- If Keplr doesn’t know your local chain yet, you may need to add/suggest it.

## 4) Keplr: add chain + fund address

### Add the local chain

If Keplr won’t allow manual custom chain add, use the frontend button:

- **Add Local Chain to Keplr**

It calls `window.keplr.experimentalSuggestChain(...)`.

### Fund your Keplr address (local faucet)

On a fresh local chain, your Keplr address may not exist on-chain until it receives tokens.
If you see an error about “account does not exist on chain”, fund it:

```bash
docker exec -i blockboard-wasmd wasmd tx bank send validator <YOUR_KEPLR_ADDRESS> 2000000stake \
	--chain-id localwasm --node http://127.0.0.1:26657 --keyring-backend test \
	--fees 5000stake -y --broadcast-mode sync
```

Or:

```powershell
powershell -File scripts/fund-keplr.ps1 -Address <YOUR_KEPLR_ADDRESS>
```
