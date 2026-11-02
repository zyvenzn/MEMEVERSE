/* MEMEVERSE X Network — social layer (feed, like/repost/reply, follow, search/trending, notifications, DMs).
   Loaded after app.js. It reuses app.js globals (xClient, xUser, xProfile, esc, content, go) and replaces the old basic feed. */
(function () {
  'use strict';
  if (typeof xClient === 'undefined' || !xClient) return;

  const legacyPage = window.xNetworkPage;
  const $ = (id) => document.getElementById(id);
  const main = () => $('xn-main');

  const XN = {
    uid: null, view: 'home', params: {}, stack: [],
    feedTab: 'foryou', profileTab: 'profile',
    following: new Set(), notif: 0, dm: 0, newPosts: 0,
    cursor: null, feedOpts: null, chan: null, tok: 0
  };

  /* ---------- helpers ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    share: '<path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    at: '<circle cx="12" cy="12" r="9"/><path d="M16 12a4 4 0 1 1-1-2.65V13a2 2 0 0 0 4 0v-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
  };
  const ic = (n, s) => '<svg class="xn-ic" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>';

  function ago(t) {
    const s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 60) return 'baru';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'j';
    if (s < 604800) return Math.floor(s / 86400) + 'h';
    return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));

  function rich(text) {
    return esc(text)
      .replace(/(^|\s)([#$][A-Za-z_][A-Za-z0-9_]{1,29})/g, (m, a, b) => a + '<a href="#" class="xn-tag" data-act="tag" data-q="' + b + '">' + b + '</a>')
      .replace(/(^|\s)@([A-Za-z0-9_]{3,20})/g, (m, a, b) => a + '<a href="#" class="xn-mention" data-act="profile" data-handle="' + b.toLowerCase() + '">@' + b + '</a>');
  }

  function avatar(handle, name, size) {
    const sz = size || 40;
    const hue = ([...(handle || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360;
    return '<span class="xn-av" style="--h:' + hue + ';width:' + sz + 'px;height:' + sz + 'px;font-size:' + Math.round(sz * 0.42) + 'px">' + esc(((name || handle || '?') + '').trim().charAt(0).toUpperCase()) + '</span>';
  }

  function shareUrl(type, value) {
    const url = new URL('/api/share', window.location.origin);
    url.searchParams.set('type', type);
    if (type === 'profile') url.searchParams.set('handle', value);
    else url.searchParams.set('id', String(value));
    return url.toString();
  }

  async function copyLink(url) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement('textarea');
        input.value = url; input.style.position = 'fixed'; input.style.opacity = '0';
        document.body.appendChild(input); input.select();
        const copied = document.execCommand('copy'); input.remove();
        if (!copied) throw new Error('Clipboard tidak tersedia');
      }
      toast('Link berhasil disalin');
    } catch (err) { toast('Clipboard tidak tersedia. Link: ' + url); }
  }

  async function shareContent(url, title, text) {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
      else {
        const input = document.createElement('textarea');
        input.value = url; input.style.position = 'fixed'; input.style.opacity = '0';
        document.body.appendChild(input); input.select();
        const copied = document.execCommand('copy'); input.remove();
        if (!copied) throw new Error('Clipboard tidak tersedia');
      }
      toast('Link berhasil disalin');
    } catch (err) { toast('Tidak bisa membagikan link. Salin manual: ' + url); }
  }

  function syncRouteUrl(view, params, replace) {
    const url = new URL(window.location.href);
    ['x', 'u', 'id'].forEach((key) => url.searchParams.delete(key));
    if (view === 'profile' && params && params.handle) {
      url.searchParams.set('x', 'profile'); url.searchParams.set('u', params.handle);
    } else if (view === 'thread' && params && params.id) {
      url.searchParams.set('x', 'post'); url.searchParams.set('id', params.id);
    }
    window.history[replace ? 'replaceState' : 'pushState']({ xn: true }, '', url);
  }

  function readSharedRoute() {
    const q = new URLSearchParams(window.location.search);
    if (q.get('x') === 'profile' && /^[a-z0-9_]{3,20}$/i.test(q.get('u') || '')) return { view: 'profile', params: { handle: q.get('u').toLowerCase() } };
    if (q.get('x') === 'post' && /^[1-9][0-9]*$/.test(q.get('id') || '')) return { view: 'thread', params: { id: q.get('id') } };
    return null;
  }

  function toast(msg) {
    let t = $('xn-toast');
    if (!t) { t = document.createElement('div'); t.id = 'xn-toast'; t.className = 'xn-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  const skel = '<div class="xn-skel"></div><div class="xn-skel"></div><div class="xn-skel"></div>';
  const empty = (m) => '<p class="xn-empty">' + m + '</p>';
  const top = (title, back) => '<div class="xn-top">' + (back ? '<button class="xn-back" data-act="back" aria-label="Kembali">' + ic('back', 20) + '</button>' : '') + '<b>' + title + '</b></div>';
  const tabs = (items, cur) => '<div class="xn-tabs">' + items.map(([k, l]) => '<button class="xn-tab' + (k === cur ? ' active' : '') + '" data-act="tab" data-tab="' + k + '">' + l + '</button>').join('') + '</div>';

  /* ---------- components ---------- */
  function actBtn(a, icon, n, on) {
    return '<button class="xn-act ' + a + (on ? ' on' : '') + '" data-act="' + a + '">' + ic(icon, 17) + '<span>' + (n > 0 ? fmt(n) : '') + '</span></button>';
  }

  function postCard(p, opts) {
    opts = opts || {};
    const mine = p.author_id === XN.uid;
    const ribbon = p.reposter_id
      ? '<div class="xn-ribbon">' + ic('repeat', 14) + ' ' + (p.reposter_id === XN.uid ? 'Kamu' : esc(p.reposter_name || p.reposter_handle)) + ' me-repost</div>' : '';
    const replyTo = p.parent_id && !opts.big ? '<div class="xn-ribbon">' + ic('comment', 14) + ' Balasan</div>' : '';
    return '<article class="xn-post' + (opts.big ? ' big' : '') + '" data-id="' + p.id + '"' + (opts.big ? '' : ' data-act="open"') + '>' + ribbon + replyTo +
      '<div class="xn-row"><a href="#" data-act="profile" data-handle="' + esc(p.handle) + '">' + avatar(p.handle, p.display_name) + '</a>' +
      '<div class="xn-body"><div class="xn-head"><a href="#" class="xn-name" data-act="profile" data-handle="' + esc(p.handle) + '">' + esc(p.display_name || p.handle) + '</a>' +
      '<span class="xn-handle">@' + esc(p.handle) + '</span><span class="xn-dot">·</span><time>' + ago(p.created_at) + '</time></div>' +
      '<div class="xn-text">' + rich(p.body) + '</div>' +
      '<div class="xn-acts">' + (XN.uid ? actBtn('reply', 'comment', p.reply_count, false) + actBtn('repost', 'repeat', p.repost_count, p.reposted) + actBtn('like', 'heart', p.like_count, p.liked) : '') +
      '<button class="xn-act share" data-act="copypost" data-pid="' + p.id + '" aria-label="Salin link postingan" title="Salin link postingan">' + ic('copy', 17) + '</button>' +
      '<button class="xn-act share" data-act="sharepost" data-pid="' + p.id + '" aria-label="Bagikan postingan" title="Bagikan postingan">' + ic('share', 17) + '</button>' +
      (mine ? '<button class="xn-act del" data-act="del" aria-label="Hapus">' + ic('trash', 17) + '</button>' : '') +
      '</div></div></div></article>';
  }

  function composer(placeholder, label, parent) {
    return '<form class="xn-compose" data-parent="' + (parent || '') + '">' + avatar(xProfile && xProfile.handle, xProfile && xProfile.display_name) +
      '<div class="xn-cbody"><textarea maxlength="500" rows="2" placeholder="' + placeholder + '"></textarea><div class="xn-mention-suggest" hidden></div>' +
      '<div class="xn-cfoot"><small class="xn-count">500</small><button class="button" type="submit" disabled>' + label + '</button></div></div></form>';
  }

  function followBtn(uid) {
    const on = XN.following.has(uid);
    return '<button class="button xn-follow' + (on ? ' on' : '') + '" data-act="follow" data-uid="' + uid + '">' + (on ? 'Mengikuti' : 'Ikuti') + '</button>';
  }

  function trendList(rows) {
    if (!rows || !rows.length) return empty('Belum ada tren. Coba tulis #hashtag atau $ticker di postinganmu.');
    return rows.map((r) => '<button class="xn-trend" data-act="tag" data-q="' + esc(r.tag) + '"><small>Sedang tren</small><b>' + esc(r.tag) + '</b><small>' + r.posts + ' postingan</small></button>').join('');
  }

  function whoList(rows) {
    if (!rows || !rows.length) return empty('Belum ada akun lain.');
    return rows.map((p) => '<div class="xn-who"><a href="#" data-act="profile" data-handle="' + esc(p.handle) + '">' + avatar(p.handle, p.display_name) + '</a>' +
      '<a href="#" class="xn-whoname" data-act="profile" data-handle="' + esc(p.handle) + '"><b>' + esc(p.display_name || p.handle) + '</b><small>@' + esc(p.handle) + '</small></a>' + followBtn(p.user_id) + '</div>').join('');
  }

  const searchForm = (q) => '<form class="xn-search">' + ic('search', 18) + '<input type="search" placeholder="Cari post, akun, #tag atau $ticker" value="' + esc(q || '') + '" maxlength="60"></form>';

  /* ---------- feed ---------- */
  async function feedQuery(o) {
    const lim = 25, b = o.before;
    let q1, q2 = null;
    if (o.mode === 'replies') {
      q1 = xClient.from('x_post_view').select('*').eq('author_id', o.uid).not('parent_id', 'is', null).order('created_at', { ascending: false }).limit(lim);
      if (b) q1 = q1.lt('created_at', b);
    } else {
      q1 = xClient.from('x_post_view').select('*').is('parent_id', null).order('created_at', { ascending: false }).limit(lim);
      q2 = xClient.from('x_repost_view').select('*').is('parent_id', null).order('event_at', { ascending: false }).limit(lim);
      if (o.mode === 'following') { const ids = [...XN.following, XN.uid]; q1 = q1.in('author_id', ids); q2 = q2.in('reposter_id', ids); }
      if (o.mode === 'profile') { q1 = q1.eq('author_id', o.uid); q2 = q2.eq('reposter_id', o.uid); }
      if (b) { q1 = q1.lt('created_at', b); q2 = q2.lt('event_at', b); }
    }
    const [r1, r2] = await Promise.all([q1, q2 || Promise.resolve({ data: [] })]);
    const error = r1.error || r2.error;
    if (error) return { error };
    const all = [...(r1.data || []).map((p) => ({ ...p, event_at: p.created_at })), ...(r2.data || [])]
      .sort((a, c) => new Date(c.event_at) - new Date(a.event_at));
    const seen = new Set(), items = [];
    for (const p of all) { if (seen.has(p.id)) continue; seen.add(p.id); items.push(p); }
    const page = items.slice(0, lim);
    return { items: page, cursor: all.length >= lim && page.length ? page[page.length - 1].event_at : null };
  }

  async function fillFeed(o, append, tok) {
    const list = $('xn-list');
    if (!list) return;
    const res = await feedQuery(o);
    if (tok !== XN.tok || !$('xn-list')) return;
    if (res.error) { list.innerHTML = empty('Gagal memuat: ' + esc(res.error.message)); return; }
    const fresh = res.items.filter((p) => !append || !list.querySelector('[data-id="' + p.id + '"]'));
    const html = fresh.map((p) => postCard(p)).join('');
    if (append) list.insertAdjacentHTML('beforeend', html);
    else list.innerHTML = html || empty(o.mode === 'following' ? 'Belum ada postingan dari akun yang kamu ikuti. Ikuti beberapa akun dulu!' : o.mode === 'replies' ? 'Belum ada balasan.' : 'Belum ada postingan. Jadilah yang pertama!');
    XN.cursor = res.cursor; XN.feedOpts = o;
    const more = $('xn-more');
    if (more) more.innerHTML = res.cursor ? '<button class="xn-morebtn" data-act="more">Muat lagi</button>' : '';
  }

  /* ---------- views ---------- */
  async function vHome() {
    const tok = ++XN.tok;
    XN.newPosts = 0;
    if (!XN.uid) {
      main().innerHTML = top('X Network') +
        '<div class="xn-signin"><span>Masuk untuk membuat postingan, mengikuti player, dan berinteraksi.</span><button class="button secondary" data-act="signin">Masuk</button></div>' +
        '<div id="xn-list" class="xn-list">' + skel + '</div><div id="xn-more"></div>';
      await fillFeed({ mode: 'foryou' }, false, tok);
      return;
    }
    main().innerHTML = top('Beranda') + tabs([['foryou', 'Untuk kamu'], ['following', 'Mengikuti']], XN.feedTab) +
      composer('Apa yang sedang terjadi?', 'Posting') + '<div id="xn-newpill"></div><div id="xn-list" class="xn-list">' + skel + '</div><div id="xn-more"></div>';
    await fillFeed({ mode: XN.feedTab }, false, tok);
  }

  async function vThread() {
    const tok = ++XN.tok;
    const id = XN.params.id;
    main().innerHTML = top('Postingan', true) + '<div id="xn-thread">' + skel + '</div>';
    const { data: p } = await xClient.from('x_post_view').select('*').eq('id', id).maybeSingle();
    if (tok !== XN.tok) return;
    if (!p) { $('xn-thread').innerHTML = empty('Postingan tidak ditemukan atau sudah dihapus.'); return; }
    const { data: replies } = await xClient.from('x_post_view').select('*').eq('parent_id', id).order('created_at', { ascending: true }).limit(100);
    if (tok !== XN.tok) return;
    $('xn-thread').innerHTML = (p.parent_id ? '<a href="#" class="xn-replying" data-act="openpid" data-pid="' + p.parent_id + '">← Lihat postingan asli</a>' : '') +
      postCard(p, { big: true }) + (XN.uid ? composer('Balas postingan ini', 'Balas', p.id) : '<div class="xn-signin"><span>Masuk ke MEMEVERSE untuk membalas postingan.</span><button class="button secondary" data-act="signin">Masuk</button></div>') +
      '<div class="xn-list">' + ((replies || []).map((r) => postCard(r)).join('') || empty('Belum ada balasan.')) + '</div>';
    if (XN.params.focus) { const ta = main().querySelector('textarea'); if (ta) ta.focus(); }
  }

  async function vProfile() {
    const tok = ++XN.tok;
    const h = (XN.params.handle || '').toLowerCase();
    main().innerHTML = top('Profil', true) + skel;
    const { data: pr } = await xClient.from('x_profile_view').select('*').eq('handle', h).maybeSingle();
    if (tok !== XN.tok) return;
    if (!pr) { main().innerHTML = top('Profil', true) + empty('Akun @' + esc(h) + ' tidak ditemukan.'); return; }
    const me = pr.user_id === XN.uid;
    main().innerHTML = top(esc(pr.display_name || pr.handle), true) +
      '<div class="xn-phead"><div class="xn-prow">' + avatar(pr.handle, pr.display_name, 76) +
      '<div class="xn-pbtns"><button class="button secondary xn-iconbtn" data-act="copyprofile" data-handle="' + esc(pr.handle) + '" aria-label="Salin link profil" title="Salin link profil">' + ic('copy', 17) + '</button><button class="button secondary xn-iconbtn" data-act="shareprofile" data-handle="' + esc(pr.handle) + '" aria-label="Bagikan profil" title="Bagikan profil">' + ic('share', 17) + '</button>' + (me ? '<button class="button secondary" data-act="editprofile">Edit profil</button>' :
        (XN.uid ? '<button class="button secondary xn-iconbtn" data-act="chat" data-uid="' + pr.user_id + '" aria-label="Kirim pesan">' + ic('mail', 18) + '</button>' + followBtn(pr.user_id) : '<button class="button secondary" data-act="signin">Masuk untuk berinteraksi</button>')) + '</div></div>' +
      '<h2>' + esc(pr.display_name || pr.handle) + '</h2><div class="xn-handle">@' + esc(pr.handle) + '</div>' +
      (pr.bio ? '<p class="xn-bio">' + rich(pr.bio) + '</p>' : '') +
      '<div class="xn-counts"><span><b data-fc="' + pr.user_id + '">' + pr.followers_count + '</b> Pengikut</span><span><b>' + pr.following_count + '</b> Mengikuti</span><span><b>' + pr.posts_count + '</b> Postingan</span></div>' +
      (me ? '<form class="xn-edit" id="xn-edit" hidden><label>Nama tampilan</label><input class="input" name="n" maxlength="40" value="' + esc(pr.display_name) + '"><label>Bio</label><textarea class="input" name="b" maxlength="160" rows="3">' + esc(pr.bio) + '</textarea><button class="button" type="submit">Simpan</button></form>' : '') +
      '</div>' + tabs([['profile', 'Postingan'], ['replies', 'Balasan']], XN.profileTab) + '<div id="xn-list" class="xn-list">' + skel + '</div><div id="xn-more"></div>';
    await fillFeed({ mode: XN.profileTab, uid: pr.user_id }, false, tok);
  }

  async function vExplore() {
    const tok = ++XN.tok;
    const q = (XN.params.q || '').trim();
    main().innerHTML = top('Jelajahi') + searchForm(q) + '<div id="xn-ex">' + skel + '</div>';
    const ex = $('xn-ex');
    if (!q) {
      const [tr, wf] = await Promise.all([
        xClient.from('x_trending').select('*').limit(10),
        xClient.from('x_profiles').select('user_id,handle,display_name').neq('user_id', XN.uid).order('created_at', { ascending: false }).limit(8)
      ]);
      if (tok !== XN.tok) return;
      $('xn-ex').innerHTML = '<h3 class="xn-h3">Sedang tren</h3>' + trendList(tr.data) + '<h3 class="xn-h3">Akun untuk diikuti</h3>' + whoList((wf.data || []).filter((p) => !XN.following.has(p.user_id)));
      return;
    }
    const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    const sq = q.replace(/^@/, '').replace(/[,()"\\%_*]/g, '').trim();
    const [pp, po] = await Promise.all([
      sq && !/^[#$]/.test(q)
        ? xClient.from('x_profile_view').select('user_id,handle,display_name').or('handle.ilike.*' + sq + '*,display_name.ilike.*' + sq + '*').limit(5)
        : Promise.resolve({ data: [] }),
      xClient.from('x_post_view').select('*').ilike('body', like).order('created_at', { ascending: false }).limit(30)
    ]);
    if (tok !== XN.tok) return;
    ex.innerHTML = ((pp.data || []).length ? '<h3 class="xn-h3">Akun</h3>' + whoList(pp.data) : '') +
      '<h3 class="xn-h3">Postingan</h3><div class="xn-list">' + ((po.data || []).map((p) => postCard(p)).join('') || empty('Tidak ada postingan untuk "' + esc(q) + '".')) + '</div>';
  }

  const NOTIF_TXT = { like: 'menyukai postinganmu', repost: 'me-repost postinganmu', reply: 'membalas postinganmu', follow: 'mulai mengikuti kamu', mention: 'menyebut kamu dalam postingan' };
  const NOTIF_IC = { like: 'heart', repost: 'repeat', reply: 'comment', follow: 'user', mention: 'at' };

  async function vNotif() {
    const tok = ++XN.tok;
    main().innerHTML = top('Notifikasi') + '<div id="xn-nl">' + skel + '</div>';
    const { data, error } = await xClient.from('x_notifications').select('id,type,post_id,read,created_at,actor:x_profiles!actor_id(handle,display_name)').order('created_at', { ascending: false }).limit(60);
    if (tok !== XN.tok) return;
    if (error) { $('xn-nl').innerHTML = empty('Gagal memuat: ' + esc(error.message)); return; }
    $('xn-nl').innerHTML = (data || []).map((n) => {
      const a = n.actor || {};
      const attrs = n.type === 'follow' ? 'data-act="profile" data-handle="' + esc(a.handle) + '"' : 'data-act="openpid" data-pid="' + n.post_id + '"';
      return '<div class="xn-notif ' + n.type + (n.read ? '' : ' unread') + '" ' + attrs + '><span class="xn-nic">' + ic(NOTIF_IC[n.type], 20) + '</span>' +
        '<div>' + avatar(a.handle, a.display_name, 32) + '<p><b>' + esc(a.display_name || a.handle || 'Seseorang') + '</b> ' + NOTIF_TXT[n.type] + ' <small>' + ago(n.created_at) + '</small></p></div></div>';
    }).join('') || empty('Belum ada notifikasi.');
    if ((data || []).some((n) => !n.read)) {
      await xClient.from('x_notifications').update({ read: true }).eq('read', false);
      XN.notif = 0; updateBadges();
    }
  }

  async function vDM() {
    const tok = ++XN.tok;
    main().innerHTML = top('Pesan') + '<form class="xn-newchat"><input class="input" placeholder="Kirim pesan ke @username" maxlength="21"><button class="button" type="submit">Mulai</button></form><div id="xn-convs">' + skel + '</div>';
    const me = XN.uid;
    const { data, error } = await xClient.from('x_messages').select('id,sender_id,recipient_id,body,created_at,read_at,sender:x_profiles!sender_id(handle,display_name),recipient:x_profiles!recipient_id(handle,display_name)').order('created_at', { ascending: false }).limit(300);
    if (tok !== XN.tok) return;
    if (error) { $('xn-convs').innerHTML = empty('Gagal memuat: ' + esc(error.message)); return; }
    const map = new Map();
    for (const m of data || []) {
      const other = m.sender_id === me ? m.recipient_id : m.sender_id;
      if (!map.has(other)) map.set(other, { uid: other, prof: m.sender_id === me ? m.recipient : m.sender, last: m, unread: 0 });
      if (m.recipient_id === me && !m.read_at) map.get(other).unread++;
    }
    $('xn-convs').innerHTML = [...map.values()].map((c) => {
      const p = c.prof || {};
      return '<div class="xn-conv' + (c.unread ? ' unread' : '') + '" data-act="chat" data-uid="' + c.uid + '">' + avatar(p.handle, p.display_name, 44) +
        '<div class="xn-cmeta"><div class="xn-head"><b>' + esc(p.display_name || p.handle) + '</b><span class="xn-handle">@' + esc(p.handle) + '</span><span class="xn-dot">·</span><time>' + ago(c.last.created_at) + '</time></div>' +
        '<p>' + (c.last.sender_id === me ? 'Kamu: ' : '') + esc(c.last.body.slice(0, 80)) + '</p></div>' + (c.unread ? '<em class="xn-badge">' + c.unread + '</em>' : '') + '</div>';
    }).join('') || empty('Belum ada pesan. Mulai obrolan dengan @username di atas.');
  }

  const bubble = (m) => '<div class="xn-msg' + (m.sender_id === XN.uid ? ' me' : '') + '"><span>' + esc(m.body) + '</span><small>' + ago(m.created_at) + '</small></div>';
  const scrollChat = () => { const c = $('xn-chat'); if (c) c.scrollTop = c.scrollHeight; window.scrollTo(0, document.body.scrollHeight); };

  async function vChat() {
    const tok = ++XN.tok;
    const uid = XN.params.uid, me = XN.uid;
    main().innerHTML = top('Pesan', true) + skel;
    const { data: o } = await xClient.from('x_profiles').select('user_id,handle,display_name').eq('user_id', uid).maybeSingle();
    if (tok !== XN.tok) return;
    if (!o) { main().innerHTML = top('Pesan', true) + empty('Akun tidak ditemukan.'); return; }
    const { data: msgs } = await xClient.from('x_messages').select('id,sender_id,body,created_at')
      .or('and(sender_id.eq.' + me + ',recipient_id.eq.' + uid + '),and(sender_id.eq.' + uid + ',recipient_id.eq.' + me + ')')
      .order('created_at', { ascending: true }).limit(200);
    if (tok !== XN.tok) return;
    main().innerHTML = top(esc(o.display_name || o.handle) + ' <span class="xn-handle">@' + esc(o.handle) + '</span>', true) +
      '<div class="xn-chat" id="xn-chat">' + ((msgs || []).map(bubble).join('') || empty('Belum ada pesan. Sapa dulu!')) + '</div>' +
      '<form class="xn-send" data-to="' + uid + '"><input maxlength="1000" placeholder="Tulis pesan" autocomplete="off"><button class="button" type="submit" aria-label="Kirim">' + ic('send', 16) + '</button></form>';
    scrollChat();
    await xClient.from('x_messages').update({ read_at: new Date().toISOString() }).eq('recipient_id', me).eq('sender_id', uid).is('read_at', null);
    refreshCounts();
  }

  /* ---------- shell / routing ---------- */
  function navActive() {
    if (XN.view === 'home' || XN.view === 'thread') return 'home';
    if (XN.view === 'explore') return 'explore';
    if (XN.view === 'notif') return 'notif';
    if (XN.view === 'dm' || XN.view === 'chat') return 'dm';
    if (XN.view === 'profile' && xProfile && (XN.params.handle || '').toLowerCase() === xProfile.handle) return 'me';
    return '';
  }

  function navHTML() {
    const items = [['home', 'home', 'Beranda'], ['explore', 'search', 'Jelajahi'], ['notif', 'bell', 'Notifikasi'], ['dm', 'mail', 'Pesan'], ['me', 'user', 'Profil']];
    const act = navActive();
    return '<div class="xn-logo-s">' + '<span class="brand-mark">M</span></div>' + items.map(([v, i, l]) =>
      '<button class="xn-navbtn' + (v === act ? ' active' : '') + '" data-act="nav" data-view="' + v + '">' + ic(i, 22) + '<span>' + l + '</span>' +
      (v === 'notif' || v === 'dm' ? '<em class="xn-badge" id="xn-b-' + v + '" hidden></em>' : '') + '</button>').join('');
  }

  function updateBadges() {
    [['notif', XN.notif], ['dm', XN.dm]].forEach(([k, n]) => {
      const el = $('xn-b-' + k);
      if (el) { el.hidden = !n; el.textContent = n > 99 ? '99+' : n; }
    });
  }

  async function refreshCounts() {
    if (!XN.uid) return;
    const [a, b] = await Promise.all([
      xClient.from('x_notifications').select('id', { count: 'exact', head: true }).eq('read', false),
      xClient.from('x_messages').select('id', { count: 'exact', head: true }).eq('recipient_id', XN.uid).is('read_at', null)
    ]);
    XN.notif = a.count || 0; XN.dm = b.count || 0; updateBadges();
  }

  function render() {
    if (!main()) return;
    const root = $('xn-root');
    root.classList.toggle('chatmode', XN.view === 'chat');
    const nav = $('xn-nav'); if (nav) nav.innerHTML = navHTML(); updateBadges();
    const views = { home: vHome, explore: vExplore, notif: vNotif, dm: vDM, chat: vChat, thread: vThread, profile: vProfile };
    Promise.resolve((views[XN.view] || vHome)()).catch((e) => { console.error(e); toast('Terjadi kesalahan: ' + (e.message || e)); });
  }

  function xnGo(view, params, opts) {
    opts = opts || {};
    if (opts.reset) XN.stack = [];
    else if (!opts.replace) XN.stack.push({ view: XN.view, params: XN.params, feedTab: XN.feedTab, profileTab: XN.profileTab });
    XN.view = view; XN.params = params || {};
    syncRouteUrl(view, XN.params, !!opts.replace);
    render(); window.scrollTo(0, 0);
  }

  function xnBack() {
    const prev = XN.stack.pop();
    if (prev) { XN.view = prev.view; XN.params = prev.params; XN.feedTab = prev.feedTab; XN.profileTab = prev.profileTab; syncRouteUrl(XN.view, XN.params, true); render(); }
    else xnGo('home', {}, { reset: true });
  }

  async function loadSide() {
    const side = $('xn-side');
    if (!side) return;
    side.innerHTML = searchForm('') + '<div class="xn-box"><h3>Sedang tren</h3><div id="xn-s-tr"></div></div><div class="xn-box"><h3>Akun untuk diikuti</h3><div id="xn-s-wf"></div></div>';
    const [tr, wf] = await Promise.all([
      xClient.from('x_trending').select('*').limit(5),
      xClient.from('x_profiles').select('user_id,handle,display_name').neq('user_id', XN.uid).order('created_at', { ascending: false }).limit(20)
    ]);
    if ($('xn-s-tr')) $('xn-s-tr').innerHTML = trendList(tr.data);
    if ($('xn-s-wf')) $('xn-s-wf').innerHTML = whoList((wf.data || []).filter((p) => !XN.following.has(p.user_id)).slice(0, 4));
  }

  /* ---------- realtime ---------- */
  function subscribe() {
    if (XN.chan) return;
    const uid = XN.uid;
    XN.chan = xClient.channel('xn-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'x_notifications', filter: 'user_id=eq.' + uid }, () => {
        XN.notif++; updateBadges();
        if (XN.view === 'notif' && main()) vNotif();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'x_messages', filter: 'recipient_id=eq.' + uid }, (pl) => {
        const m = pl.new;
        if (XN.view === 'chat' && XN.params.uid === m.sender_id && $('xn-chat')) {
          $('xn-chat').insertAdjacentHTML('beforeend', bubble(m)); scrollChat();
          xClient.from('x_messages').update({ read_at: new Date().toISOString() }).eq('id', m.id).then(() => {});
        } else {
          XN.dm++; updateBadges();
          if (XN.view === 'dm' && main()) vDM();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'x_posts' }, (pl) => {
        const p = pl.new;
        if (p.author_id === XN.uid || p.parent_id || XN.view !== 'home' || !$('xn-newpill')) return;
        XN.newPosts++;
        $('xn-newpill').innerHTML = '<button class="xn-pill" data-act="newposts">' + ic('plus', 14) + ' ' + XN.newPosts + ' postingan baru</button>';
      })
      .subscribe();
  }

  function teardown() {
    if (XN.chan) { try { xClient.removeChannel(XN.chan); } catch (e) { /* ignore */ } XN.chan = null; }
    XN.uid = null; XN.following = new Set(); XN.stack = []; XN.view = 'home'; XN.params = {};
    XN.feedTab = 'foryou'; XN.profileTab = 'profile'; XN.notif = 0; XN.dm = 0; XN.newPosts = 0;
  }

  async function mount() {
    if (!xClient || !$('xn-root')) return;
    const root = $('xn-root');
    if (xUser) {
      if (XN.uid && XN.uid !== xUser.id) teardown();
      XN.uid = xUser.id;
      if (!xProfile) {
        const { data } = await xClient.from('x_profiles').select('*').eq('user_id', XN.uid).maybeSingle();
        xProfile = data;
      }
      root.innerHTML = '<nav class="xn-nav" id="xn-nav"></nav><section class="xn-main" id="xn-main"></section><aside class="xn-side" id="xn-side"></aside>';
      const { data: f } = await xClient.from('x_follows').select('following_id').eq('follower_id', XN.uid);
      XN.following = new Set((f || []).map((r) => r.following_id));
      render(); loadSide(); refreshCounts(); subscribe();
    } else {
      XN.uid = null; XN.following = new Set();
      root.innerHTML = '<section class="xn-main xn-public" id="xn-main"></section>';
      render();
    }
  }

  /* ---------- actions ---------- */
  async function toggleReaction(btn, table) {
    const card = btn.closest('.xn-post'); if (!card) return;
    const id = +card.dataset.id, on = btn.classList.contains('on'), span = btn.querySelector('span');
    const n = parseInt(span.textContent, 10) || 0;
    btn.classList.toggle('on', !on); span.textContent = (on ? Math.max(n - 1, 0) : n + 1) || '';
    const r = on
      ? await xClient.from(table).delete().eq('user_id', XN.uid).eq('post_id', id)
      : await xClient.from(table).insert({ user_id: XN.uid, post_id: id });
    if (r.error) { btn.classList.toggle('on', on); span.textContent = n || ''; toast('Gagal: ' + r.error.message); }
  }

  async function toggleFollow(btn) {
    const uid = btn.dataset.uid, on = XN.following.has(uid);
    btn.disabled = true;
    const r = on
      ? await xClient.from('x_follows').delete().eq('follower_id', XN.uid).eq('following_id', uid)
      : await xClient.from('x_follows').insert({ follower_id: XN.uid, following_id: uid });
    btn.disabled = false;
    if (r.error) { toast('Gagal: ' + r.error.message); return; }
    if (on) XN.following.delete(uid); else XN.following.add(uid);
    document.querySelectorAll('.xn-follow[data-uid="' + uid + '"]').forEach((b) => { b.classList.toggle('on', !on); b.textContent = !on ? 'Mengikuti' : 'Ikuti'; });
    const fc = document.querySelector('[data-fc="' + uid + '"]');
    if (fc) fc.textContent = Math.max((parseInt(fc.textContent, 10) || 0) + (on ? -1 : 1), 0);
  }

  async function deletePost(card) {
    if (!confirm('Hapus postingan ini?')) return;
    const { error } = await xClient.from('x_posts').delete().eq('id', +card.dataset.id).eq('author_id', XN.uid);
    if (error) { toast('Gagal menghapus: ' + error.message); return; }
    if (card.classList.contains('big')) xnBack(); else card.remove();
  }

  content.addEventListener('click', async (e) => {
    if (!e.target.closest('.xn')) return;
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (el.tagName === 'A') e.preventDefault();
    const card = el.closest('.xn-post');
    try {
      switch (act) {
        case 'nav': {
          const v = el.dataset.view;
          if (v === 'me') xnGo('profile', { handle: xProfile.handle }, { reset: true });
          else xnGo(v, {}, { reset: true });
          break;
        }
        case 'back': xnBack(); break;
        case 'open': if (card) xnGo('thread', { id: +card.dataset.id }); break;
        case 'openpid': xnGo('thread', { id: +el.dataset.pid }); break;
        case 'reply': if (card) xnGo('thread', { id: +card.dataset.id, focus: true }); break;
        case 'like': await toggleReaction(el, 'x_likes'); break;
        case 'repost': await toggleReaction(el, 'x_reposts'); break;
        case 'del': await deletePost(card); break;
        case 'profile': xnGo('profile', { handle: el.dataset.handle }); break;
        case 'tag': xnGo('explore', { q: el.dataset.q }); break;
        case 'copyprofile': await copyLink(shareUrl('profile', el.dataset.handle)); break;
        case 'shareprofile': await shareContent(shareUrl('profile', el.dataset.handle), 'MEMEVERSE profile', 'Lihat profil @' + el.dataset.handle + ' di MEMEVERSE.'); break;
        case 'copypost': await copyLink(shareUrl('post', el.dataset.pid)); break;
        case 'sharepost': await shareContent(shareUrl('post', el.dataset.pid), 'MEMEVERSE post', 'Lihat postingan ini di MEMEVERSE.'); break;
        case 'signin': {
          const u = new URL(window.location.href); ['x', 'u', 'id'].forEach((k) => u.searchParams.delete(k));
          window.history.pushState({}, '', u); go('x'); break;
        }
        case 'insertmention': {
          const form = el.closest('.xn-compose'), ta = form && form.querySelector('textarea');
          if (!form || !ta) break;
          const start = Number(form.dataset.mentionStart || Math.max(0, ta.selectionStart - 1));
          const end = ta.selectionStart;
          ta.value = ta.value.slice(0, start) + '@' + el.dataset.handle + ' ' + ta.value.slice(end);
          const pos = start + el.dataset.handle.length + 2; ta.focus(); ta.setSelectionRange(pos, pos);
          form.querySelector('.xn-mention-suggest').hidden = true;
          form.querySelector('.xn-count').textContent = 500 - ta.value.length;
          form.querySelector('button[type="submit"]').disabled = !ta.value.trim();
          break;
        }
        case 'follow': await toggleFollow(el); break;
        case 'chat': xnGo('chat', { uid: el.dataset.uid }); break;
        case 'more': el.disabled = true; await fillFeed({ ...XN.feedOpts, before: XN.cursor }, true, XN.tok); break;
        case 'newposts': vHome(); break;
        case 'editprofile': { const f = $('xn-edit'); if (f) f.hidden = !f.hidden; break; }
        case 'tab':
          if (XN.view === 'home') { XN.feedTab = el.dataset.tab; vHome(); }
          else if (XN.view === 'profile') { XN.profileTab = el.dataset.tab; vProfile(); }
          break;
        default: break;
      }
    } catch (err) { console.error(err); toast('Terjadi kesalahan: ' + (err.message || err)); }
  });

  let mentionLookupToken = 0, mentionLookupTimer = null;
  async function suggestMentions(ta) {
    const form = ta.closest('.xn-compose'), box = form && form.querySelector('.xn-mention-suggest');
    if (!form || !box || !XN.uid) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const match = before.match(/(?:^|\s)@([A-Za-z0-9_]{1,20})$/);
    if (!match) { box.hidden = true; return; }
    const prefix = match[1].toLowerCase();
    form.dataset.mentionStart = String(before.length - prefix.length - 1);
    const token = ++mentionLookupToken;
    clearTimeout(mentionLookupTimer);
    mentionLookupTimer = setTimeout(async () => {
      const { data, error } = await xClient.from('x_profiles').select('user_id,handle,display_name').ilike('handle', prefix + '%').neq('user_id', XN.uid).order('handle').limit(6);
      if (token !== mentionLookupToken || !box.isConnected) return;
      if (error || !data || !data.length) { box.hidden = true; return; }
      box.innerHTML = data.map((p) => '<button type="button" class="xn-mention-option" data-act="insertmention" data-handle="' + esc(p.handle) + '">' + avatar(p.handle, p.display_name, 28) + '<span><b>' + esc(p.display_name || p.handle) + '</b><small>@' + esc(p.handle) + '</small></span></button>').join('');
      box.hidden = false;
    }, 140);
  }

  content.addEventListener('input', (e) => {
    const ta = e.target;
    if (ta.tagName !== 'TEXTAREA' || !ta.closest('.xn-compose')) return;
    const f = ta.closest('.xn-compose');
    f.querySelector('.xn-count').textContent = 500 - ta.value.length;
    f.querySelector('button[type="submit"]').disabled = !ta.value.trim();
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
    suggestMentions(ta);
  });

  content.addEventListener('click', (e) => {
    if (e.target.closest('.xn-mention-option')) e.preventDefault();
  });

  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.closest('.xn-compose')) {
      e.preventDefault(); const f = e.target.closest('.xn-compose'); if (f.requestSubmit) f.requestSubmit();
    }
  });

  content.addEventListener('submit', async (e) => {
    const f = e.target;
    try {
      if (f.classList.contains('xn-compose')) {
        e.preventDefault();
        const ta = f.querySelector('textarea'), btn = f.querySelector('button'), body = ta.value.trim();
        if (!body) return;
        btn.disabled = true;
        const { data: createdPost, error } = await xClient.from('x_posts').insert({ author_id: XN.uid, body, parent_id: f.dataset.parent ? +f.dataset.parent : null }).select('id').single();
        if (error) { toast('Posting gagal: ' + error.message); btn.disabled = false; return; }
        const handles = [...new Set(Array.from(body.matchAll(/(?:^|\s)@([A-Za-z0-9_]{3,20})/g), (m) => m[1].toLowerCase()))];
        if (handles.length) {
          const { data: mentioned, error: lookupError } = await xClient.from('x_profiles').select('user_id,handle').in('handle', handles);
          if (!lookupError && mentioned && mentioned.length) {
            const rows = mentioned.map((p) => ({ post_id: createdPost.id, mentioned_user_id: p.user_id, mentioned_by_user_id: XN.uid }));
            const { error: mentionError } = await xClient.from('x_mentions').insert(rows);
            if (mentionError) toast('Posting terkirim, tetapi mention gagal disimpan: ' + mentionError.message);
          } else if (lookupError) toast('Posting terkirim, tetapi akun mention gagal diverifikasi.');
        }
        if (XN.view === 'thread') vThread(); else vHome();
      } else if (f.classList.contains('xn-search')) {
        e.preventDefault();
        xnGo('explore', { q: f.querySelector('input').value }, { replace: XN.view === 'explore' });
      } else if (f.classList.contains('xn-newchat')) {
        e.preventDefault();
        const h = f.querySelector('input').value.trim().replace(/^@/, '').toLowerCase();
        if (!h) return;
        const { data } = await xClient.from('x_profiles').select('user_id').eq('handle', h).maybeSingle();
        if (!data) toast('Akun @' + h + ' tidak ditemukan');
        else if (data.user_id === XN.uid) toast('Tidak bisa kirim pesan ke diri sendiri');
        else xnGo('chat', { uid: data.user_id });
      } else if (f.classList.contains('xn-send')) {
        e.preventDefault();
        const inp = f.querySelector('input'), body = inp.value.trim();
        if (!body) return;
        inp.value = '';
        const { data, error } = await xClient.from('x_messages').insert({ sender_id: XN.uid, recipient_id: f.dataset.to, body }).select('id,sender_id,body,created_at').single();
        if (error) { toast('Pesan gagal dikirim: ' + error.message); inp.value = body; return; }
        const c = $('xn-chat');
        if (c) { const e0 = c.querySelector('.xn-empty'); if (e0) e0.remove(); c.insertAdjacentHTML('beforeend', bubble(data)); scrollChat(); }
      } else if (f.classList.contains('xn-edit')) {
        e.preventDefault();
        const display_name = f.elements.n.value.trim(), bio = f.elements.b.value.trim();
        const { error } = await xClient.from('x_profiles').update({ display_name, bio }).eq('user_id', XN.uid);
        if (error) { toast('Gagal menyimpan: ' + error.message); return; }
        xProfile = { ...xProfile, display_name, bio };
        toast('Profil disimpan'); vProfile();
      }
    } catch (err) { console.error(err); toast('Terjadi kesalahan: ' + (err.message || err)); }
  });

  /* ---------- hook into app.js ---------- */
  window.xNetworkPage = function () {
    if (!xClient) return legacyPage();
    const route = readSharedRoute();
    if (!xUser && !route) { teardown(); return legacyPage(); }
    if (route) { XN.view = route.view; XN.params = route.params; XN.stack = []; }
    return '<div id="xn-root" class="xn"></div>';
  };
  window.xLoadPosts = function () { mount(); };
  // Session may already have been restored before this script ran.
  window.addEventListener('popstate', () => {
    if (document.querySelector('.nav-item.active')?.dataset.page !== 'x' || !$('xn-root')) return;
    const route = readSharedRoute(); XN.stack = [];
    XN.view = route ? route.view : 'home'; XN.params = route ? route.params : {};
    render();
  });
  const initialSharedRoute = readSharedRoute();
  if (initialSharedRoute) {
    XN.view = initialSharedRoute.view; XN.params = initialSharedRoute.params;
    go('x');
    if (!xUser) queueMicrotask(mount);
  } else if (xUser && document.querySelector('.nav-item.active') && document.querySelector('.nav-item.active').dataset.page === 'x') go('x');
})();
