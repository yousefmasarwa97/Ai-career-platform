import { db } from '../db';
import { HttpError, parseJson } from '../util';

const JSON_FIELDS = ['personal', 'education', 'experience', 'skills', 'projects', 'certifications', 'preferred_roles'];

export interface CandidateProfile {
  user_id: number;
  full_name: string | null;
  personal: any;
  education: any[];
  experience: any[];
  skills: string[];
  projects: any[];
  certifications: any[];
  career_goals: string | null;
  preferred_roles: string[];
  photo: string | null;
  updated_at: string;
}

function hydrate(row: any): CandidateProfile {
  return {
    user_id: row.user_id,
    full_name: row.full_name ?? null,
    personal: parseJson(row.personal, {}),
    education: parseJson(row.education, []),
    experience: parseJson(row.experience, []),
    skills: parseJson(row.skills, []),
    projects: parseJson(row.projects, []),
    certifications: parseJson(row.certifications, []),
    career_goals: row.career_goals ?? null,
    preferred_roles: parseJson(row.preferred_roles, []),
    photo: row.photo ?? null,
    updated_at: row.updated_at,
  };
}

// Accept http(s) links or internal uploaded-image paths.
function normalizePhoto(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const t = url.trim();
  if (/^https?:\/\/.+/i.test(t) || /^\/images\/[\w.\-]+$/.test(t)) return t;
  throw new HttpError(400, 'Photo must be an http(s) URL or an uploaded image path');
}

export function getCandidateProfile(candidateId: number): CandidateProfile {
  const row = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(candidateId);
  if (!row) throw new HttpError(404, 'Candidate profile not found');
  return hydrate(row);
}

export function updateCandidateProfile(candidateId: number, data: Partial<CandidateProfile>): CandidateProfile {
  const existing = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(candidateId);
  if (!existing) throw new HttpError(404, 'Candidate profile not found');

  const merged: any = { ...existing };
  const editable = ['full_name', 'personal', 'education', 'experience', 'skills', 'projects', 'certifications', 'career_goals', 'preferred_roles'];
  for (const key of editable) {
    if (key in data) {
      const value = (data as any)[key];
      merged[key] = JSON_FIELDS.includes(key) ? JSON.stringify(value ?? (Array.isArray(value) ? [] : {})) : value;
    }
  }
  if ('photo' in data) merged.photo = normalizePhoto((data as any).photo);

  db.prepare(
    `UPDATE candidate_profiles SET
      full_name = @full_name, personal = @personal, education = @education,
      experience = @experience, skills = @skills, projects = @projects,
      certifications = @certifications, career_goals = @career_goals,
      preferred_roles = @preferred_roles, photo = @photo, updated_at = datetime('now')
     WHERE user_id = @user_id`
  ).run({
    user_id: candidateId,
    full_name: merged.full_name ?? null,
    personal: typeof merged.personal === 'string' ? merged.personal : JSON.stringify(merged.personal ?? {}),
    education: typeof merged.education === 'string' ? merged.education : JSON.stringify(merged.education ?? []),
    experience: typeof merged.experience === 'string' ? merged.experience : JSON.stringify(merged.experience ?? []),
    skills: typeof merged.skills === 'string' ? merged.skills : JSON.stringify(merged.skills ?? []),
    projects: typeof merged.projects === 'string' ? merged.projects : JSON.stringify(merged.projects ?? []),
    certifications: typeof merged.certifications === 'string' ? merged.certifications : JSON.stringify(merged.certifications ?? []),
    career_goals: merged.career_goals ?? null,
    preferred_roles: typeof merged.preferred_roles === 'string' ? merged.preferred_roles : JSON.stringify(merged.preferred_roles ?? []),
    photo: merged.photo ?? null,
  });

  return getCandidateProfile(candidateId);
}

// ---- Mentor profile (contact info is optional, Req 7) ----

export function getMentorProfile(mentorId: number): any {
  const row: any = db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').get(mentorId);
  if (!row) throw new HttpError(404, 'Mentor profile not found');
  return {
    user_id: row.user_id,
    full_name: row.full_name ?? null,
    contact_info: parseJson(row.contact_info, null),
    updated_at: row.updated_at,
  };
}

export function updateMentorProfile(mentorId: number, data: { full_name?: string; contact_info?: any }): any {
  const existing = db.prepare('SELECT * FROM mentor_profiles WHERE user_id = ?').get(mentorId);
  if (!existing) throw new HttpError(404, 'Mentor profile not found');

  db.prepare(
    `UPDATE mentor_profiles SET full_name = @full_name, contact_info = @contact_info,
       updated_at = datetime('now') WHERE user_id = @user_id`
  ).run({
    user_id: mentorId,
    full_name: data.full_name ?? (existing as any).full_name ?? null,
    // contact_info is optional: allowed to be null (Req 7.2).
    contact_info: 'contact_info' in data ? (data.contact_info == null ? null : JSON.stringify(data.contact_info)) : (existing as any).contact_info,
  });

  return getMentorProfile(mentorId);
}

export function listAllCandidates(): any[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, p.full_name, p.photo, p.updated_at
       FROM users u JOIN candidate_profiles p ON p.user_id = u.id
       WHERE u.role = 'candidate' ORDER BY u.id`
    )
    .all();
  return rows;
}

// Full candidate profiles (for the admin candidate-matching agent).
export function listCandidatesWithProfiles(): CandidateProfile[] {
  const rows = db
    .prepare(
      `SELECT p.* FROM candidate_profiles p JOIN users u ON u.id = p.user_id
       WHERE u.role = 'candidate'`
    )
    .all();
  return (rows as any[]).map(hydrate);
}
