const STORAGE_KEY = 'blockboard.auditLog.v1';
const MAX_EVENTS = 300;

const LOG_LEVEL = import.meta.env?.VITE_LOG_LEVEL || 'info';
const DEBUG_ENABLED = String(LOG_LEVEL).toLowerCase() === 'debug';

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function loadAuditLog() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeJsonParse(raw, null) : null;
  if (!parsed || typeof parsed !== 'object') return { version: 1, events: [] };
  if (!Array.isArray(parsed.events)) return { version: 1, events: [] };
  return { version: 1, events: parsed.events };
}

export function appendAuditEvent(event) {
  const log = loadAuditLog();
  const enriched = {
    ts: nowIso(),
    ...event
  };

  if (DEBUG_ENABLED) {
    // Safe debug output; does not include secrets.
    // eslint-disable-next-line no-console
    console.debug('[blockboard][audit]', enriched);
  }

  log.events.push(enriched);
  if (log.events.length > MAX_EVENTS) {
    log.events = log.events.slice(log.events.length - MAX_EVENTS);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  return enriched;
}

export function clearAuditLog() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadAuditLog(filename = 'blockboard-audit-log.json') {
  const log = loadAuditLog();
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
