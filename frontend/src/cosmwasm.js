import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { getAppConfig } from './config';

export async function getQueryClient() {
  const cfg = getAppConfig();
  return CosmWasmClient.connect(cfg.rpcEndpoint);
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
