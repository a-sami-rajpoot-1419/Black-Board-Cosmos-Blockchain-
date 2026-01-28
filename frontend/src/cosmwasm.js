import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { getAppConfig } from './config';

function parseGasPriceAmount(gasPrice) {
  const match = String(gasPrice ?? '').trim().match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z0-9/]+)$/);
  if (!match) return null;
  return Number(match[1]);
}

function getBech32Config(prefix) {
  return {
    bech32PrefixAccAddr: prefix,
    bech32PrefixAccPub: `${prefix}pub`,
    bech32PrefixValAddr: `${prefix}valoper`,
    bech32PrefixValPub: `${prefix}valoperpub`,
    bech32PrefixConsAddr: `${prefix}valcons`,
    bech32PrefixConsPub: `${prefix}valconspub`
  };
}

function getKeplr() {
  const keplr = window.keplr;
  if (!keplr) {
    throw new Error('Keplr not found. Install the Keplr browser extension.');
  }
  return keplr;
}

export async function suggestChain() {
  const cfg = getAppConfig();
  const keplr = getKeplr();

  const gasAmount = parseGasPriceAmount(cfg.gasPrice) ?? 0.025;
  const currency = {
    coinDenom: cfg.denom.toUpperCase(),
    coinMinimalDenom: cfg.denom,
    coinDecimals: 6
  };

  const chainInfo = {
    chainId: cfg.chainId,
    chainName: `${cfg.appName} Local Chain`,
    rpc: cfg.rpcEndpoint,
    rest: cfg.restEndpoint || 'http://localhost:1317',
    bip44: { coinType: 118 },
    bech32Config: getBech32Config(cfg.bech32Prefix),
    currencies: [currency],
    feeCurrencies: [currency],
    stakeCurrency: currency,
    gasPriceStep: {
      low: Math.max(0.001, Number((gasAmount * 0.5).toFixed(6))),
      average: Math.max(0.001, Number(gasAmount.toFixed(6))),
      high: Math.max(0.001, Number((gasAmount * 1.5).toFixed(6)))
    },
    features: ['stargate', 'cosmwasm']
  };

  const fn = keplr.experimentalSuggestChain || keplr.suggestChain;
  if (!fn) {
    throw new Error(
      'Your Keplr version does not support suggestChain/experimentalSuggestChain. Please update Keplr.'
    );
  }

  await fn.call(keplr, chainInfo);
}

export async function connectWallet() {
  const cfg = getAppConfig();
  const keplr = getKeplr();

  await keplr.enable(cfg.chainId);
  const offlineSigner = keplr.getOfflineSigner(cfg.chainId);
  const accounts = await offlineSigner.getAccounts();
  const address = accounts?.[0]?.address;

  if (!address) throw new Error('No account found in Keplr for this chain.');

  return { address, offlineSigner };
}

export async function getQueryClient() {
  const cfg = getAppConfig();
  return CosmWasmClient.connect(cfg.rpcEndpoint);
}

export async function getSigningClient(offlineSigner) {
  const cfg = getAppConfig();
  return SigningCosmWasmClient.connectWithSigner(cfg.rpcEndpoint, offlineSigner, {
    gasPrice: GasPrice.fromString(cfg.gasPrice)
  });
}

export async function queryLastMessage() {
  const cfg = getAppConfig();
  const client = await getQueryClient();
  return client.queryContractSmart(cfg.contractAddress, { get_last_message: {} });
}

export async function queryMessageCount() {
  const cfg = getAppConfig();
  const client = await getQueryClient();
  return client.queryContractSmart(cfg.contractAddress, { get_message_count: {} });
}

export async function postMessage(signingClient, senderAddress, message) {
  const cfg = getAppConfig();

  const trimmed = String(message ?? '').trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  if ([...trimmed].length > 140) throw new Error('Message too long (max 140 characters).');

  const msg = { post_message: { message: trimmed } };
  const fee = 'auto';
  return signingClient.execute(senderAddress, cfg.contractAddress, msg, fee);
}
