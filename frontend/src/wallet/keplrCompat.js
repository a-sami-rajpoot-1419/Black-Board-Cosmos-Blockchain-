import { MainWalletBase } from '@cosmos-kit/core';
import {
  ChainKeplrExtension,
  KeplrClient,
  keplrExtensionInfo,
  preferredEndpoints
} from '@cosmos-kit/keplr-extension';
import { Keplr } from '@keplr-wallet/provider-extension';

class KeplrCompatExtensionWallet extends MainWalletBase {
  constructor(walletInfo, endpoints) {
    super(walletInfo, ChainKeplrExtension);
    this.preferredEndpoints = endpoints;
  }

  async initClient() {
    this.initingClient();
    try {
      // Prefer legacy injection (`window.keplr`) when available.
      // Some environments expose MetaMask-style proxy APIs but never respond,
      // causing `Keplr.getKeplr()` to hang during the `ping` request.
      const injected =
        typeof window !== 'undefined' &&
        window.keplr &&
        typeof window.keplr.enable === 'function'
          ? window.keplr
          : undefined;

      const keplr = injected ?? (await Keplr.getKeplr());
      this.initClientDone(keplr ? new KeplrClient(keplr) : undefined);
    } catch (error) {
      this.initClientError(error);
    }
  }
}

const keplrCompat = new KeplrCompatExtensionWallet(keplrExtensionInfo, preferredEndpoints);

export const wallets = [keplrCompat];
