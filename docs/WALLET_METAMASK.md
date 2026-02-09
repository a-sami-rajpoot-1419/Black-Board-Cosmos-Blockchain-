# MetaMask (Leap Cosmos Snap) Wallet Support

BlockBoard Cosmos supports **two wallets**:

- Keplr (browser extension)
- MetaMask via **Leap Cosmos Snap**

This keeps the chain as **pure Cosmos SDK + CosmWasm** (no EVM module).

## Local chain facts (confirmed)

From the running `wasmd` container:

- `chain-id`: `localwasm`
- **bech32 prefix**: `wasm` (addresses look like `wasm1...`)
- **denom**: `stake`
- `bank.denom_metadata`: empty (no decimals metadata on-chain)

Because there is no denom metadata, the frontend treats `stake` as a base denom with **0 decimals** for wallet UIs.

## How the integration works

The frontend uses CosmosKit to abstract the signer:

- The app is wrapped in `ChainProvider` (CosmosKit).
- Wallet adapters are registered:
  - `@cosmos-kit/keplr`
  - `@cosmos-kit/leap-metamask-cosmos-snap`
- When the user clicks **Connect Wallet**, CosmosKit opens a wallet modal.
- After selection, CosmosKit provides a `SigningCosmWasmClient` via `getSigningCosmWasmClient()`.

Contract queries still use `CosmWasmClient` and do not require a wallet.

## Visual “0x…” identity mapping

The UI shows the connected bech32 address (`wasm1...`) plus a derived `0x...` display address.

This is a **re-encoding** of the same 20 bytes and is for display/debugging only.

Optional refinement (not required): apply EIP-55 checksum formatting to the `0x...` display address.

## Audit logs (downloadable JSON)

The UI provides:

- **Download Logs**: downloads a JSON file with recent wallet + tx events.
- **Clear Logs**: clears the stored log.

The log is stored in `localStorage` under `blockboard.auditLog.v1` and contains safe debugging info:

- selected wallet name (Keplr vs MetaMask Snap)
- connected address (`wasm1...`) and derived display `0x...`
- tx submit/result/error summaries and broadcast details (txhash, rawLog, code)

No private keys / seed phrases are logged.
