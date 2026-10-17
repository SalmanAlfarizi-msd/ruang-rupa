import { furniture } from './art.mjs';
import { materials, finishes, options } from './catalog.mjs';

const main = document.querySelector('#admin-main');
const logout = document.querySelector('#logout');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = value => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
let csrfToken = '';
let statuses = [];
let renderVersion = 0;
let saving = false;
let dirty = false;
let activeUrl = location.href;

async function api(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`/api/admin/${path}`, { method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) {
      const error = Object.assign(new Error(result.error || 'Server belum mengonfirmasi perubahan.'), { status: response.status });
      if (response.status === 401 && path !== 'login') { csrfToken = ''; logout.hidden = true; login(true); }
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Server belum merespons. Isian tetap tersedia; coba lagi.');
    if (error instanceof TypeError) throw new Error('Tidak dapat terhubung ke server. Isian tetap tersedia; coba lagi.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function feedback(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle('error', error);
  element.setAttribute('role', error ? 'alert' : 'status');
}

function login(configured, message = '') {
  renderVersion += 1;
  dirty = false;
  main.innerHTML = `<section class="login-card"><div class="login-icon" aria-hidden="true">⌑</div><p class="eyebrow">RUANG KERJA STUDIO</p><h1>Selamat datang.</h1><p>Masuk untuk meninjau permintaan dan mencatat tindak lanjut pelanggan.</p>${configured ? `<form id="login-form"><label class="field">Password admin<div class="password-control"><input type="password" name="password" aria-label="Password admin" autocomplete="current-password" minlength="16" maxlength="200" required><button type="button" class="outline small" id="toggle-password" aria-pressed="false">Lihat</button></div></label><div class="admin-feedback ${message ? 'error' : ''}" id="login-feedback" role="alert">${esc(message)}</div><button class="button full" type="submit">Masuk ke dashboard →</button></form><p class="help" style="margin-top:20px">Sesi berakhir setelah 4 jam atau ketika server dimulai ulang. Gunakan tombol Keluar setelah selesai.</p>` : `<div class="notice">Akses admin belum disiapkan pada server ini.</div><p>Pemilik perangkat server dapat membuat password dengan perintah:</p><code>node scripts/admin-setup.mjs</code><p>Simpan password yang ditampilkan, lalu restart server. Tidak ada password bawaan.</p><button class="outline full" id="check-setup">Periksa kembali</button>`}</section>`;
  if (!configured) { document.querySelector('#check-setup').onclick = boot; return; }
  const form = document.querySelector('#login-form');
  const password = form.elements.password;
  document.querySelector('#toggle-password').onclick = e => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    e.target.textContent = visible ? 'Sembunyikan' : 'Lihat';
    e.target.setAttribute('aria-pressed', String(visible));
  };
  form.onsubmit = async e => {
    e.preventDefault();
    const button = form.querySelector('[type=submit]');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Memeriksa…';
    try {
      const result = await api('login', { method: 'POST', body: { password: password.value } });
      password.value = '';
      csrfToken = result.csrfToken;
      logout.hidden = false;
      await load();
    } catch (error) {
      feedback(document.querySelector('#login-feedback'), error.message, true);
      password.value = '';
      password.focus();
    } finally { button.disabled = false; button.textContent = 'Masuk ke dashboard →'; }
  };
}

function badge(status) {
  const tone = status === 'Sedang ditinjau' ? 'review' : status === 'Perlu informasi' ? 'info' : status === 'Diarsipkan' ? 'archive' : '';
  return `<span class="status-badge" data-tone="${tone}">${esc(status)}</span>`;
}

function route(params = {}) {
  const query = new URLSearchParams(params);
  history.pushState({}, '', `/admin${query.size ? '?' + query : ''}`);
  dirty = false;
  load();
  window.scrollTo(0, 0);
}

function list(data) {
  const q = new URLSearchParams(location.search);
  statuses = data.statuses;
  const count = status => data.counts[status] || 0;
  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
  main.innerHTML = `<div class="admin-wrap"><div class="admin-heading"><div><p class="eyebrow">DASHBOARD STUDIO</p><h1>Setiap rancangan, ditindaklanjuti.</h1><p>Tinjau kebutuhan pelanggan dan catat perkembangan permintaan.</p></div><button class="outline small" id="refresh">Muat ulang ↻</button></div><div class="stats">${[['Semua permintaan',total],['Menunggu peninjauan',count(statuses[0])],['Sedang ditangani',count('Sedang ditinjau')+count('Perlu informasi')],['Selesai ditinjau',count('Selesai ditinjau')]].map(([label,n])=>`<div class="stat"><span>${label}</span><strong>${n}</strong></div>`).join('')}</div><form class="admin-filters" id="filter-form"><label class="field">Cari permintaan<input name="search" maxlength="150" placeholder="Nama, nomor, kota, atau model" value="${esc(q.get('search')||'')}"></label><label class="field">Status<select name="status"><option value="">Semua status</option>${statuses.map(s=>`<option ${q.get('status')===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label><button class="button small">Terapkan</button><button type="button" class="outline small" id="reset">Reset</button></form><p class="admin-count" role="status">${data.total} permintaan ditemukan · Halaman ${data.page} dari ${data.pages}</p><div class="admin-table-wrap">${data.items.length ? `<table class="admin-table"><thead><tr><th scope="col">Pelanggan / nomor</th><th scope="col">Rancangan</th><th scope="col">Diterima (WIB)</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>${data.items.map(item=>`<tr><td data-label="Pelanggan"><strong>${esc(item.name)}</strong><small>${esc(item.location)}</small><small>${esc(item.id)}</small></td><td data-label="Rancangan">${esc(item.product)}<small>${item.quantity} unit</small></td><td data-label="Diterima (WIB)">${date(item.createdAt)}</td><td data-label="Status">${badge(item.status)}</td><td><a href="/admin?id=${item.id}" data-request="${item.id}" aria-label="Tinjau permintaan ${esc(item.name)}">Tinjau →</a></td></tr>`).join('')}</tbody></table>` : `<div class="admin-empty"><h2>Belum ada permintaan di sini.</h2><p>${total ? 'Coba kata pencarian lain atau hapus filter.' : 'Permintaan dari website akan tampil setelah pelanggan menyimpan formulir.'}</p></div>`}</div><div class="pagination"><button class="outline small" id="prev" ${data.page===1?'disabled':''}>← Sebelumnya</button><span>${data.page} / ${data.pages}</span><button class="outline small" id="next" ${data.page===data.pages?'disabled':''}>Berikutnya →</button></div><p class="admin-notice">Status hanya digunakan untuk pencatatan internal. Perubahan di sini tidak mengirim pesan, menetapkan harga, atau memulai produksi.</p></div>`;
  document.querySelector('#refresh').onclick = load;
  document.querySelector('#reset').onclick = () => route();
  document.querySelector('#filter-form').onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const params = {};
    for (const key of ['search','status']) if (form.get(key).trim()) params[key] = form.get(key).trim();
    route(params);
  };
  document.querySelectorAll('[data-request]').forEach(a=>a.onclick=e=>{e.preventDefault();route({id:a.dataset.request});});
  for (const [id,delta] of [['prev',-1],['next',1]]) document.getElementById(id).onclick=()=>route({...Object.fromEntries(q),page:data.page+delta});
}

function detail(item) {
  const { snapshot: snapshot } = item;
  const c = snapshot.configuration;
  const pairs = [['Model',snapshot.product.name],['Dimensi (L × T × D)',`${c.width} × ${c.height} × ${c.depth} cm`],['Material',materials.find(m=>m.id===c.material)?.name||c.material],['Finishing',finishes.find(f=>f.id===c.finish)?.name||c.finish],['Tambahan',c.options.map(id=>options.find(o=>o.id===id)?.name||id).join(', ')||'Tanpa tambahan'],['Jumlah',`${c.quantity} unit`],['Versi katalog',snapshot.catalogVersion],['Harga','Belum ditetapkan']];
  main.innerHTML = `<div class="admin-wrap"><a class="text-link" href="/admin" id="back-list">← Semua permintaan</a><div class="admin-heading" style="margin-top:28px"><div><p class="eyebrow">DETAIL PERMINTAAN</p><h1>Rancangan ${esc(snapshot.product.name)}.</h1><div class="admin-id">${esc(item.id)}</div><p>Diterima ${date(item.createdAt)} WIB</p></div><div id="current-status">${badge(item.status)}</div></div><div class="admin-detail-grid"><div><section class="admin-panel"><h2>Konfigurasi pelanggan</h2><div id="request-art"></div><dl class="summary-list">${pairs.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="help" style="margin:20px 0 0">Snapshot saat permintaan disimpan. Dimensi dan material tetap memerlukan peninjauan konstruksi.</p><h3>Catatan pelanggan</h3><div class="admin-notes">${esc(snapshot.notes||'Tidak ada catatan tambahan.')}</div></section><section class="admin-panel"><h2>Riwayat tindak lanjut</h2><ol class="history" id="history">${historyHTML(item)}</ol></section></div><div><section class="admin-panel"><h2>Kontak pelanggan</h2><div class="customer-data"><span>Nama</span>${esc(snapshot.customer.name)}<span>Email / telepon</span>${esc(snapshot.customer.contact)}<span>Kota / kabupaten</span>${esc(snapshot.customer.location)}</div><p class="help" style="margin:22px 0 0">Data ini hanya untuk menindaklanjuti permintaan. Dashboard tidak mengirim pesan secara otomatis.</p></section><section class="admin-panel"><h2>Catat tindak lanjut</h2><form id="manage-form"><label class="field">Status permintaan<select name="status">${statuses.map(s=>`<option ${s===item.status?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label class="field">Catatan internal<textarea name="internalNote" maxlength="4000" placeholder="Hasil peninjauan, informasi yang perlu dikonfirmasi, atau langkah berikutnya…">${esc(item.internalNote)}</textarea></label><p class="help">Catatan internal tidak ditampilkan kepada pelanggan. Maksimal 4.000 karakter.</p><div id="save-feedback" class="admin-feedback" role="status"></div><div class="admin-actions"><button class="button" type="submit">Simpan perubahan</button><button class="outline" type="button" id="reload-detail">Muat ulang data</button></div><p class="help" id="revision-note" style="margin:18px 0 0">Revisi ${item.revision} · ${date(item.updatedAt)} WIB</p></form></section></div></div></div>`;
  // Only use validated catalog-shaped snapshot data for the illustration, never customer text.
  const p = snapshot.product;
  if (/^[a-z-]+$/.test(p.id) && /^[A-Za-z ]+$/.test(p.name) && /^[A-Za-z ]+$/.test(p.type)) document.querySelector('#request-art').innerHTML = furniture(p,c,'measure');
  document.querySelector('#back-list').onclick = e => { e.preventDefault(); if (allowLeave()) route(); };
  document.querySelector('#reload-detail').onclick = () => { if (allowLeave()) { dirty=false; load(); } };
  const form = document.querySelector('#manage-form');
  form.oninput = () => { dirty = true; };
  form.onsubmit = async event => {
    event.preventDefault();
    if (saving) return;
    saving = true;
    const body = { status: form.elements.status.value, internalNote: form.elements.internalNote.value, revision: item.revision };
    for (const control of form.elements) control.disabled = true;
    const message = document.querySelector('#save-feedback');
    feedback(message, 'Menyimpan…');
    try {
      const result = await api(`requests/${item.id}`, { method:'PATCH', body });
      dirty = false;
      item.revision = result.revision;
      item.status = body.status;
      item.internalNote = body.internalNote.trim();
      document.querySelector('#current-status').innerHTML = badge(item.status);
      feedback(message, result.unchanged ? 'Tidak ada perubahan baru.' : 'Perubahan tersimpan.');
      document.querySelector('#revision-note').textContent = `Revisi ${item.revision} · tersimpan di server`;
      try {
        const fresh = await api(`requests/${item.id}`);
        if (form.isConnected) { item = fresh; document.querySelector('#history').innerHTML = historyHTML(item); }
      } catch { /* The write was confirmed; do not misrepresent a history refresh failure as a failed write. */ }
    } catch (error) {
      feedback(message, error.message, true);
    } finally {
      saving = false;
      for (const control of form.elements) control.disabled = false;
    }
  };
}

function historyHTML(item) {
  return item.events.map(e=>`<li>${esc(e.oldStatus)} → <strong>${esc(e.newStatus)}</strong>${e.noteChanged?'<br>Catatan internal diperbarui.':''}<small>${date(e.createdAt)} WIB · Revisi ${e.revision} · Admin lokal</small></li>`).join('') + `<li>Permintaan diterima<small>${date(item.createdAt)} WIB · Snapshot awal disimpan</small></li>`;
}

function allowLeave() {
  if (saving) return false;
  return !dirty || window.confirm('Ada perubahan yang belum disimpan. Tinggalkan perubahan ini?');
}

async function load() {
  activeUrl = location.href;
  const version = ++renderVersion;
  main.innerHTML = '<p class="admin-loading" role="status">Memuat permintaan…</p>';
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('id')) {
      if (!statuses.length) statuses = (await api('requests')).statuses;
      const item = await api(`requests/${encodeURIComponent(q.get('id'))}`);
      if (version === renderVersion) detail(item);
    } else {
      const result = await api(`requests?${q}`);
      if (version === renderVersion) list(result);
    }
    if (version === renderVersion) main.focus({preventScroll:true});
  } catch (error) {
    if (version !== renderVersion || error.status === 401) return;
    main.innerHTML = `<div class="login-card"><h1>Data belum tersedia.</h1><p class="error" role="alert">${esc(error.message)}</p><button class="button" id="retry-load">Coba lagi</button><a class="text-link" href="/admin" style="margin-top:20px">Kembali ke daftar</a></div>`;
    document.querySelector('#retry-load').onclick = load;
  }
}

logout.onclick = async () => {
  if (!allowLeave()) return;
  logout.disabled = true;
  try { await api('logout',{method:'POST',body:{}}); csrfToken=''; logout.hidden=true; login(true); }
  catch (error) { window.alert(error.message); }
  finally { logout.disabled=false; }
};
document.querySelectorAll('.admin-header a').forEach(a=>a.addEventListener('click',e=>{if(!allowLeave())e.preventDefault();}));
window.addEventListener('beforeunload', e => { if (dirty || saving) { e.preventDefault(); e.returnValue=''; } });
window.addEventListener('popstate', () => {
  const target = location.href;
  if (dirty || saving) {
    history.pushState({}, '', activeUrl);
    if (!allowLeave()) return;
    history.replaceState({}, '', target);
  }
  dirty=false;
  load();
});
async function boot() {
  try {
    const result = await api('session');
    if (result.authenticated) { csrfToken=result.csrfToken; logout.hidden=false; load(); }
    else login(result.configured);
  } catch (error) {
    main.innerHTML = `<section class="login-card"><h1>Server belum tersedia.</h1><p role="alert">${esc(error.message)}</p><button class="button" id="retry-boot">Coba lagi</button></section>`;
    document.querySelector('#retry-boot').onclick = boot;
  }
}
boot();
