import { HttpError } from './util';
import { AuthUser, Role } from './types';

// Central permission matrix, mirroring the PRD role table.
// Enforced on the server; the frontend only mirrors it for UX.
export type Operation =
  | 'profile:read_own'
  | 'profile:edit_own'
  | 'cv:upload'
  | 'cv:read_own'
  | 'cv:read_any'
  | 'candidate:read_any'
  | 'job:view'
  | 'job:create'
  | 'job:manage_own'
  | 'application:create'
  | 'application:read_own'
  | 'ai:candidate_assist'
  | 'ai:cv_review';

const MATRIX: Record<Operation, Role[]> = {
  'profile:read_own': ['candidate', 'mentor', 'admin'],
  'profile:edit_own': ['candidate', 'mentor', 'admin'],
  'cv:upload': ['candidate'],
  'cv:read_own': ['candidate'],
  'cv:read_any': ['admin'],
  'candidate:read_any': ['admin'],
  'job:view': ['candidate', 'mentor', 'admin'],
  'job:create': ['mentor', 'admin'],
  'job:manage_own': ['mentor', 'admin'],
  'application:create': ['candidate'],
  'application:read_own': ['candidate'],
  'ai:candidate_assist': ['candidate'],
  'ai:cv_review': ['admin'],
};

export function can(role: Role, op: Operation): boolean {
  return MATRIX[op].includes(role);
}

export function authorize(user: AuthUser, op: Operation): void {
  if (!can(user.role, op)) {
    throw new HttpError(403, 'You are not authorized to perform this action');
  }
}

// Ownership check: a candidate may only touch their own resource.
// Admins may access any candidate resource.
export function assertOwnershipOrAdmin(user: AuthUser, ownerId: number): void {
  if (user.role === 'admin') return;
  if (user.id !== ownerId) {
    throw new HttpError(403, 'You cannot access another user\'s resources');
  }
}
