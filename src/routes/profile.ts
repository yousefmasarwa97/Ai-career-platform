import { Router } from 'express';
import { authenticate } from '../middleware';
import { authorize } from '../rbac';
import { sendError, HttpError } from '../util';
import * as profileService from '../services/profile';

export const profileRouter = Router();
profileRouter.use(authenticate);

// Get own profile (candidate or mentor).
profileRouter.get('/me', (req, res) => {
  try {
    authorize(req.user!, 'profile:read_own');
    if (req.user!.role === 'candidate') {
      res.json(profileService.getCandidateProfile(req.user!.id));
    } else if (req.user!.role === 'mentor') {
      res.json(profileService.getMentorProfile(req.user!.id));
    } else {
      res.json({ id: req.user!.id, email: req.user!.email, role: 'admin' });
    }
  } catch (err) {
    sendError(res, err);
  }
});

// Update own profile.
profileRouter.put('/me', (req, res) => {
  try {
    authorize(req.user!, 'profile:edit_own');
    if (req.user!.role === 'candidate') {
      res.json(profileService.updateCandidateProfile(req.user!.id, req.body || {}));
    } else if (req.user!.role === 'mentor') {
      res.json(profileService.updateMentorProfile(req.user!.id, req.body || {}));
    } else {
      throw new HttpError(400, 'Admins do not have an editable candidate/mentor profile here');
    }
  } catch (err) {
    sendError(res, err);
  }
});
