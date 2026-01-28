#!/bin/sh
set -eu

CHAIN_ID="${CHAIN_ID:-localwasm}"
DENOM="${DENOM:-stake}"
MONIKER="${MONIKER:-blockboard-local}" 
MIN_GAS_PRICE="${MIN_GAS_PRICE:-0.025${DENOM}}"

init_if_needed() {
  if [ -d "/root/.wasmd/config" ]; then
    echo "wasmd already initialized"
    return
  fi

  echo "Initializing wasmd home…"
  wasmd init "$MONIKER" --chain-id "$CHAIN_ID"

  wasmd config chain-id "$CHAIN_ID"
  wasmd config keyring-backend test

  echo "Creating validator key (keyring-backend=test)…"
  wasmd keys add validator --keyring-backend test >/root/.wasmd/validator-keys.txt

  VAL_ADDR="$(wasmd keys show validator -a --keyring-backend test)"
  echo "Validator address: $VAL_ADDR"

  echo "Funding genesis account…"
  wasmd genesis add-genesis-account "$VAL_ADDR" "1000000000${DENOM}"

  echo "Creating genesis tx…"
  wasmd genesis gentx validator "100000000${DENOM}" --chain-id "$CHAIN_ID" --keyring-backend test
  wasmd genesis collect-gentxs

  echo "Configuring RPC + REST + gas prices…"
  # Tendermint RPC bind
  sed -i 's|^laddr = "tcp://127.0.0.1:26657"|laddr = "tcp://0.0.0.0:26657"|g' /root/.wasmd/config/config.toml

  # Allow browser clients (Vite) to call Tendermint RPC
  # In config.toml this is usually: cors_allowed_origins = []
  sed -i 's|^cors_allowed_origins = \[\]|cors_allowed_origins = ["*"]|g' /root/.wasmd/config/config.toml || true

  # REST API enable + bind
  # app.toml format varies by version; these replacements are best-effort.
  if grep -q '^\[api\]' /root/.wasmd/config/app.toml; then
    sed -i 's|^enable = false|enable = true|g' /root/.wasmd/config/app.toml
    sed -i 's|^address = "tcp://127.0.0.1:1317"|address = "tcp://0.0.0.0:1317"|g' /root/.wasmd/config/app.toml
    sed -i 's|^address = "tcp://localhost:1317"|address = "tcp://0.0.0.0:1317"|g' /root/.wasmd/config/app.toml
    sed -i 's|^address = "tcp://0.0.0.0:1317"|address = "tcp://0.0.0.0:1317"|g' /root/.wasmd/config/app.toml
  fi

  # Minimum gas prices
  sed -i "s|^minimum-gas-prices = \"\"|minimum-gas-prices = \"${MIN_GAS_PRICE}\"|g" /root/.wasmd/config/app.toml || true

  echo "Initialization complete. Kept keys at /root/.wasmd/validator-keys.txt"
}

init_if_needed

echo "Starting wasmd…"
exec wasmd start
