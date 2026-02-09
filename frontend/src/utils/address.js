import { fromBech32, toHex } from '@cosmjs/encoding';

/**
 * Converts a Cosmos bech32 address (e.g. wasm1...) into a 0x-prefixed 20-byte hex string.
 * UI/display only: this does not make it an Ethereum account.
 */
export function toDisplayAddress(bech32Address) {
  try {
    const { data } = fromBech32(String(bech32Address));
    return `0x${toHex(data)}`;
  } catch {
    return String(bech32Address ?? '');
  }
}
