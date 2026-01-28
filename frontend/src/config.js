export function requireEnv(key) {
  const value = import.meta.env[key];
  if (!value || String(value).trim() === '') {
    throw new Error(
      `Missing required env: ${key}. Create frontend/.env from frontend/.env.example and fill it.`
    );
  }
  return String(value);
}

export function getAppConfig() {
  return {
    appName: import.meta.env.VITE_APP_NAME || 'BlockBoard Cosmos',
    chainId: requireEnv('VITE_CHAIN_ID'),
    bech32Prefix: requireEnv('VITE_BECH32_PREFIX'),
    rpcEndpoint: requireEnv('VITE_RPC_ENDPOINT'),
    restEndpoint: import.meta.env.VITE_REST_ENDPOINT || '',
    denom: requireEnv('VITE_DENOM'),
    gasPrice: requireEnv('VITE_GAS_PRICE'),
    contractAddress: requireEnv('VITE_CONTRACT_ADDRESS')
  };
}
