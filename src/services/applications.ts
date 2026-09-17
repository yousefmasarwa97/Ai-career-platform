import { db } from '../db';
import { HttpError } from '../util';
import { getJob } from './jobs';

export interface Application {
  id: number;
  candidate_id: number;
  job_id: number;
  status: string;
  applied_at: string;
  job_title?: string;
}

// Candidate applies to a job (Req 6). Explicit action only; duplicates blocked.
export function applyToJob(candidateId: number, jobId: number): Application {
  const job = getJob(jobId);
  if (job.status !== 'published') {
    throw new HttpError(400, 'You can only apply to published job offers');
  }

  const existing = db
    .prepare('SELECT id FROM applications WHERE candidate_id = ? AND job_id = ?')
    .get(candidateId, jobId);
  if (existing) throw new HttpError(409, 'You have already applied to this job');

  const info = db
    .prepare('INSERT INTO applications (candidate_id, job_id) VALUES (?, ?)')
    .run(candidateId, jobId);
  return getApplication(Number(info.lastInsertRowid));
}

export function getApplication(id: number): Application {
  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as Application | undefined;
  if (!row) throw new HttpError(404, 'Application not found');
  return row;
}

export function listCandidateApplications(candidateId: number): Application[] {
  return db
    .prepare(
      `SELECT a.*, j.title AS job_title
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = ? ORDER BY a.applied_at DESC`
    )
    .all(candidateId) as unknown as Application[];
}
