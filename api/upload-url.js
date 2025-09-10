// /api/upload-url.js
import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

function isOwner(initData){
  if(!isValidInitData(initData, process.env.BOT_TOKEN)) return false;
  const u = getUserFromInitData(initData);
  const ids = (process.env.ADMIN_IDS||'').split(',').map(s=>s.trim());
  return u && ids.includes(String(u.id));
}

function isAdmin(body){
  return isOwner(body?.initData || '') || !!body?.editorUser;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow','POST');
      return res.status(405).json({ ok:false, error:'method_not_allowed' });
    }
    if (!isAdmin(req.body)) return res.status(403).json({ ok:false, error:'forbidden' });

    const { filename='' } = req.body || {};
    if (!filename) return res.status(400).json({ ok:false, error:'missing_filename' });

    const safe = filename.replace(/[^\w.\-]+/g, '_');
    const path = `posts/${Date.now()}_${safe}`;

    const { data, error } = await supabase
      .storage
      .from('images')
      .createSignedUploadUrl(path, 120); // 2 دقیقه

    if (error) return res.status(500).json({ ok:false, error:error.message });

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${path}`;
    return res.status(200).json({ ok:true, bucket:'images', path, token:data.token, publicUrl });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
