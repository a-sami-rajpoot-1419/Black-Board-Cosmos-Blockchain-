import { useEffect, useMemo, useState } from 'react';
import { useChainWallet } from '@cosmos-kit/react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import './styles.css';
import { getAppConfig } from './config';
import {
  postMessage,
  queryLastMessage,
  queryMessageCount
} from './cosmwasm';

import { appendAuditEvent, clearAuditLog, downloadAuditLog } from './utils/auditLog';
import { toDisplayAddress } from './utils/address';

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function hasMetaMask() {
  return typeof window !== 'undefined' && Boolean(window.ethereum && window.ethereum.isMetaMask);
}

function hasKeplr() {
  return (
    typeof window !== 'undefined' &&
    (Boolean(window.keplr && typeof window.keplr.enable === 'function') ||
      window.keplrRequestMetaIdSupport != null)
  );
}

export default function App() {
  const cfg = useMemo(() => getAppConfig(), []);
  const keplr = useChainWallet(cfg.chainId, 'keplr-extension', true);
  const metamask = useChainWallet(cfg.chainId, 'leap-metamask-cosmos-snap', true);

  const [selectedWalletName, setSelectedWalletName] = useState(() => {
    const stored = localStorage.getItem('blockboard.selectedWallet');
    return stored === 'leap-metamask-cosmos-snap' ? stored : 'keplr-extension';
  });

  const wallet = selectedWalletName === 'leap-metamask-cosmos-snap' ? metamask : keplr;

  // NOTE: `useChainWallet()` returns a context object that includes some snapshot values
  // (status/address booleans). Those snapshot values do NOT automatically track updates.
  // The live, reactive source of truth is `wallet.chainWallet` (a ChainWalletBase instance).
  const chainWallet = wallet?.chainWallet;
  const liveStatus = chainWallet?.walletStatus ?? wallet?.status ?? 'Disconnected';
  const liveMessage = chainWallet?.message ?? wallet?.message ?? '';
  const liveAddress = chainWallet?.address ?? wallet?.address ?? '';
  const liveIsConnecting = Boolean(chainWallet?.isWalletConnecting);
  const liveIsConnected = Boolean(chainWallet?.isWalletConnected && liveAddress);
  const liveIsError = Boolean(chainWallet?.isWalletError);

  const [lastMessage, setLastMessage] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', text: '' });
  const [connectInFlight, setConnectInFlight] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastConnectMs, setLastConnectMs] = useState(0);
  const [lastError, setLastError] = useState('');
  const [lastConnectedAddress, setLastConnectedAddress] = useState('');

  function snapshotWalletState(label) {
    const cw = wallet?.chainWallet;
    const snap = {
      label,
      selectedWalletName,
      walletName: wallet.wallet?.name ?? '',
      prettyName: wallet.wallet?.prettyName ?? '',
      status: cw?.walletStatus ?? wallet.status,
      message: cw?.message ?? wallet.message ?? '',
      isWalletDisconnected: Boolean(cw?.isWalletDisconnected),
      isWalletConnecting: Boolean(cw?.isWalletConnecting),
      isWalletConnected: Boolean(cw?.isWalletConnected),
      isWalletRejected: Boolean(cw?.isWalletRejected),
      isWalletNotExist: Boolean(cw?.isWalletNotExist),
      isWalletError: Boolean(cw?.isWalletError),
      address: cw?.address ?? wallet.address ?? '',
      hasKeplr: hasKeplr(),
      hasMetaMask: hasMetaMask(),
      keplrRequestMetaIdSupport:
        typeof window !== 'undefined' ? Boolean(window.keplrRequestMetaIdSupport) : false
    };
    appendAuditEvent({ type: 'wallet.state', ...snap });
    return snap;
  }

  async function resolveConnectedAddress() {
    if (chainWallet?.address) {
      return { address: chainWallet.address, source: 'chainWallet.address' };
    }

    try {
      const signer = wallet.getOfflineSignerDirect();
      const accounts = await withTimeout(signer.getAccounts(), 5000, 'signer.getAccounts');
      const first = accounts?.[0]?.address;
      if (first) return { address: first, source: 'signer.getAccounts[0]' };
    } catch {
      // ignore; fall back
    }

    try {
      const account = await withTimeout(wallet.getAccount(), 15000, 'wallet.getAccount');
      const addr = account?.address ?? account?.bech32Address ?? '';
      if (addr) return { address: addr, source: 'wallet.getAccount' };
    } catch {
      // ignore; fall through
    }

    throw new Error('Wallet connected but no address could be resolved from signer or wallet API.');
  }

  async function refresh() {
    appendAuditEvent({
      type: 'query.refresh',
      walletName: wallet.wallet?.name ?? '',
      address: liveAddress
    });
    const [last, count] = await Promise.all([queryLastMessage(), queryMessageCount()]);
    setLastMessage(last?.last_message ?? '');
    setMessageCount(Number(count?.message_count ?? 0));
  }

  async function onConnect() {
    try {
      if (liveIsConnected) {
        setStatus({ kind: 'ok', text: 'Wallet already connected.' });
        return;
      }

      if (!chainWallet) {
        const msg = 'Wallet is not ready yet. Wait a second and retry.';
        setStatus({ kind: 'error', text: msg });
        setLastError(msg);
        return;
      }

      setLastError('');
      setConnectInFlight(true);
      const t0 = performance.now();

      setStatus({ kind: 'pending', text: 'Connecting wallet… (watch extension popup)' });
      appendAuditEvent({ type: 'wallet.connect', walletName: wallet.wallet?.name ?? selectedWalletName });
      snapshotWalletState('before_connect');

      if (selectedWalletName === 'keplr-extension' && !hasKeplr()) {
        const msg = 'Keplr extension not detected. Install/unlock Keplr, then reload the page.';
        appendAuditEvent({ type: 'wallet.connect_error', walletName: selectedWalletName, error: msg });
        setStatus({ kind: 'error', text: msg });
        setLastError(msg);
        return;
      }

      if (selectedWalletName === 'leap-metamask-cosmos-snap' && !hasMetaMask()) {
        const msg = 'MetaMask not detected. Install/unlock MetaMask, then reload the page.';
        appendAuditEvent({ type: 'wallet.connect_error', walletName: selectedWalletName, error: msg });
        setStatus({ kind: 'error', text: msg });
        setLastError(msg);
        return;
      }

      if (selectedWalletName === 'leap-metamask-cosmos-snap') {
        try {
          const snaps = await withTimeout(
            window.ethereum.request({ method: 'wallet_getSnaps' }),
            5000,
            'wallet_getSnaps'
          );
          const snapIds = snaps ? Object.keys(snaps) : [];
          appendAuditEvent({ type: 'wallet.metamask.snaps', snapCount: snapIds.length, snapIds: snapIds.slice(0, 20) });
        } catch (e) {
          appendAuditEvent({ type: 'wallet.metamask.snaps_error', error: e?.message ?? String(e) });
        }
      }

      // Call the live ChainWalletBase directly.
      await withTimeout(chainWallet.connect(), 60000, `wallet.connect(${selectedWalletName})`);
      snapshotWalletState('after_connect_return');

      // Response check: resolve address from the best available source.
      const { address: addr, source } = await withTimeout(resolveConnectedAddress(), 20000, 'resolveConnectedAddress');
      appendAuditEvent({ type: 'wallet.address_resolved', walletName: wallet.wallet?.name ?? '', address: addr, source });

      // Sanity check: signer is usable.
      const signer = wallet.getOfflineSignerDirect();
      const accounts = await withTimeout(signer.getAccounts(), 5000, 'signer.getAccounts');
      appendAuditEvent({
        type: 'wallet.signer_ready',
        walletName: wallet.wallet?.name ?? '',
        address: addr,
        signerAccounts: accounts?.map((a) => a.address) ?? []
      });

      setLastConnectMs(Math.round(performance.now() - t0));
      setStatus({ kind: 'ok', text: 'Wallet connected.' });
      await refresh();
    } catch (e) {
      const msg = e?.message ?? String(e);
      appendAuditEvent({ type: 'wallet.connect_error', error: msg, walletName: selectedWalletName });
      snapshotWalletState('connect_error');
      setStatus({ kind: 'error', text: msg });
      setLastError(msg);

      // Best-effort reset in case a connector left us in a bad state.
      try {
        if (chainWallet) {
          await withTimeout(chainWallet.disconnect(), 3000, 'wallet.disconnect');
        }
      } catch {
        // ignore
      }
    } finally {
      setConnectInFlight(false);
    }
  }

  async function onDisconnect() {
    try {
      if (chainWallet) {
        await withTimeout(chainWallet.disconnect(), 5000, 'wallet.disconnect');
      }
      appendAuditEvent({ type: 'wallet.disconnected' });
      setStatus({ kind: 'ok', text: 'Disconnected.' });
    } catch (e) {
      appendAuditEvent({ type: 'wallet.disconnect_error', error: e?.message ?? String(e) });
      setStatus({ kind: 'error', text: e?.message ?? String(e) });
    }
  }

  async function onPost() {
    try {
      if (!liveIsConnected || !liveAddress) return;
      setStatus({ kind: 'pending', text: 'Broadcasting transaction…' });

      // CosmosKit's built-in `getSigningCosmWasmClient()` can fail in some bundler setups.
      // We instead build the client ourselves using the wallet-provided OfflineSigner.
      const offlineSigner = wallet.getOfflineSignerDirect();
      const signingClient = await SigningCosmWasmClient.connectWithSigner(
        cfg.rpcEndpoint,
        offlineSigner,
        { gasPrice: GasPrice.fromString(cfg.gasPrice) }
      );

      appendAuditEvent({
        type: 'tx.post_message.submit',
        walletName: wallet.wallet?.name ?? '',
        address: liveAddress,
        display0x: toDisplayAddress(liveAddress),
        contract: cfg.contractAddress,
        msgPreview: String(message ?? '').slice(0, 180)
      });

      const result = await postMessage(signingClient, liveAddress, message);

      appendAuditEvent({
        type: 'tx.post_message.result',
        txhash: result?.transactionHash ?? result?.txhash ?? '',
        rawLog: result?.rawLog ?? '',
        height: result?.height ?? 0,
        code: result?.code
      });

      setMessage('');
      await refresh();
      setStatus({ kind: 'ok', text: 'Message posted.' });
    } catch (e) {
      const msg = e?.message ?? String(e);
      const isUserRejected = /rejected|denied|user rejected/i.test(msg);
      appendAuditEvent({
        type: 'tx.post_message.error',
        error: msg,
        walletName: wallet.wallet?.name ?? '',
        rejected: isUserRejected
      });
      if (isUserRejected) {
        setStatus({ kind: 'idle', text: 'Signature rejected.' });
        return;
      }
      setStatus({ kind: 'error', text: msg });
    }
  }

  useEffect(() => {
    // Keep a small, user-visible status in sync with wallet state.
    if (liveIsConnecting && connectInFlight) {
      setStatus({ kind: 'pending', text: 'Connecting wallet…' });
      return;
    }

    if (liveIsError) {
      const msg = liveMessage || 'Wallet error.';
      setStatus({ kind: 'error', text: msg });
      appendAuditEvent({ type: 'wallet.error', error: msg });
      return;
    }

    if (liveIsConnected && liveAddress) {
      if (liveAddress !== lastConnectedAddress) {
        setLastConnectedAddress(liveAddress);
      }
      appendAuditEvent({
        type: 'wallet.connected',
        walletName: wallet.wallet?.name ?? '',
        address: liveAddress,
        display0x: toDisplayAddress(liveAddress)
      });
      refresh().catch((e) => {
        appendAuditEvent({ type: 'query.refresh_error', error: e?.message ?? String(e) });
      });
      setStatus({ kind: 'ok', text: 'Wallet connected.' });
    }
  }, [
    liveIsConnecting,
    liveIsError,
    liveIsConnected,
    liveAddress,
    connectInFlight,
    lastConnectedAddress
  ]);

  useEffect(() => {
    localStorage.setItem('blockboard.selectedWallet', selectedWalletName);
    appendAuditEvent({ type: 'wallet.selected', walletName: selectedWalletName });

    setConnectInFlight(false);

    // If switching wallets while connected, disconnect the other one to avoid mixed state.
    if (selectedWalletName === 'keplr-extension' && metamask?.chainWallet?.isWalletConnected) {
      withTimeout(metamask.chainWallet.disconnect(), 5000, 'metamask.disconnect').catch(() => {});
    }
    if (selectedWalletName === 'leap-metamask-cosmos-snap' && keplr?.chainWallet?.isWalletConnected) {
      withTimeout(keplr.chainWallet.disconnect(), 5000, 'keplr.disconnect').catch(() => {});
    }

    // Keep UI state consistent regardless of wallet.
    refresh().catch(() => {});
  }, [selectedWalletName]);

  useEffect(() => {
    // Initial load: show chain state even before connecting.
    refresh().catch(() => {});
  }, []);

  const connected = liveIsConnected;
  const walletLabel = wallet.wallet?.prettyName || wallet.wallet?.name || 'Wallet';

  return (
    <div className="container">
      <div className="card">
        <div className="title">
          <h1>{cfg.appName}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn" onClick={() => downloadAuditLog()}>
              Download Logs
            </button>
            <button className="btn" onClick={() => setDebugOpen((v) => !v)}>
              {debugOpen ? 'Hide Debug' : 'Show Debug'}
            </button>
            <button
              className="btn"
              onClick={() => {
                clearAuditLog();
                setStatus({ kind: 'ok', text: 'Logs cleared.' });
              }}
            >
              Clear Logs
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={selectedWalletName}
                onChange={(e) => setSelectedWalletName(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'rgba(18, 26, 35, 0.55)',
                  color: 'var(--text)'
                }}
              >
                <option value="keplr-extension">Keplr</option>
                <option value="leap-metamask-cosmos-snap">MetaMask (Leap Snap)</option>
              </select>
              <button className="btn primary" onClick={onConnect} disabled={connectInFlight}>
                {connected ? `${walletLabel} Connected` : 'Connect'}
              </button>
            </div>
            {connected ? (
              <button className="btn" onClick={onDisconnect}>
                Disconnect
              </button>
            ) : null}
          </div>
        </div>

        <div className="row">
          {debugOpen ? (
            <div className="panel" style={{ width: '100%' }}>
              <div className="label">Debug</div>
              <div className="value" style={{ fontSize: 12, lineHeight: 1.5 }}>
                <div>Server: http://localhost:5173 (should be 200)</div>
                <div>Selected wallet: {selectedWalletName}</div>
                <div>Wallet status: {String(liveStatus)}</div>
                <div>Wallet message: {String(liveMessage ?? '')}</div>
                <div>connectInFlight: {String(connectInFlight)}</div>
                <div>lastConnectMs: {String(lastConnectMs)}ms</div>
                <div>lastError: {String(lastError)}</div>
                <div>hasKeplr: {String(hasKeplr())}</div>
                <div>hasMetaMask: {String(hasMetaMask())}</div>
                <div>
                  keplrRequestMetaIdSupport: {String(
                    typeof window !== 'undefined' ? Boolean(window.keplrRequestMetaIdSupport) : false
                  )}
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    onClick={() => {
                      try {
                        const snap = snapshotWalletState('manual_snapshot');
                        setStatus({ kind: 'ok', text: `Snapshot logged (${snap.status}).` });
                      } catch (e) {
                        setStatus({ kind: 'error', text: e?.message ?? String(e) });
                      }
                    }}
                  >
                    Snapshot
                  </button>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        if (chainWallet) {
                          await withTimeout(chainWallet.disconnect(), 3000, 'wallet.disconnect');
                        }
                        setStatus({ kind: 'ok', text: 'Forced disconnect attempted.' });
                      } catch (e) {
                        setStatus({ kind: 'error', text: e?.message ?? String(e) });
                      }
                    }}
                  >
                    Force Disconnect
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="panel">
            <div className="label">Wallet</div>
            <div className="value">
              {connected ? (
                <>
                  <div>{liveAddress}</div>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                    {toDisplayAddress(liveAddress)}
                  </div>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                    {walletLabel}
                  </div>
                </>
              ) : (
                'Not connected'
              )}
            </div>
          </div>

          <div className="panel">
            <div className="label">Last Message</div>
            <div className="value">{lastMessage ? `"${lastMessage}"` : '(none yet)'}</div>
          </div>

          <div className="panel">
            <div className="label">Message Count</div>
            <div className="value">{messageCount}</div>
          </div>

          <div className="panel">
            <div className="label">New Message (≤ 140 chars)</div>
            <input
              type="text"
              value={message}
              maxLength={140}
              placeholder="Type a message…"
              onChange={(e) => setMessage(e.target.value)}
              disabled={!connected}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="btn primary" onClick={onPost} disabled={!connected}>
                Post Message
              </button>
              <button className="btn" onClick={refresh}>
                Refresh
              </button>
            </div>
            <div className={`status ${status.kind === 'error' ? 'error' : ''}`}>
              {status.text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
