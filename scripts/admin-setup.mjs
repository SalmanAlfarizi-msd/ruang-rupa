import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/admin-auth.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const path = process.env.ADMIN_AUTH_PATH || join(root, 'data', 'admin-auth.json');
const password = randomBytes(24).toString('base64url');
await mkdir(dirname(path), { recursive: true });
try {
  await writeFile(path, JSON.stringify(hashPassword(password)), { flag: 'wx', mode: 0o600 });
  console.log('Admin lokal siap. Simpan password berikut di pengelola password Anda:');
  console.log(password);
  console.log('Password hanya ditampilkan saat dibuat. Restart server, lalu buka /admin.');
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('Pengaturan admin sudah ada. Tidak ditimpa. Lihat README untuk pemulihan akses.');
    process.exitCode = 1;
  } else throw error;
}
