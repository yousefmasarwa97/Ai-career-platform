import fs from 'fs';
import path from 'path';

// Minimal .env loader (avoids an extra dependency).
function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const ROOT = process.cwd();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  aiProvider: (process.env.AI_PROVIDER || 'local') as 'local' | 'openai',
  allowExternalLlm: (process.env.ALLOW_EXTERNAL_LLM || 'false') === 'true',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  paths: {
    root: ROOT,
    dataDir: path.join(ROOT, 'data'),
    dbFile: path.join(ROOT, 'data', 'app.db'),
    uploadsDir: path.join(ROOT, 'uploads'),
    publicDir: path.join(ROOT, 'public'),
    // Public images (company logos) live under public/ so they are served directly.
    imagesDir: path.join(ROOT, 'public', 'images'),
  },

  cv: {
    maxVersionsPerCandidate: 5,
    allowedFormats: ['pdf', 'docx'],
  },

  images: {
    allowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    maxBytes: 3 * 1024 * 1024, // 3 MB
  },
} as const;

// Ensure runtime directories exist.
for (const dir of [config.paths.dataDir, config.paths.uploadsDir, config.paths.imagesDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
