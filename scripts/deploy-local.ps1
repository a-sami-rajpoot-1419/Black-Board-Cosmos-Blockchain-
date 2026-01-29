param(
  [string]$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\.."),
  [string]$ChainId = "localwasm",
  [string]$Node = "http://127.0.0.1:26657",
  [string]$Wallet = "validator",
  [string]$Keyring = "test",
  [string]$ContractName = "blockboard",
  [string]$Label = "blockboard",
  [string]$Admin = "",
  [string]$Denom = "stake",
  [string]$Fees = "5000stake",
  [switch]$WriteFrontendEnv
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Missing required command: $Name" }
}

function Get-CommandOrThrow([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Missing required command: $Name" }
  return $cmd
}

Get-CommandOrThrow docker | Out-Null

$contractsDir = Join-Path $WorkspaceRoot 'contracts'
$artifactsDir = Join-Path $contractsDir 'artifacts'
$wasmPath = Join-Path $artifactsDir "$ContractName.wasm"

Write-Host "Workspace: $WorkspaceRoot"
Write-Host "Contracts: $contractsDir"

Write-Host "Building WASM with cosmwasm/rust-optimizer…"
docker run --rm -v "${contractsDir}:/code" --mount type=volume,source="${ContractName}_cache",target=/code/target --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry cosmwasm/rust-optimizer:0.17.0

if (!(Test-Path $wasmPath)) {
  throw "WASM not found at $wasmPath"
}

Write-Host "Copying WASM into container…"
docker cp $wasmPath blockboard-wasmd:/tmp/$ContractName.wasm

Write-Host "Storing contract…"
$storeOut = docker exec -i blockboard-wasmd wasmd tx wasm store /tmp/$ContractName.wasm `
  --from $Wallet --keyring-backend $Keyring `
  --chain-id $ChainId --node $Node `
  --gas auto --gas-adjustment 1.3 `
  --fees $Fees `
  -y --broadcast-mode sync -o json

$storeObj = $storeOut | ConvertFrom-Json
$storeTxHash = $storeObj.txhash
if (-not $storeTxHash) { throw "Failed to parse txhash from store output" }

Write-Host "Querying store tx to get code_id…"
$storeTxJson = docker exec -i blockboard-wasmd wasmd query tx --type hash $storeTxHash --node $Node -o json
$storeTxObj = $storeTxJson | ConvertFrom-Json

$codeId = ($storeTxObj.logs[0].events | Where-Object { $_.type -eq 'store_code' } | Select-Object -First 1).attributes |
  Where-Object { $_.key -eq 'code_id' } |
  Select-Object -First 1 |
  ForEach-Object { $_.value }

if (-not $codeId) { throw "Failed to extract code_id from store tx" }
Write-Host "code_id=$codeId"

Write-Host "Instantiating contract…"
$initMsg = '{}'
$instArgs = @(
  'tx','wasm','instantiate', $codeId, $initMsg,
  '--from', $Wallet,
  '--label', $Label,
  '--chain-id', $ChainId,
  '--node', $Node,
  '--keyring-backend', $Keyring,
  '--fees', $Fees,
  '-y',
  '--broadcast-mode','sync',
  '-o','json'
)

if ($Admin -and $Admin.Trim().Length -gt 0) {
  $instArgs += @('--admin', $Admin)
}

$instOut = docker exec -i blockboard-wasmd wasmd @instArgs
$instObj = $instOut | ConvertFrom-Json
$instTxHash = $instObj.txhash
if (-not $instTxHash) { throw "Failed to parse txhash from instantiate output" }

Write-Host "Querying instantiate tx to get contract address…"
$instTxJson = docker exec -i blockboard-wasmd wasmd query tx --type hash $instTxHash --node $Node -o json
$instTxObj = $instTxJson | ConvertFrom-Json

$contractAddr = ($instTxObj.logs[0].events | Where-Object { $_.type -eq 'instantiate' } | Select-Object -First 1).attributes |
  Where-Object { $_.key -eq '_contract_address' } |
  Select-Object -First 1 |
  ForEach-Object { $_.value }

if (-not $contractAddr) { throw "Failed to extract contract address from instantiate tx" }

Write-Host "contract_address=$contractAddr"

if ($WriteFrontendEnv) {
  $frontendEnvPath = Join-Path $WorkspaceRoot 'frontend\.env'
  Write-Host "Writing frontend env: $frontendEnvPath"
  @(
    "VITE_CHAIN_ID=$ChainId",
    "VITE_RPC_URL=http://localhost:26657",
    "VITE_REST_URL=http://localhost:1317",
    "VITE_BECH32_PREFIX=wasm",
    "VITE_DENOM=$Denom",
    "VITE_CONTRACT_ADDRESS=$contractAddr"
  ) | Set-Content -Encoding UTF8 $frontendEnvPath
}
