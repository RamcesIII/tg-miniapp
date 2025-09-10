import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

function canWrite(initData) {
  if (!isValidInitData(initData, process.env.BOT_TOKEN)) return false;
  const u = getUserFromInitData(initData);
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return u && adminIds.includes(String(u.id));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      welcome_text: data?.welcome_text || '',
      menu: data?.menu || []
    });
  }

  if (req.method === 'POST') {
    try {
      const { initData = '', config } = req.body || {};
      if (!canWrite(initData)) return res.status(403).json({ ok: false, error: 'forbidden' });

      const { error } = await supabase
        .from('app_config')
        .update({
          welcome_text: String(config?.welcome_text || ''),
          menu: config?.menu || []
        })
        .eq('id', 1);

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(400).json({ ok: false, error: 'bad_request' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
}
