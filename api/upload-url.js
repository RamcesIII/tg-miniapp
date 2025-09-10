// /api/upload-url.js
import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

function isAdmin(reqBody) {
  // owner (تلگرام) یا editor (سشن)
  const initData = reqBody?.initData || '';
  const editorUser = reqBody?.editorUser || '';
  const owner =
    isValidInitData(initData, process.env.BOT_TOKEN) &&
    (() => {
      const u = getUserFromInitData(initData);
      const ids = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim());
      return u && ids.includes(String(u.id));
    })();

  return owner || !!editorUser; // editor با نام کاربریِ لاگین‌شده
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    if (!isAdmin(req.body)) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const { filename = '' } = req.body || {};
    if (!filename) return res.status(400).json({ ok: false, error: 'missing_filename' });

    const safeName = filename.replace(/[^\w.\-]+/g, '_');
    const path = `posts/${Date.now()}_${safeName}`;

    // لینک امضاشده برای آپلود (مدت 2 دقیقه)
    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUploadUrl(path, 120); // ثانیه

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const publicBase = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/`;
    return res.status(200).json({
      ok: true,
      bucket: 'images',
      path,
      token: data.token,
      // این URL نهاییِ نمایش فایل بعد از آپلود است:
      publicUrl: publicBase + path
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
