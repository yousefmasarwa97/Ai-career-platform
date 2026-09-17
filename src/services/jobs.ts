import { db } from '../db';
import { HttpError, parseJson } from '../util';
import { AuthUser } from '../types';

export interface Job {
  id: number;
  created_by: number;
  title: string;
  description: string | null;
  required_skills: string[];
  location: string | null;
  url: string | null;
  company_name: string | null;
  company_logo: string | null;
  status: 'draft' | 'published';
  created_at: string;
}

function hydrate(row: any): Job {
  return {
    id: row.id,
    created_by: row.created_by,
    title: row.title,
    description: row.description ?? null,
    required_skills: parseJson(row.required_skills, []),
    location: row.location ?? null,
    url: row.url ?? null,
    company_name: row.company_name ?? null,
    company_logo: row.company_logo ?? null,
    status: row.status,
    created_at: row.created_at,
  };
}

// Basic URL validation: allow empty/undefined, an http(s) link, or an
// internal uploaded-image path (e.g. /images/logo_...png).
function normalizeUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\/.+/i.test(trimmed)) return trimmed;
  if (/^\/images\/[\w.\-]+$/.test(trimmed)) return trimmed;
  throw new HttpError(400, 'URL must start with http:// or https:// (or be an uploaded image path)');
}

export function createJob(
  creator: AuthUser,
  data: {
    title: string;
    description?: string;
    required_skills?: string[];
    location?: string;
    url?: string;
    company_name?: string;
    company_logo?: string;
    status?: 'draft' | 'published';
  }
): Job {
  if (!data.title || !data.title.trim()) throw new HttpError(400, 'Job title is required');
  const info = db
    .prepare(
      `INSERT INTO jobs (created_by, title, description, required_skills, location, url, company_name, company_logo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      creator.id,
      data.title.trim(),
      data.description ?? null,
      JSON.stringify(data.required_skills ?? []),
      data.location ?? null,
      normalizeUrl(data.url),
      data.company_name?.trim() || null,
      normalizeUrl(data.company_logo),
      data.status === 'draft' ? 'draft' : 'published'
    );
  return getJob(Number(info.lastInsertRowid));
}

export function getJob(id: number): Job {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!row) throw new HttpError(404, 'Job not found');
  return hydrate(row);
}

// Candidates see only published jobs; admins see all.
export function listJobsForUser(user: AuthUser): Job[] {
  if (user.role === 'admin') {
    return (db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as any[]).map(hydrate);
  }
  if (user.role === 'mentor') {
    // Mentors see published jobs plus their own drafts.
    return (
      db
        .prepare("SELECT * FROM jobs WHERE status = 'published' OR created_by = ? ORDER BY created_at DESC")
        .all(user.id) as any[]
    ).map(hydrate);
  }
  return (db.prepare("SELECT * FROM jobs WHERE status = 'published' ORDER BY created_at DESC").all() as any[]).map(hydrate);
}

export function listPublishedJobs(): Job[] {
  return (db.prepare("SELECT * FROM jobs WHERE status = 'published' ORDER BY created_at DESC").all() as any[]).map(hydrate);
}

export function updateOwnJob(user: AuthUser, id: number, data: Partial<Job>): Job {
  const job = getJob(id);
  if (user.role !== 'admin' && job.created_by !== user.id) {
    throw new HttpError(403, 'You can only manage job offers you created');
  }
  db.prepare(
    `UPDATE jobs SET title = @title, description = @description, required_skills = @required_skills,
       location = @location, url = @url, company_name = @company_name, company_logo = @company_logo,
       status = @status WHERE id = @id`
  ).run({
    id,
    title: data.title ?? job.title,
    description: data.description ?? job.description,
    required_skills: JSON.stringify(data.required_skills ?? job.required_skills),
    location: data.location ?? job.location,
    url: data.url !== undefined ? normalizeUrl(data.url) : (job.url ?? null),
    company_name: data.company_name !== undefined ? (data.company_name?.trim() || null) : (job.company_name ?? null),
    company_logo: data.company_logo !== undefined ? normalizeUrl(data.company_logo) : (job.company_logo ?? null),
    status: data.status ?? job.status,
  });
  return getJob(id);
}
