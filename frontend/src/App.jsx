import { useMemo, useState } from 'react';
import './styles.css';
import { getAppConfig } from './config';
import {
  connectWallet,
  getSigningClient,
  postMessage,
  queryLastMessage,
  queryMessageCount,
  suggestChain
} from './cosmwasm';

export default function App() {
  const cfg = useMemo(() => getAppConfig(), []);
  const [address, setAddress] = useState('');
  const [signingClient, setSigningClient] = useState(null);
  const [lastMessage, setLastMessage] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', text: '' });

  async function refresh() {
    const [last, count] = await Promise.all([queryLastMessage(), queryMessageCount()]);
    setLastMessage(last?.last_message ?? '');
    setMessageCount(Number(count?.message_count ?? 0));
  }

  async function onConnect() {
    try {
      setStatus({ kind: 'pending', text: 'Connecting wallet…' });
      const { address: addr, offlineSigner } = await connectWallet();
      const client = await getSigningClient(offlineSigner);
      setAddress(addr);
      setSigningClient(client);
      await refresh();
      setStatus({ kind: 'ok', text: 'Wallet connected.' });
    } catch (e) {
      setStatus({ kind: 'error', text: e?.message ?? String(e) });
    }
  }

  async function onSuggestChain() {
    try {
      setStatus({ kind: 'pending', text: 'Requesting Keplr to add the local chain…' });
      await suggestChain();
      setStatus({ kind: 'ok', text: 'Chain added in Keplr. Now click “Connect Wallet”.' });
    } catch (e) {
      setStatus({ kind: 'error', text: e?.message ?? String(e) });
    }
  }

  async function onPost() {
    try {
      if (!signingClient || !address) return;
      setStatus({ kind: 'pending', text: 'Broadcasting transaction…' });
      await postMessage(signingClient, address, message);
      setMessage('');
      await refresh();
      setStatus({ kind: 'ok', text: 'Message posted.' });
    } catch (e) {
      setStatus({ kind: 'error', text: e?.message ?? String(e) });
    }
  }

  const connected = Boolean(address && signingClient);

  return (
    <div className="container">
      <div className="card">
        <div className="title">
          <h1>{cfg.appName}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn" onClick={onSuggestChain}>
              Add Local Chain to Keplr
            </button>
            <button className="btn primary" onClick={onConnect} disabled={connected}>
              {connected ? 'Wallet Connected' : 'Connect Wallet'}
            </button>
          </div>
        </div>

        <div className="row">
          <div className="panel">
            <div className="label">Wallet</div>
            <div className="value">{connected ? address : 'Not connected'}</div>
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
              <button className="btn" onClick={refresh} disabled={!connected}>
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
