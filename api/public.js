// /api/public.js
export default async function handler(req, res) {
  return res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnon: process.env.SUPABASE_ANON_PUBLIC
  });
}
