# Deploy Locally (Contract → Local wasmd)

This guide assumes the local chain is running via `local-chain/docker-compose.yml`.

## 1) Start the chain

From `local-chain/`:

```bash
docker compose up -d
```

## 2) Install prerequisites

You need these on your machine:

- Docker Desktop

Notes:

- Windows-native Rust builds can require MSVC Build Tools.
- This repo supports Docker-based contract builds via `cosmwasm/rust-optimizer` (recommended).

## 3) Build the contract (recommended: Docker optimizer)

From repo root:

```bash
docker run --rm -v "%cd%\\contracts":/code \
  --mount type=volume,source=blockboard_cosmos_cache,target=/code/target \
  --mount type=volume,source=blockboard_cosmos_registry,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer:0.17.0
```

The built file will be at:

- `contracts/artifacts/blockboard.wasm`

## 4) Upload + instantiate

We use the `wasmd` inside the docker container for chain transactions.

Copy the wasm into the running container:

```bash
docker cp contracts/artifacts/blockboard.wasm blockboard-wasmd:/tmp/blockboard.wasm
```

Store:

```bash
docker exec -it blockboard-wasmd wasmd tx wasm store /tmp/blockboard.wasm \
  --from validator --keyring-backend test \
  --gas auto --gas-adjustment 1.3 \
  --fees 5000stake \
  -y --broadcast-mode sync
```

Instantiate (replace CODE_ID with the one from the store tx result):

```bash
docker exec -it blockboard-wasmd wasmd tx wasm instantiate CODE_ID '{}' \
  --from validator --label "blockboard" --no-admin \
  --keyring-backend test \
  --gas auto --gas-adjustment 1.3 \
  --fees 5000stake \
  -y --broadcast-mode sync
```

After instantiate, get the contract address from the tx and paste it into:

- `frontend/.env` → `VITE_CONTRACT_ADDRESS=...`

Tip: you can query the tx by hash:

```bash
docker exec -i blockboard-wasmd wasmd query tx --type hash <TX_HASH> -o json
```
