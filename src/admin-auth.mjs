import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 200) {
    throw new Error('Password admin harus 16–200 karakter.');
  }
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}

export function createAdminAuth(credential, { now = Date.now } = {}) {
  const configured = /^[a-f0-9]{32}$/.test(credential?.salt || '') && /^[a-f0-9]{128}$/.test(credential?.hash || '');
  const sessions = new Map();
  const attempts = new Map();
  const duration = 4 * 60 * 60 * 1000;
  const key = token => createHash('sha256').update(token).digest('hex');
  const cookie = token => `rr_admin=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${token ? duration / 1000 : 0}`;

  function session(req) {
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('rr_admin='))?.slice(9);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const id = key(token);
    const current = sessions.get(id);
    if (!current || current.expires <= now()) { sessions.delete(id); return null; }
    return { ...current, id };
  }

  return {
    configured,
    session,
    login(password, address, req) {
      if (!configured) return { code: 503, body: { error: 'Admin belum disiapkan. Jalankan pengaturan admin di terminal server.' } };
      const time = now();
      for (const [ip, item] of attempts) if (item.until <= time) attempts.delete(ip);
      for (const [id, item] of sessions) if (item.expires <= time) sessions.delete(id);
      const failures = attempts.get(address) || { count: 0, until: time + 15 * 60 * 1000 };
      if (failures.count >= 5) return { code: 429, body: { error: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.' } };
      const inputValid = typeof password === 'string' && password.length >= 16 && password.length <= 200;
      const candidate = scryptSync(inputValid ? password : 'invalid-password', credential.salt, 64);
      if (!inputValid || !timingSafeEqual(candidate, Buffer.from(credential.hash, 'hex'))) {
        failures.count += 1;
        attempts.set(address, failures);
        return { code: 401, body: { error: 'Password tidak sesuai. Periksa kembali dan coba lagi.' } };
      }
      attempts.delete(address);
      const old = session(req);
      if (old) sessions.delete(old.id);
      if (sessions.size >= 128) sessions.delete(sessions.keys().next().value);
      const token = randomBytes(32).toString('hex');
      const csrfToken = randomBytes(32).toString('hex');
      sessions.set(key(token), { csrfToken, expires: time + duration });
      return { code: 200, cookie: cookie(token), body: { authenticated: true, csrfToken } };
    },
    logout(req) {
      const current = session(req);
      if (current) sessions.delete(current.id);
      return cookie('');
    }
  };
}
