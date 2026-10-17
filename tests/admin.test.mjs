import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, createAdminAuth } from '../src/admin-auth.mjs';
import { createStore, requestStatuses } from '../src/store.mjs';
import { defaultConfiguration, products } from '../public/catalog.mjs';

const request = name => ({ configuration:defaultConfiguration(products[0]),customer:{name,contact:'admin-test@example.com',location:'Bandung'},notes:'Data sintetis',consent:true });

test('setup creates a usable hash and refuses to overwrite existing credentials',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rr-admin-setup-'));
  const path=join(dir,'admin-auth.json');
  try {
    const env={...process.env,ADMIN_AUTH_PATH:path};
    const first=spawnSync(process.execPath,['scripts/admin-setup.mjs'],{env,encoding:'utf8'});
    assert.equal(first.status,0);
    const password=first.stdout.trim().split(/\r?\n/)[1];
    const raw=readFileSync(path,'utf8');
    assert.equal(raw.includes(password),false);
    const auth=createAdminAuth(JSON.parse(raw));
    assert.equal(auth.login(password,'local',{headers:{}}).code,200);
    const second=spawnSync(process.execPath,['scripts/admin-setup.mjs'],{env,encoding:'utf8'});
    assert.equal(second.status,1);
    assert.equal(readFileSync(path,'utf8'),raw);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('admin auth requires setup, protects cookie, expires and revokes sessions', () => {
  assert.equal(createAdminAuth(null).configured,false);
  assert.equal(createAdminAuth(null).login('x','local',{headers:{}}).code,503);
  assert.throws(()=>hashPassword('short'));
  const password=randomBytes(24).toString('hex');
  let time=1000;
  const auth=createAdminAuth(hashPassword(password),{now:()=>time});
  const login=auth.login(password,'local',{headers:{}});
  assert.equal(login.code,200);
  assert.match(login.cookie,/HttpOnly; SameSite=Strict; Path=\/api\/admin/);
  const req={headers:{cookie:login.cookie.split(';')[0]}};
  assert.equal(auth.session(req).csrfToken,login.body.csrfToken);
  time+=4*60*60*1000;
  assert.equal(auth.session(req),null);
  const again=auth.login(password,'local',{headers:{}});
  const second={headers:{cookie:again.cookie.split(';')[0]}};
  auth.logout(second);
  assert.equal(auth.session(second),null);
  assert.equal(auth.session({headers:{cookie:'rr_admin=invalid'}}),null);
});

test('admin login rate limits failed attempts and recovers after cooldown',()=>{
  const password=randomBytes(24).toString('hex');
  let time=0;
  const auth=createAdminAuth(hashPassword(password),{now:()=>time});
  for(let i=0;i<5;i++)assert.equal(auth.login('incorrect-password','local',{headers:{}}).code,401);
  assert.equal(auth.login(password,'local',{headers:{}}).code,429);
  time=15*60*1000;
  assert.equal(auth.login(password,'local',{headers:{}}).code,200);
});

test('request management migrates old database, preserves snapshots, rejects conflicts and persists events',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rr-admin-store-')); const path=join(dir,'requests.sqlite');
  // Create the original schema first to exercise non-destructive migration.
  const db=new DatabaseSync(path);
  db.exec('CREATE TABLE requests (id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, digest TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL, snapshot TEXT NOT NULL)');
  db.close();
  let store=createStore(path);
  try {
    const id=store.submit(request('Pelanggan Admin'),randomUUID()).body.id;
    const before=store.getRequest(id);
    assert.equal(store.updateRequest(id,{status:'Tidak valid',internalNote:'',revision:0}).code,422);
    assert.equal(store.updateRequest(id,{status:requestStatuses[1],internalNote:'a'.repeat(4001),revision:0}).code,422);
    assert.equal(store.updateRequest('missing',{status:requestStatuses[1],internalNote:'',revision:0}).code,404);
    assert.equal(store.updateRequest(id,{status:requestStatuses[1],internalNote:'Konfirmasi dimensi',revision:0}).code,200);
    assert.equal(store.updateRequest(id,{status:requestStatuses[2],internalNote:'Stale',revision:0}).code,409);
    assert.equal(store.getRequest(id).internalNote,'Konfirmasi dimensi');
    assert.deepEqual(store.getRequest(id).snapshot,before.snapshot);
    const retry=store.updateRequest(id,{status:requestStatuses[1],internalNote:'Konfirmasi dimensi',revision:1});
    assert.equal(retry.body.unchanged,true);
    assert.equal(store.getRequest(id).events.length,1);
    for(let i=0;i<12;i++)store.submit(request(`Demo ${i}`),randomUUID());
    assert.equal(store.listRequests().items.length,10);
    assert.equal(store.listRequests({page:2}).items.length,3);
    assert.equal(store.listRequests({status:requestStatuses[1]}).total,1);
    assert.equal(store.listRequests({search:'Pelanggan Admin'}).total,1);
    assert.equal(store.listRequests({search:"' OR 1=1"}).total,0);
    store.close();store=createStore(path);
    assert.equal(store.getRequest(id).revision,1);
    assert.equal(store.getRequest(id).events[0].noteChanged,1);
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('admin HTTP blocks guests, cross-origin and missing CSRF; authenticates, edits and logs out',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'rr-admin-http-'));
  const password=randomBytes(24).toString('hex');
  const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4192',DB_PATH:join(dir,'requests.sqlite'),ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
  try {
    await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('readiness timeout')),10000).unref())]);
    const base='http://127.0.0.1:4192';
    const headers={'Content-Type':'application/json',Origin:base};
    assert.equal((await fetch(base+'/admin')).status,200);
    assert.equal((await fetch(base+'/api/admin/requests')).status,401);
    const session=await(await fetch(base+'/api/admin/session')).json();
    assert.equal(session.authenticated,false);assert.equal(session.configured,true);
    assert.equal((await fetch(base+'/api/admin/login',{method:'POST',headers:{...headers,Origin:'https://example.com'},body:JSON.stringify({password})})).status,403);
    const login=await fetch(base+'/api/admin/login',{method:'POST',headers,body:JSON.stringify({password})});
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const {csrfToken}=await login.json();
    const authorized={...headers,Cookie:cookie,'X-CSRF-Token':csrfToken};
    const created=await(await fetch(base+'/api/requests',{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify(request('Demo HTTP Admin'))})).json();
    const endpoint=`${base}/api/admin/requests/${created.id}`;
    assert.equal((await fetch(endpoint)).status,401);
    const details=await(await fetch(endpoint,{headers:authorized})).json();
    assert.equal(details.snapshot.customer.name,'Demo HTTP Admin');
    const patch={status:'Perlu informasi',internalNote:'Uji internal <script>alert(1)</script>',revision:0};
    assert.equal((await fetch(endpoint,{method:'PATCH',headers:{...headers,Cookie:cookie},body:JSON.stringify(patch)})).status,403);
    assert.equal((await fetch(endpoint,{method:'PATCH',headers:authorized,body:JSON.stringify(patch)})).status,200);
    assert.equal((await fetch(endpoint,{method:'PATCH',headers:authorized,body:JSON.stringify(patch)})).status,409);
    const list=await(await fetch(base+'/api/admin/requests?status='+encodeURIComponent('Perlu informasi'),{headers:authorized})).json();
    assert.equal(list.total,1);
    assert.equal(list.items[0].contact,undefined);
    const data=await fetch(endpoint,{headers:authorized});assert.equal(data.headers.get('cache-control'),'no-store');
    assert.equal((await fetch(base+'/api/admin/logout',{method:'POST',headers:authorized,body:'{}'})).status,200);
    assert.equal((await fetch(endpoint,{headers:authorized})).status,401);
  } finally {proc.kill();await once(proc,'exit');rmSync(dir,{recursive:true,force:true});}
});
