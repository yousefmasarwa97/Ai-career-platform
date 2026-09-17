import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { config } from '../config';
import { HttpError, isValidEmail } from '../util';
import { AuthUser, Role } from '../types';

const VALID_ROLES: Role[] = ['candidate', 'mentor', 'admin'];

export function register(email: string, password: string, role: Role): AuthUser {
  if (!email || !isValidEmail(email)) throw new HttpError(400, 'A valid email is required');
  if (!password || password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }
  if (!VALID_ROLES.includes(role)) throw new HttpError(400, 'Invalid role');

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  // Passwords are hashed with bcrypt; plaintext is never stored (Req 1.5).
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email, hash, role);

  const id = Number(info.lastInsertRowid);

  // Create the matching profile row for the role.
  if (role === 'candidate') {
    db.prepare('INSERT INTO candidate_profiles (user_id) VALUES (?)').run(id);
  } else if (role === 'mentor') {
    db.prepare('INSERT INTO mentor_profiles (user_id) VALUES (?)').run(id);
  }

  return { id, email, role };
}

export function login(email: string, password: string): { token: string; user: AuthUser } {
  const row = db
    .prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?')
    .get(email) as
    | { id: number; email: string; password_hash: string; role: Role }
    | undefined;

  // Generic error regardless of which part is wrong (Req 1.3).
  const invalid = new HttpError(401, 'Invalid email or password');
  if (!row) throw invalid;
  if (!bcrypt.compareSync(password, row.password_hash)) throw invalid;

  const user: AuthUser = { id: row.id, email: row.email, role: row.role };
  const signOptions = { expiresIn: config.jwtExpiresIn } as jwt.SignOptions;
  const token = jwt.sign(user, config.jwtSecret, signOptions);
  return { token, user };
}

export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & AuthUser;
    return { id: decoded.id, email: decoded.email, role: decoded.role };
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}
