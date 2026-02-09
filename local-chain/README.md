# Local Chain (wasmd)

This folder documents how to run a local chain for BlockBoard Cosmos.

## Option A: wasmd via Docker (recommended)

You’ll need Docker Desktop running.

Run the chain using docker compose from this folder:

```bash
docker compose up -d
```

Stop it:

```bash
docker compose down
```

Reset the chain (wipes state):

```bash
docker compose down
rm -rf data
docker compose up -d
```

Notes:

- `26657` is Tendermint RPC (CosmJS uses this)
- `1317` is REST (optional for this app)

Default chain settings used here:

- chain-id: `localwasm`
- denom: `stake`
- bech32 prefix: `wasm`
- minimum gas price: `0.025stake`

The chain is initialized by `start-wasmd.sh` (mounted into the container).

## “Faucet” (funding a Keplr address)

Local chains don’t have faucets by default. If your wallet (Keplr or MetaMask Snap) errors with “account does not exist on chain”, fund your **wallet address** (e.g. `wasm1...`) from the built-in `validator` key:

```bash
docker exec -i blockboard-wasmd wasmd tx bank send validator <YOUR_KEPLR_ADDRESS> 2000000stake \
	--chain-id localwasm --node http://127.0.0.1:26657 --keyring-backend test \
	--fees 5000stake -y --broadcast-mode sync
```

PowerShell helper:

```powershell
powershell -File ..\scripts\fund-keplr.ps1 -Address <YOUR_WALLET_ADDRESS>
```

## Keplr configuration

Keplr must be configured to connect to your local chain.
Depending on the chain image/config, you may need to add the chain in Keplr (via “Suggest Chain” or manual settings).

The frontend includes an **“Add Local Chain to Keplr”** button that calls `window.keplr.experimentalSuggestChain(...)`.
