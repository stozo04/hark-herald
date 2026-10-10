export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Live storage is not configured.' });
  try {
    const base = new URL(url);
    if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co')) throw new Error('Invalid storage host');
    const headers = { apikey: key };
    const paths = [
      'hark_settings?select=*&id=eq.main',
      'hark_features?select=*&order=shipped_on.asc,id.asc',
      'hark_users?select=*&order=as_of.asc',
    ];
    const responses = await Promise.all(paths.map(path => fetch(`${base.origin}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(8000) })));
    if (responses.some(r => !r.ok)) throw new Error('Storage read failed');
    const [settings, features, users] = await Promise.all(responses.map(r => r.json()));
    if (settings.length !== 1) throw new Error('Storage is not initialized');
    return res.status(200).json({ challenge: settings[0].content, features, users, mode: 'supabase' });
  } catch {
    return res.status(503).json({ error: 'Live storage is unavailable. Try again shortly.' });
  }
}
