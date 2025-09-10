import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

function actor(req){
  const hdr = req.headers['x-admin-user'];
  return hdr ? `editor:${hdr}` : 'owner';
}
function isOwner(initData){
  if(!isValidInitData(initData, process.env.BOT_TOKEN)) return false;
  const u = getUserFromInitData(initData);
  const adminIds = (process.env.ADMIN_IDS||'').split(',').map(s=>s.trim());
  return u && adminIds.includes(String(u.id));
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'){
      // لیست با فیلترها
      const { brand, minp, maxp, used, birang, bedun, retarder, intarder, year } = req.query;
      let q = supabase.from('posts').select('*').order('created_at',{ascending:false});
      if(brand) q = q.eq('brand', brand);
      if(minp)  q = q.gte('price_toman', Number(minp));
      if(maxp)  q = q.lte('price_toman', Number(maxp));
      if(year)  q = q.eq('year', Number(year));
      // فیلتر چک‌باکسی:
      if(used==='true') q = q.eq('used', true);
      if(used==='false') q = q.eq('used', false);
      if(birang==='true') q = q.eq('birang', true);
      if(bedun==='true') q = q.eq('bedun_abrang', true);
      if(retarder==='true') q = q.eq('retarder', true);
      if(intarder==='true') q = q.eq('intarder', true);

      const { data, error } = await q;
      if(error) return res.status(500).json({ ok:false, error:error.message });
      return res.status(200).json({ ok:true, items:data });
    }

    if(req.method==='POST'){
      // ایجاد/ویرایش
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
        images: payload?.images || []
      };

      let resp;
      if(payload?.id){
        row.updated_at = new Date().toISOString();
        resp = await supabase.from('posts').update(row).eq('id', payload.id).select('*').maybeSingle();
        await supabase.from('audit_logs').insert({ actor: editorUser?`editor:${editorUser}`:'owner', action:'update_post', meta:{ id: payload.id } });
      } else {
        resp = await supabase.from('posts').insert(row).select('*').maybeSingle();
        await supabase.from('audit_logs').insert({ actor: editorUser?`editor:${editorUser}`:'owner', action:'create_post', meta:{ id: resp.data?.id } });
      }

      if(resp.error) return res.status(500).json({ ok:false, error:resp.error.message });
      return res.status(200).json({ ok:true, item: resp.data });
    }

    if(req.method==='PATCH'){
      // تغییر sold
      const { initData='', id, sold, editorUser } = req.body || {};
      const asOwner = isOwner(initData);
      const canWrite = asOwner || !!editorUser;
      if(!canWrite) return res.status(403).json({ ok:false, error:'forbidden' });

      const { error } = await supabase.from('posts').update({ sold: !!sold, updated_at: new Date().toISOString() }).eq('id', Number(id));
      if(error) return res.status(500).json({ ok:false, error:error.message });
      await supabase.from('audit_logs').insert({ actor: editorUser?`editor:${editorUser}`:'owner', action:'toggle_sold', meta:{ id, sold:!!sold } });
      return res.status(200).json({ ok:true });
    }

    res.setHeader('Allow','GET,POST,PATCH');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
