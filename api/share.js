const SUPABASE_URL = 'https://xyjypurmisfpikbgfxrx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uxHzHwcmnq-g1eQV6I3zfA_K0E9pG8D';
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function shorten(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const type = req.query.type;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'memeverse-pied.vercel.app').split(',')[0].trim();
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? host : 'memeverse-pied.vercel.app';
  const origin = 'https://' + safeHost;
  try {
    let record, canonical, title, description, image = '';
    if (type === 'profile') {
      const handle = String(req.query.handle || '').toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) return res.status(400).send('Invalid profile handle');
      const endpoint = SUPABASE_URL + '/rest/v1/x_profile_view?select=handle,display_name,bio,avatar_url&handle=eq.' + encodeURIComponent(handle) + '&limit=1';
      const response = await fetch(endpoint, {headers:{apikey:SUPABASE_KEY}});
      if (!response.ok) throw new Error('Profile lookup failed');
      [record] = await response.json();
      if (!record) return res.status(404).send('Profile not found');
      title = (record.display_name || record.handle) + ' (@' + record.handle + ') · MEMEVERSE';
      description = shorten(record.bio || 'Lihat profil player ini di MEMEVERSE X Network.', 180);
      image = record.avatar_url || '';
      canonical = origin + '/?x=profile&u=' + encodeURIComponent(record.handle);
    } else if (type === 'post') {
      const id = String(req.query.id || '');
      if (!/^[1-9][0-9]*$/.test(id)) return res.status(400).send('Invalid post id');
      const endpoint = SUPABASE_URL + '/rest/v1/x_post_view?select=id,body,handle,display_name,avatar_url,created_at&id=eq.' + encodeURIComponent(id) + '&limit=1';
      const response = await fetch(endpoint, {headers:{apikey:SUPABASE_KEY}});
      if (!response.ok) throw new Error('Post lookup failed');
      [record] = await response.json();
      if (!record) return res.status(404).send('Post not found');
      title = 'Post by ' + (record.display_name || record.handle) + ' · MEMEVERSE';
      description = shorten(record.body, 180);
      image = record.avatar_url || '';
      canonical = origin + '/?x=post&id=' + encodeURIComponent(record.id);
    } else return res.status(400).send('Invalid share type');
    const safeImage = /^https?:\/\//i.test(image) ? image : '';
    const t = escapeHtml(title), d = escapeHtml(description), im = escapeHtml(safeImage), c = escapeHtml(canonical);
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+t+'</title><meta name="description" content="'+d+'"><link rel="canonical" href="'+c+'"><meta property="og:type" content="article"><meta property="og:site_name" content="MEMEVERSE"><meta property="og:title" content="'+t+'"><meta property="og:description" content="'+d+'">'+(im?'<meta property="og:image" content="'+im+'">':'')+'<meta name="twitter:card" content="'+(im?'summary_large_image':'summary')+'"><meta name="twitter:title" content="'+t+'"><meta name="twitter:description" content="'+d+'">'+(im?'<meta name="twitter:image" content="'+im+'">':'')+'<meta http-equiv="refresh" content="0;url='+c+'"></head><body><p>Opening <a href="'+c+'">MEMEVERSE</a>…</p><script>window.location.replace('+JSON.stringify(canonical)+')</script></body></html>';
    return res.status(200).send(html);
  } catch (error) {
    return res.status(502).send('Unable to generate share preview');
  }
};
