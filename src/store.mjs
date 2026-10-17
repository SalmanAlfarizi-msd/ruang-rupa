import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { findProduct, catalogVersion, validateRequest } from '../public/catalog.mjs';

export const requestStatuses = ['Tersimpan lokal — menunggu peninjauan', 'Sedang ditinjau', 'Perlu informasi', 'Selesai ditinjau', 'Diarsipkan'];

export function createStore(path) {
  mkdirSync(dirname(path),{recursive:true});
  const db=new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, digest TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL, snapshot TEXT NOT NULL)');
  db.exec(`CREATE TABLE IF NOT EXISTS request_management (
    request_id TEXT PRIMARY KEY REFERENCES requests(id),
    internal_note TEXT NOT NULL DEFAULT '',
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS request_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL REFERENCES requests(id),
    created_at TEXT NOT NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    note_changed INTEGER NOT NULL,
    revision INTEGER NOT NULL
  )`);
  return {
    submit(body,key) {
      const errors=validateRequest(body);
      if(Object.keys(errors).length) return {code:422,body:{errors}};
      if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(key)) return {code:400,body:{error:'Identitas pengiriman tidak valid. Muat ulang halaman.'}};
      const c=body.configuration;
      const snapshot={catalogVersion,pricingVersion:null,pricingStatus:'requires-review',product:findProduct(c.productId),configuration:{productId:c.productId,width:c.width,height:c.height,depth:c.depth,material:c.material,finish:c.finish,options:[...c.options],quantity:c.quantity},customer:{name:body.customer.name.trim(),contact:body.customer.contact.trim(),location:body.customer.location.trim()},notes:body.notes.trim(),consent:true};
      const digest=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
      const existing=db.prepare('SELECT id, digest, status FROM requests WHERE request_key = ?').get(key);
      if(existing) return existing.digest===digest ? {code:200,body:{id:existing.id,status:existing.status}} : {code:409,body:{error:'Isi berubah setelah pengiriman. Mulai permintaan baru untuk mengirim perubahan.'}};
      const id='RR-'+randomUUID().toUpperCase();
      const status='Tersimpan lokal — menunggu peninjauan';
      db.prepare('INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?)').run(id,key,digest,new Date().toISOString(),status,JSON.stringify(snapshot));
      return {code:201,body:{id,status}};
    },
    listRequests({ search = '', status = '', page = 1 } = {}) {
      const term = typeof search === 'string' ? search.trim().slice(0, 150).toLocaleLowerCase('id') : '';
      const rows = db.prepare('SELECT id, created_at, status, snapshot FROM requests ORDER BY created_at DESC, id DESC').all();
      const counts = Object.fromEntries(requestStatuses.map(s => [s, 0]));
      for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
      const items = rows.map(row => {
        const data = JSON.parse(row.snapshot);
        return { id: row.id, createdAt: row.created_at, status: row.status, name: data.customer.name, location: data.customer.location, product: data.product.name, quantity: data.configuration.quantity };
      }).filter(row => (!status || row.status === status) && (!term || `${row.id} ${row.name} ${row.location} ${row.product}`.toLocaleLowerCase('id').includes(term)));
      const pages = Math.max(1, Math.ceil(items.length / 10));
      const current = Math.max(1, Math.min(pages, Number.parseInt(page, 10) || 1));
      return { items: items.slice((current - 1) * 10, current * 10), total: items.length, page: current, pages, counts, statuses: requestStatuses };
    },
    getRequest(id) {
      const row = db.prepare(`SELECT r.*, m.internal_note, m.revision, m.updated_at FROM requests r
        LEFT JOIN request_management m ON r.id = m.request_id WHERE r.id = ?`).get(id);
      if (!row) return null;
      return { id: row.id, createdAt: row.created_at, status: row.status, snapshot: JSON.parse(row.snapshot), internalNote: row.internal_note || '', revision: row.revision || 0, updatedAt: row.updated_at || row.created_at,
        events: db.prepare('SELECT created_at AS createdAt, old_status AS oldStatus, new_status AS newStatus, note_changed AS noteChanged, revision FROM request_events WHERE request_id = ? ORDER BY id DESC').all(id) };
    },
    updateRequest(id, body) {
      if (!body || !requestStatuses.includes(body.status) || typeof body.internalNote !== 'string' || body.internalNote.length > 4000 || !Number.isInteger(body.revision) || body.revision < 0) {
        return { code: 422, body: { error: 'Pilih status yang tersedia, catatan maksimal 4.000 karakter, dan revisi yang valid.' } };
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        const row = db.prepare(`SELECT r.status, COALESCE(m.revision, 0) AS revision, COALESCE(m.internal_note, '') AS internal_note
          FROM requests r LEFT JOIN request_management m ON r.id = m.request_id WHERE r.id = ?`).get(id);
        if (!row) { db.exec('ROLLBACK'); return { code: 404, body: { error: 'Permintaan tidak ditemukan.' } }; }
        if (row.revision !== body.revision) { db.exec('ROLLBACK'); return { code: 409, body: { error: 'Permintaan berubah di sesi lain. Muat ulang data sebelum menyimpan agar perubahan tidak tertimpa.' } }; }
        const note = body.internalNote.trim();
        if (row.status === body.status && row.internal_note === note) { db.exec('COMMIT'); return { code: 200, body: { revision: row.revision, unchanged: true } }; }
        const revision = row.revision + 1;
        const time = new Date().toISOString();
        db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(body.status, id);
        db.prepare(`INSERT INTO request_management (request_id, internal_note, revision, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(request_id) DO UPDATE SET internal_note = excluded.internal_note, revision = excluded.revision, updated_at = excluded.updated_at`).run(id, note, revision, time);
        db.prepare('INSERT INTO request_events (request_id, created_at, old_status, new_status, note_changed, revision) VALUES (?, ?, ?, ?, ?, ?)').run(id, time, row.status, body.status, Number(row.internal_note !== note), revision);
        db.exec('COMMIT');
        return { code: 200, body: { revision } };
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close:()=>db.close()
  };
}
