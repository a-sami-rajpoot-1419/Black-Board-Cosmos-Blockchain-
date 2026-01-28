# Local Chain (wasmd)

This folder documents how to run a local chain for BlockBoard Cosmos.

## Option A: wasmd via Docker (recommended)

You’ll need Docker Desktop running.

Example (RPC + REST exposed):

```bash
docker run --rm -it \
  -p 26657:26657 \
  -p 1317:1317 \
  cosmwasm/wasmd
```

Notes:

- `26657` is Tendermint RPC (CosmJS uses this)
- `1317` is REST (optional for this app)

## Keplr configuration

Keplr must be configured to connect to your local chain.
Depending on the chain image/config, you may need to add the chain in Keplr (via “Suggest Chain” or manual settings).
