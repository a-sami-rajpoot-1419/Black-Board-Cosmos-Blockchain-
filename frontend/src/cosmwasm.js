import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { getAppConfig } from './config';

function getKeplr() {
  const keplr = window.keplr;
  if (!keplr) {
    throw new Error('Keplr not found. Install the Keplr browser extension.');
  }
  return keplr;
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
