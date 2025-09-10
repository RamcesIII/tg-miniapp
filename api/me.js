import { isValidInitData, getUserFromInitData } from './_verify.js';

export default async function handler(req, res) {
  try {
    const { initData = '' } = req.query;
    const ok = isValidInitData(initData, process.env.BOT_TOKEN);
    if (!ok) return res.status(200).json({ is_admin: false });

    const user = getUserFromInitData(initData);
    const adminIds = (process.env.ADMIN_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const isAdmin = user && adminIds.includes(String(user.id));
    return res.status(200).json({ is_admin: !!isAdmin, user_id: user?.id || null });
  } catch (e) {
    return res.status(500).json({ is_admin: false, error: 'server_error' });
  }
}
