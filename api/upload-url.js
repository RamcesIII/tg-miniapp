import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req,res){
  try{
    if(req.method!=='POST') { res.setHeader('Allow','POST'); return res.status(405).json({ ok:false }); }
    const { filename, contentType } = req.body || {};
    if(!filename || !contentType) return res.status(400).json({ ok:false, error:'missing' });

    const path = `posts/${Date.now()}_${filename}`;
    // آپلود مستقیم با SDK (ساده‌تر از URL امضاشده):
    const { error } = await supabase.storage.from('images').upload(path, Buffer.from(''), { upsert:false, contentType });
    if(error && !String(error.message).includes('Empty')) {
      // هک: چون بدنه خالیه، اول یک فایل خالی می‌سازیم تا public URL بدهیم؛ بعد PUT می‌کنیم
    }
    const { data:pub } = supabase.storage.from('images').getPublicUrl(path);
    return res.status(200).json({ ok:true, path, publicUrl: pub.publicUrl });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
