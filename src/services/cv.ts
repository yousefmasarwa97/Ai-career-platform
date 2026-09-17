import fs from 'fs';
import path from 'path';
import { db, transaction } from '../db';
import { config } from '../config';
import { HttpError } from '../util';

export interface CvVersion {
  id: number;
  candidate_id: number;
  filename: string;
  storage_key: string;
  format: string;
  version_label: string | null;
  uploaded_at: string;
}

function detectFormat(filename: string): string {
  return path.extname(filename).replace('.', '').toLowerCase();
}

export function uploadCv(
  candidateId: number,
  file: { originalname: string; buffer: Buffer },
  versionLabel?: string
): CvVersion {
  const format = detectFormat(file.originalname);
  // Validate supported formats (Req 4.5).
  if (!(config.cv.allowedFormats as readonly string[]).includes(format)) {
    throw new HttpError(
      422,
      `Unsupported file format ".${format}". Supported formats: ${config.cv.allowedFormats.join(', ')}`
    );
  }

  // Enforce the 5-version limit atomically inside a transaction (Req 4.2).
  const id = transaction(() => {
    const { count } = db
      .prepare('SELECT COUNT(*) AS count FROM cv_versions WHERE candidate_id = ?')
      .get(candidateId) as { count: number };

    if (count >= config.cv.maxVersionsPerCandidate) {
      throw new HttpError(
        409,
        `CV version limit reached. A candidate may store at most ${config.cv.maxVersionsPerCandidate} CV versions. Delete an old version before uploading a new one.`
      );
    }

    const storageKey = `cv_${candidateId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${format}`;
    const fullPath = path.join(config.paths.uploadsDir, storageKey);
    fs.writeFileSync(fullPath, file.buffer);

    // Very light "text extraction" for the AI layer. For PDFs/DOCX in a real
    // system this would use a proper parser; here we store best-effort text.
    let contentText = '';
    try {
      contentText = file.buffer.toString('utf-8').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ').slice(0, 20000);
    } catch {
      contentText = '';
    }

    const info = db
      .prepare(
        `INSERT INTO cv_versions (candidate_id, filename, storage_key, format, version_label, content_text)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(candidateId, file.originalname, storageKey, format, versionLabel ?? null, contentText);

    return Number(info.lastInsertRowid);
  });

  return getCvVersion(id);
}

export function getCvVersion(id: number): CvVersion {
  const row = db.prepare('SELECT id, candidate_id, filename, storage_key, format, version_label, uploaded_at FROM cv_versions WHERE id = ?').get(id) as CvVersion | undefined;
  if (!row) throw new HttpError(404, 'CV version not found');
  return row;
}

export function getCvContent(id: number): string {
  const row = db.prepare('SELECT content_text FROM cv_versions WHERE id = ?').get(id) as { content_text: string } | undefined;
  if (!row) throw new HttpError(404, 'CV version not found');
  return row.content_text || '';
}

export function listCvVersions(candidateId: number): CvVersion[] {
  return db
    .prepare('SELECT id, candidate_id, filename, storage_key, format, version_label, uploaded_at FROM cv_versions WHERE candidate_id = ? ORDER BY uploaded_at DESC')
    .all(candidateId) as unknown as CvVersion[];
}

export function deleteCvVersion(candidateId: number, id: number): void {
  const row = db.prepare('SELECT candidate_id, storage_key FROM cv_versions WHERE id = ?').get(id) as
    | { candidate_id: number; storage_key: string }
    | undefined;
  if (!row) throw new HttpError(404, 'CV version not found');
  if (row.candidate_id !== candidateId) {
    throw new HttpError(403, 'You cannot delete another candidate\'s CV');
  }
  const fullPath = path.join(config.paths.uploadsDir, row.storage_key);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.prepare('DELETE FROM cv_versions WHERE id = ?').run(id);
}
