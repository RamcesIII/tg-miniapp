import { createClient } from '@supabase/supabase-js';
import { isValidInitData, getUserFromInitData } from './_verify.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

function isOwner(initData){
  if(!isValidInitData(initData, process.env.BOT_TOKEN)) return false;
  const u = getUserFromInitData(initData);
  const adminIds = (process.env.ADMIN_IDS||'').split(',').map(s=>s.trim());
  return u && adminIds.includes(String(u.id));
}

export default async function handler(req,res){
  try{
    if(req.method==='POST'){
      const { username, password } = req.body||{};
      if(!username || !password) return res.status(400).json({ ok:false, error:'missing' });

      const { data, error } = await supabase
        .from('admin_users')
        .select('id,username,pass_hash,active,role')
        .eq('username', username)
        .maybeSingle();

      if(error || !data || !data.active) return res.status(401).json({ ok:false, error:'invalid' });

      const ok = await bcrypt.compare(password, data.pass_hash);
      if(!ok) {
        await supabase.from('audit_logs').insert({ actor:'public', action:'login_fail', meta:{ username } });
        return res.status(401).json({ ok:false, error:'invalid' });
      }

      // سشن خیلی ساده: یک توکن تصادفی و ذخیره‌ی موقتی در pass_hash? نه،
      // بهتر: ستون جدیدی برای session_token نگذاریم؛ همین‌جا برمی‌گردانیم (stateless)،
      // ولی برای چک بعدی ساده‌ترین کار: توکن را برگردان و در فرانت بفرستیم به /api/me?token=...
      const session = uuidv4() + '.' + uuidv4();
      // برای کنترل، همان توکن را موقتاً در last_login_at بنویسیم در کنار ثبت لاگ
      await supabase.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.id);
      await supabase.from('audit_logs').insert({ actor:`editor:${username}`, action:'login_success', meta:{} });

      // امضا (خیلی ساده)
      const signed = Buffer.from(session + '|' + username).toString('base64');
      return res.status(200).json({ ok:true, token: signed, role: data.role || 'editor' });
    }

    // Owner → رمزساز / revoke
    if(req.method==='PUT'){
      const { initData='', cmd, username } = req.body||{};
      if(!isOwner(initData)) return res.status(403).json({ ok:false, error:'forbidden' });

      if(cmd === 'generate'){
        const u = 'ed_' + Math.random().toString(36).slice(2,8);
        const p = Math.random().toString(36).slice(2,6) + Math.random().toString(10).slice(2,6);
        const hash = await bcrypt.hash(p, 10);
        await supabase.from('admin_users').insert({ username: u, pass_hash: hash, role:'editor', active:true });
        await supabase.from('audit_logs').insert({ actor:'owner', action:'generate_editor', meta:{ username:u } });
        return res.status(200).json({ ok:true, username: u, password: p });
      }

      if(cmd === 'revoke'){
        if(!username) return res.status(400).json({ ok:false, error:'missing_username' });
        await supabase.from('admin_users').update({ active:false }).eq('username', username);
        await supabase.from('audit_logs').insert({ actor:'owner', action:'revoke_editor', meta:{ username } });
        return res.status(200).json({ ok:true });
      }

      return res.status(400).json({ ok:false, error:'bad_cmd' });
    }

    res.setHeader('Allow','POST,PUT');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }catch(e){
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
