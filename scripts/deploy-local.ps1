param(
  [string]$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\.."),
  [string]$Denom = "ucosm",
  [string]$Fees = "5000ucosm"
)

$ErrorActionPreference = 'Stop'

$contracts = Join-Path $WorkspaceRoot 'contracts'
$wasmPath = Join-Path $contracts 'target\wasm32-unknown-unknown\release\blockboard.wasm'

Write-Host "Workspace: $WorkspaceRoot"
Write-Host "Contracts: $contracts"

Push-Location $contracts
try {
  cargo test
  cargo build --release --target wasm32-unknown-unknown
}
finally {
  Pop-Location
}

if (!(Test-Path $wasmPath)) {
  throw "WASM not found at $wasmPath"
}

Write-Host "Copying wasm into container…"
docker cp $wasmPath blockboard-wasmd:/tmp/blockboard.wasm

Write-Host "Storing contract…"
docker exec -i blockboard-wasmd wasmd tx wasm store /tmp/blockboard.wasm `
  --from validator --keyring-backend test `
  --gas auto --gas-adjustment 1.3 `
  --fees $Fees `
  -y

Write-Host "Now run instantiate manually with the CODE_ID from the output (see docs/DEPLOY_LOCAL.md)."
