param(
  [Parameter(Mandatory=$true)][string]$Address,
  [string]$Amount = "2000000stake",
  [string]$Fees = "5000stake",
  [string]$ChainId = "localwasm",
  [string]$Node = "http://127.0.0.1:26657",
  [string]$Container = "blockboard-wasmd"
)

$ErrorActionPreference = "Stop"

Write-Host "Funding $Address with $Amount from local validator (container: $Container)" -ForegroundColor Cyan

$cmd = @(
  "docker", "exec", "-i", $Container,
  "wasmd", "tx", "bank", "send",
  "validator", $Address, $Amount,
  "--chain-id", $ChainId,
  "--node", $Node,
  "--keyring-backend", "test",
  "--fees", $Fees,
  "-y",
  "--broadcast-mode", "sync"
)

& $cmd[0] $cmd[1..($cmd.Length-1)]
