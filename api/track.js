import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

export default async function handler(req,res){
  try{
    if(req.method!=='POST'){ res.setHeader('Allow','POST'); return res.status(405).json({ ok:false }); }
    const { action, meta } = req.body || {};
    await supabase.from('audit_logs').insert({ actor:'public', action: action||'event', meta: meta||{} });
    return res.status(200).json({ ok:true });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
