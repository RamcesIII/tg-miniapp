// /api/me.js
import { isValidInitData, getUserFromInitData } from './_verify.js';

export default async function handler(req, res) {
  try {
    const { initData = '' } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!initData) return res.status(200).json({ is_admin:false, reason:'no_initdata' });
    if (!token)     return res.status(500).json({ is_admin:false, reason:'no_bot_token' });

    const ok = isValidInitData(initData, token);
    if (!ok)       return res.status(200).json({ is_admin:false, reason:'invalid_signature' });

    const user = getUserFromInitData(initData);
    const adminIds = (process.env.ADMIN_IDS || '')
      .split(',').map(s=>s.trim()).filter(Boolean);

    const isAdmin = user && adminIds.includes(String(user.id));
    return res.status(200).json({
      is_admin: !!isAdmin,
      reason: isAdmin ? 'ok' : 'not_in_ADMIN_IDS',
      user_id: user?.id ?? null,
      admin_ids_count: adminIds.length
    });
  } catch (e) {
    return res.status(500).json({ is_admin:false, reason:'server_error' });
  }
}
