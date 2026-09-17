// Idempotent seed script: ADDS sample jobs and candidates without touching
// or removing existing data. Safe to run multiple times (skips records that
// already exist, matched by email for users and by title+company for jobs).
//
// Run with:  npm run seed   (after npm run build)
import bcrypt from 'bcryptjs';
import { db, initSchema } from './db';

initSchema();

const DEFAULT_PASSWORD = 'password123';

// ---- helpers -------------------------------------------------------------

function findUserByEmail(email: string): { id: number } | undefined {
  return db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
}

function ensureMentor(email: string, fullName: string): number {
  const existing = findUserByEmail(email);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  const info = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'mentor');
  const id = Number(info.lastInsertRowid);
  db.prepare('INSERT INTO mentor_profiles (user_id, full_name) VALUES (?, ?)').run(id, fullName);
  return id;
}

function ensureCandidate(c: {
  email: string;
  fullName: string;
  skills: string[];
  careerGoals: string;
  preferredRoles: string[];
  photo?: string;
  cvText: string;
}): void {
  if (findUserByEmail(c.email)) {
    console.log(`  candidate exists, skipping: ${c.email}`);
    return;
  }
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  const info = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(c.email, hash, 'candidate');
  const id = Number(info.lastInsertRowid);
  db.prepare(
    `INSERT INTO candidate_profiles (user_id, full_name, skills, career_goals, preferred_roles, photo)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, c.fullName, JSON.stringify(c.skills), c.careerGoals, JSON.stringify(c.preferredRoles), c.photo ?? null);
  // A CV version so the matching agents have CV text to work with.
  const key = `seed_cv_${id}.txt`;
  db.prepare(
    `INSERT INTO cv_versions (candidate_id, filename, storage_key, format, version_label, content_text)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, 'cv.txt', key, 'txt', 'seed', c.cvText);
  console.log(`  + candidate added: ${c.fullName} (${c.email})`);
}

function ensureJob(mentorId: number, j: {
  title: string;
  company: string;
  logo?: string;
  description: string;
  skills: string[];
  location: string;
  url?: string;
}): void {
  const existing = db
    .prepare("SELECT id FROM jobs WHERE title = ? AND IFNULL(company_name, '') = ?")
    .get(j.title, j.company);
  if (existing) {
    console.log(`  job exists, skipping: ${j.title} @ ${j.company}`);
    return;
  }
  db.prepare(
    `INSERT INTO jobs (created_by, title, description, required_skills, location, url, company_name, company_logo, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`
  ).run(
    mentorId,
    j.title,
    j.description,
    JSON.stringify(j.skills),
    j.location,
    j.url ?? null,
    j.company,
    j.logo ?? null
  );
  console.log(`  + job added: ${j.title} @ ${j.company}`);
}

// ---- data ----------------------------------------------------------------

// Public, stable logo images (Wikimedia). Used only as sample company photos.
const LOGO = {
  google: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
  amazon: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
  meta: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
  spotify: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  netflix: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
};

const jobs = [
  {
    title: 'Backend Engineer', company: 'Google', logo: LOGO.google, location: 'Remote',
    url: 'https://careers.google.com',
    description: 'Design and build scalable backend services and APIs.',
    skills: ['python', 'django', 'sql', 'docker', 'kubernetes'],
  },
  {
    title: 'Frontend Engineer', company: 'Meta', logo: LOGO.meta, location: 'Hybrid',
    url: 'https://www.metacareers.com',
    description: 'Build fast, accessible user interfaces with React and TypeScript.',
    skills: ['javascript', 'typescript', 'react', 'html', 'css'],
  },
  {
    title: 'Data Scientist', company: 'Netflix', logo: LOGO.netflix, location: 'Onsite',
    url: 'https://jobs.netflix.com',
    description: 'Build recommendation models and analyze large datasets.',
    skills: ['python', 'sql', 'machine learning', 'statistics', 'pandas'],
  },
  {
    title: 'DevOps Engineer', company: 'Amazon', logo: LOGO.amazon, location: 'Remote',
    url: 'https://www.amazon.jobs',
    description: 'Own CI/CD pipelines and cloud infrastructure at scale.',
    skills: ['aws', 'docker', 'kubernetes', 'linux', 'terraform'],
  },
  {
    title: 'Mobile Developer', company: 'Spotify', logo: LOGO.spotify, location: 'Hybrid',
    url: 'https://www.lifeatspotify.com',
    description: 'Develop and maintain the mobile app for millions of users.',
    skills: ['kotlin', 'swift', 'java', 'rest', 'git'],
  },
  {
    title: 'Full-Stack Developer', company: 'Google', logo: LOGO.google, location: 'Remote',
    description: 'Work across the stack from database to UI.',
    skills: ['javascript', 'node', 'react', 'sql', 'docker'],
  },
];

const candidates = [
  {
    email: 'sara.backend@example.com', fullName: 'Sara Khaled',
    skills: ['python', 'django', 'sql', 'docker'], careerGoals: 'Senior backend engineer',
    preferredRoles: ['backend', 'api'],
    cvText: 'Backend engineer with 4 years building Python and Django REST APIs. Experience with SQL, Docker, and CI/CD pipelines. Led migration to microservices.',
  },
  {
    email: 'omar.frontend@example.com', fullName: 'Omar Nasser',
    skills: ['javascript', 'typescript', 'react', 'css', 'html'], careerGoals: 'Frontend engineer at a product company',
    preferredRoles: ['frontend'],
    cvText: 'Frontend developer specializing in React and TypeScript. Built accessible, responsive UIs with modern CSS. 3 years experience shipping web apps.',
  },
  {
    email: 'lina.data@example.com', fullName: 'Lina Farah',
    skills: ['python', 'machine learning', 'sql', 'pandas', 'statistics'], careerGoals: 'Data scientist',
    preferredRoles: ['data', 'ml'],
    cvText: 'Data scientist with strong statistics background. Built ML models in Python with pandas and scikit-learn. Experience querying large datasets in SQL.',
  },
  {
    email: 'karim.devops@example.com', fullName: 'Karim Aziz',
    skills: ['aws', 'docker', 'kubernetes', 'linux', 'terraform'], careerGoals: 'Cloud/DevOps engineer',
    preferredRoles: ['devops', 'cloud'],
    cvText: 'DevOps engineer running production workloads on AWS with Kubernetes and Docker. Automated infrastructure with Terraform. Strong Linux administration.',
  },
  {
    email: 'noor.fullstack@example.com', fullName: 'Noor Salem',
    skills: ['javascript', 'node', 'react', 'sql'], careerGoals: 'Full-stack developer',
    preferredRoles: ['fullstack', 'frontend', 'backend'],
    cvText: 'Full-stack developer comfortable across Node.js, React, and SQL databases. Built end-to-end features and REST APIs. 2 years experience.',
  },
  {
    email: 'yousef.mobile@example.com', fullName: 'Yousef Rami',
    skills: ['kotlin', 'java', 'swift', 'git'], careerGoals: 'Mobile developer',
    preferredRoles: ['mobile'],
    cvText: 'Mobile developer building Android apps in Kotlin and Java, plus iOS in Swift. Familiar with REST APIs and Git workflows.',
  },
];

// ---- run -----------------------------------------------------------------

console.log('Seeding sample data (existing records are preserved)...');

const mentorId = ensureMentor('mentor.seed@example.com', 'Seed Mentor');
console.log('Jobs:');
for (const j of jobs) ensureJob(mentorId, j);
console.log('Candidates (default password for all seeded accounts: password123):');
for (const c of candidates) ensureCandidate(c);

console.log('Done.');
