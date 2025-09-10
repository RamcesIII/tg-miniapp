// /api/config.js
import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error('supabase_env_missing');
  return createClient(url, key);
}

function isAdminByInitData(initData) {
  if (!isValidInitData(initData, process.env.BOT_TOKEN)) return false;
  const u = getUserFromInitData(initData);
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  return u && adminIds.includes(String(u.id));
}

const DEFAULT_CFG = { welcome_text: 'سلام!', menu: [] };

export default async function handler(req, res) {
  try {
    const supabase = getClient();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle(); // اگر نبود، error نمی‌دهد

      if (error) {
        // همیشه JSON برگردان
        return res.status(500).json({ error: error.message, ok: false });
      }
      // اگر ردیف نبود، مقدار پیش‌فرض بده
      const row = data || DEFAULT_CFG;
      return res.status(200).json({
        welcome_text: row.welcome_text ?? DEFAULT_CFG.welcome_text,
        menu: row.menu ?? DEFAULT_CFG.menu,
      });
    }

    if (req.method === 'POST') {
      const { initData = '', config } = req.body || {};
      if (!isAdminByInitData(initData)) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }
      const supabase = getClient();
      // UPSERT: اگر ردیف id=1 نبود، بساز؛ اگر بود، آپدیت کن
      const { error } = await supabase
        .from('app_config')
        .upsert({
          id: 1,
          welcome_text: String(config?.welcome_text || ''),
          menu: config?.menu || [],
        }, { onConflict: 'id' });

      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (e) {
    // هر خطای پیش‌بینی‌نشده → JSON
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
