import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createStore } from './src/store.mjs';
import { findProduct } from './public/catalog.mjs';
import { createAdminAuth, hashPassword } from './src/admin-auth.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||4173);
const store=createStore(process.env.DB_PATH||join(root,'data','requests.sqlite'));
let credential = null;
if (process.env.ADMIN_PASSWORD) {
  credential = hashPassword(process.env.ADMIN_PASSWORD);
  delete process.env.ADMIN_PASSWORD;
} else {
  try { credential = JSON.parse(await readFile(process.env.ADMIN_AUTH_PATH || join(root, 'data', 'admin-auth.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') console.error('Pengaturan admin tidak valid; akses admin dinonaktifkan.'); }
}
const auth = createAdminAuth(credential);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const assets=new Set(['/app.mjs','/catalog.mjs','/art.mjs','/styles.css','/favicon.svg','/admin.mjs','/admin.css']);
function json(res, code, body, cookie) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (cookie) headers['Set-Cookie'] = cookie;
  res.writeHead(code, headers);
  res.end(JSON.stringify(body));
}
async function readJSON(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Gunakan data JSON.'), { status: 415 });
  req.setEncoding('utf8');
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 16384) throw Object.assign(new Error('Data terlalu besar.'), { status: 413 });
  }
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Format data tidak valid.'), { status: 400 }); }
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return json(res, 403, { error: 'Alamat server tidak diizinkan.' });
    const url=new URL(req.url,'http://localhost');
    if (url.pathname.startsWith('/api/admin/')) {
      res.setHeader('Cache-Control', 'no-store');
      const current = auth.session(req);
      if (req.method === 'GET' && url.pathname === '/api/admin/session') return json(res, 200, { configured: auth.configured, authenticated: Boolean(current), ...(current ? { csrfToken: current.csrfToken } : {}) });
      if (!['GET','HEAD'].includes(req.method) && req.headers.origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'Asal permintaan tidak diizinkan.' });
      if (req.method === 'POST' && url.pathname === '/api/admin/login') {
        const body = await readJSON(req);
        const result = auth.login(body?.password, req.socket.remoteAddress, req);
        return json(res, result.code, result.body, result.cookie);
      }
      if (!current) return json(res, 401, { error: 'Silakan masuk sebagai admin.' });
      if (!['GET','HEAD'].includes(req.method) && req.headers['x-csrf-token'] !== current.csrfToken) return json(res, 403, { error: 'Sesi tidak valid. Muat ulang halaman dan coba lagi.' });
      if (req.method === 'POST' && url.pathname === '/api/admin/logout') return json(res, 200, { authenticated: false }, auth.logout(req));
      if (req.method === 'GET' && url.pathname === '/api/admin/requests') return json(res, 200, store.listRequests(Object.fromEntries(url.searchParams)));
      const detail = url.pathname.match(/^\/api\/admin\/requests\/(RR-[A-F0-9-]{36})$/);
      if (detail && req.method === 'GET') {
        const request = store.getRequest(detail[1]);
        return json(res, request ? 200 : 404, request || { error: 'Permintaan tidak ditemukan.' });
      }
      if (detail && req.method === 'PATCH') {
        const result = store.updateRequest(detail[1], await readJSON(req));
        return json(res, result.code, result.body);
      }
      return json(res, 404, { error: 'Endpoint tidak ditemukan.' });
    }
    if(url.pathname==='/api/requests' && req.method==='POST') {
      if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`) {res.writeHead(403);return res.end();}
      if(!req.headers['content-type']?.startsWith('application/json')) {res.writeHead(415);return res.end();}
      let raw='';
      req.setEncoding('utf8');
      for await(const chunk of req) {raw+=chunk; if(Buffer.byteLength(raw)>16384) {res.writeHead(413);return res.end(JSON.stringify({error:'Data terlalu besar.'}));}}
      let body;
      try {body=JSON.parse(raw);} catch {res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Format data tidak valid.'}));}
      const result=store.submit(body,req.headers['idempotency-key']);
      res.writeHead(result.code,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify(result.body));
    }
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end();}
    if (url.pathname === '/admin') {
      res.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : await readFile(join(root, 'public', 'admin.html')));
    }
    if(url.pathname==='/api/health') {res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,mode:'local-demo'}));}
    if(assets.has(url.pathname)) {
      const data=await readFile(join(root,'public',url.pathname.slice(1)));
      res.writeHead(200,{'Content-Type':mime[extname(url.pathname)]});return res.end(req.method==='HEAD'?undefined:data);
    }
    const match=url.pathname.match(/^\/(produk|konfigurasi)\/([a-z-]+)$/);
    const valid=['/','/katalog','/penawaran','/bantuan','/material','/tentang'].includes(url.pathname)||(match&&findProduct(match[2]));
    const title=match&&findProduct(match[2]) ? `${findProduct(match[2]).name} — ${match[1]==='produk'?'Detail produk':'Konfigurasi'}` : ({'/':'Furniture untuk ruang & cerita Anda','/katalog':'Koleksi furniture','/penawaran':'Permintaan penawaran','/bantuan':'Bantuan & kontak','/material':'Material & finishing','/tentang':'Tentang studio'}[url.pathname]||'Halaman tidak ditemukan');
    const html=(await readFile(join(root,'public','index.html'),'utf8')).replace('<!--TITLE-->',title);
    res.writeHead(valid?200:404,{'Content-Type':mime['.html']});res.end(req.method==='HEAD'?undefined:html);
  } catch(error) {console.error(error.message);json(res, error.status || 500, { error: error.status ? error.message : 'Perubahan belum dikonfirmasi. Coba lagi setelah server tersedia.' });}
});
server.listen(port,'127.0.0.1',()=>console.log(`Ruang Rupa: http://127.0.0.1:${port}\nAdmin: ${auth.configured ? 'siap di /admin' : 'belum disiapkan; jalankan node scripts/admin-setup.mjs'}`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
