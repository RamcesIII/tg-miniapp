import crypto from 'crypto';

export function parseQuery(qs) {
  return Object.fromEntries(new URLSearchParams(qs));
}

export function isValidInitData(initData, botToken) {
  if (!initData || !botToken) return false;
  const params = parseQuery(initData);
  const hash = params.hash;
  if (!hash) return false;

  const dataCheckString = Object.entries(params)
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calcHash = crypto.createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return calcHash === hash;
}

export function getUserFromInitData(initData) {
  const params = parseQuery(initData);
  try { return JSON.parse(params.user || '{}') || null; }
  catch { return null; }
}
