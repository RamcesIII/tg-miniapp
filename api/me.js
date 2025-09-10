import { isValidInitData, getUserFromInitData } from './_verify.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req, res){
  try {
    const { initData = '', token = '' } = req.query;

    // 1) owner با تلگرام
    if (isValidInitData(initData, process.env.BOT_TOKEN)) {
      const u = getUserFromInitData(initData);
      const isOwner = (process.env.ADMIN_IDS || '').split(',').map(s=>s.trim()).includes(String(u?.id));
      if (isOwner) return res.status(200).json({ role: 'owner', is_admin: true, user_id: u?.id });
    }

    // 2) editor با توکن سشن (پس از login)
    if (token) {
      const { data, error } = await supabase
        .from('admin_users')
        .select('username,active,role')
        .eq('pass_hash', token)   // سشن بسیار ساده: token را در pass_hash‌ای جدا ذخیره نکنیم؛ در عمل بهتر است جدول session جدا داشته باشیم. برای سادگی همین.
        .maybeSingle();
      if (!error && data && data.active) {
        return res.status(200).json({ role: data.role || 'editor', is_admin: true, username: data.username });
      }
    }

    return res.status(200).json({ role: 'public', is_admin: false });
  } catch {
    return res.status(500).json({ role: 'public', is_admin: false });
  }
}
