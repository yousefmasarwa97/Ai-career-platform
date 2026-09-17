import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './services/auth';
import { HttpError, sendError } from './util';
import { AuthUser, Role } from './types';

// Augment Express Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Authentication guard: denies all protected resources when unauthenticated (Req 1.4).
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'Authentication required');
    }
    req.user = verifyToken(token);
    next();
  } catch (err) {
    sendError(res, err);
  }
}

// Role guard: enforces role-based authorization server-side (Req 2.1, 2.5).
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      if (!roles.includes(req.user.role)) {
        throw new HttpError(403, 'You are not authorized to perform this action');
      }
      next();
    } catch (err) {
      sendError(res, err);
    }
  };
}
