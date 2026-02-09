import { wallets as keplrWallets } from './keplrCompat';
import { wallets as metamaskSnapWallets } from '@cosmos-kit/leap-metamask-cosmos-snap';

import { getAppConfig } from '../config';

function parseGasPriceAmount(gasPrice) {
  const match = String(gasPrice ?? '').trim().match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z0-9/]+)$/);
  if (!match) return null;
  return Number(match[1]);
}

/**
 * Build a minimal chain-registry style Chain + AssetList definition for CosmosKit.
 *
 * Repo-specific notes:
 * - Your local wasmd chain uses bech32 prefix `wasm` (addresses like wasm1...).
 * - The chain has no denom metadata; we treat `stake` as a base denom with 0 decimals.
 */
export function getCosmosKitConfig() {
  const cfg = getAppConfig();

  const gasAmount = parseGasPriceAmount(cfg.gasPrice) ?? 0.025;
  const feeToken = {
    denom: cfg.denom,
    fixed_min_gas_price: gasAmount,
    low_gas_price: Math.max(0.001, Number((gasAmount * 0.5).toFixed(6))),
    average_gas_price: Math.max(0.001, Number(gasAmount.toFixed(6))),
    high_gas_price: Math.max(0.001, Number((gasAmount * 1.5).toFixed(6)))
  };

  const chain = {
    chain_name: cfg.chainId,
    chain_id: cfg.chainId,
    pretty_name: `${cfg.appName} (${cfg.chainId})`,
    status: 'live',
    network_type: 'devnet',
    bech32_prefix: cfg.bech32Prefix,
    slip44: 118,
    apis: {
      rpc: [{ address: cfg.rpcEndpoint }],
      rest: cfg.restEndpoint ? [{ address: cfg.restEndpoint }] : []
    },
    fees: {
      fee_tokens: [feeToken]
    },
    staking: {
      staking_tokens: [{ denom: cfg.denom }]
    }
  };

  const assetList = {
    chain_name: cfg.chainId,
    assets: [
      {
        base: cfg.denom,
        name: cfg.denom.toUpperCase(),
        display: cfg.denom,
        symbol: cfg.denom.toUpperCase(),
        denom_units: [{ denom: cfg.denom, exponent: 0 }],
        decimals: 0
      }
    ]
  };

  return {
    chains: [chain],
    assetLists: [assetList],
    wallets: [...keplrWallets, ...metamaskSnapWallets]
  };
}
