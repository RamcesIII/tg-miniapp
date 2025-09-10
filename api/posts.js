// /api/posts.js
import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

function isOwner(initData){
  if(!isValidInitData(initData, process.env.BOT_TOKEN)) return false;
  const u = getUserFromInitData(initData);
  const ids = (process.env.ADMIN_IDS||'').split(',').map(s=>s.trim());
  return u && ids.includes(String(u.id));
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'){
      const { brand, minp, maxp, year } = req.query;
      let q = supabase.from('posts').select('*').order('created_at',{ascending:false});
      if(brand) q = q.eq('brand', brand);
      if(year)  q = q.eq('year', Number(year));
      if(minp)  q = q.gte('price_toman', Number(minp));
      if(maxp)  q = q.lte('price_toman', Number(maxp));
      const { data, error } = await q;
      if(error) return res.status(500).json({ ok:false, error:error.message });
      return res.status(200).json({ ok:true, items:data });
    }

    if(req.method==='POST'){
      const { initData='', payload, editorUser } = req.body || {};
      const asOwner = isOwner(initData);
      const canWrite = asOwner || !!editorUser;
      if(!canWrite) return res.status(403).json({ ok:false, error:'forbidden' });

      const row = {
        title: payload?.title || '',
        brand: payload?.brand || '',
        subbrand: payload?.subbrand || '',
        year: Number(payload?.year)||null,
        price_toman: Number(payload?.price_toman)||0,
        used: !!payload?.used,
        birang: !!payload?.birang,
        bedun_abrang: !!payload?.bedun_abrang,
        retarder: !!payload?.retarder,
        intarder: !!payload?.intarder,
        mileage_km: Number(payload?.mileage_km)||null,
        description: payload?.description || '',
        insta_url: payload?.insta_url || '',
        sold: !!payload?.sold,
        images: payload?.images || [],
        updated_at: new Date().toISOString()
      };

      let resp;
      if(payload?.id){
        resp = await supabase.from('posts').update(row).eq('id', payload.id).select('*').maybeSingle();
      } else {
        resp = await supabase.from('posts').insert(row).select('*').maybeSingle();
      }
      if(resp.error) return res.status(500).json({ ok:false, error:resp.error.message });
      return res.status(200).json({ ok:true, item: resp.data });
    }

    if(req.method==='PATCH'){
      const { initData='', id, sold, editorUser } = req.body || {};
      const asOwner = isOwner(initData);
      const canWrite = asOwner || !!editorUser;
      if(!canWrite) return res.status(403).json({ ok:false, error:'forbidden' });

      const { error } = await supabase.from('posts')
        .update({ sold: !!sold, updated_at: new Date().toISOString() })
        .eq('id', Number(id));
      if(error) return res.status(500).json({ ok:false, error:error.message });
      return res.status(200).json({ ok:true });
    }

    if(req.method==='DELETE'){
      const { initData='', id } = req.body || {};
      if(!isOwner(initData)) return res.status(403).json({ ok:false, error:'only_owner_can_delete' });
      const { error } = await supabase.from('posts').delete().eq('id', Number(id));
      if(error) return res.status(500).json({ ok:false, error:error.message });
      return res.status(200).json({ ok:true });
    }

    res.setHeader('Allow','GET,POST,PATCH,DELETE');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
