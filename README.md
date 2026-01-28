# BlockBoard Cosmos

Cosmos-SDK + CosmWasm implementation of an on-chain message board.

## What’s here

- `contracts/` CosmWasm smart contract (Rust)
- `frontend/` React UI (Vite) + Keplr/CosmJS integration
- `docs/` setup + architecture notes
- `local-chain/` local `wasmd` notes

## First-time setup

1. Create your frontend env file:
   - Copy `frontend/.env.example` to `frontend/.env`
   - Fill in values (RPC, chain-id, contract address, denom)
2. Follow `docs/SETUP_LOCAL.md` to start a local chain and deploy the contract.

This repo is designed so you don’t need to run anything until `frontend/.env` is filled.
