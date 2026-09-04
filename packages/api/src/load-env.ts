/**
 * Load monorepo `.env` before any module reads process.env.
 * Must be imported first from entrypoints and db.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function findEnvFile(): string | undefined {
  const candidates = [
    // packages/api/dist → repo root; packages/api/src → repo root
    path.join(__dirname, '..', '..', '..', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '..', '.env'),
    path.join(process.cwd(), '..', '..', '..', '.env'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

const envPath = findEnvFile();
if (envPath) {
  dotenv.config({ path: envPath });
}
