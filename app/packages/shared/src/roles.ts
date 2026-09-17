/** The three platform roles. A user is assigned exactly one (Req 1.1). */
export enum UserRole {
  Candidate = 'candidate',
  Mentor = 'mentor',
  Admin = 'admin',
}

export const ALL_ROLES: readonly UserRole[] = [
  UserRole.Candidate,
  UserRole.Mentor,
  UserRole.Admin,
];
