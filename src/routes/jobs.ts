import { Router } from 'express';
import { authenticate } from '../middleware';
import { authorize } from '../rbac';
import { sendError } from '../util';
import * as jobService from '../services/jobs';
import * as applicationService from '../services/applications';

export const jobRouter = Router();
jobRouter.use(authenticate);

// List jobs (role-aware: candidates see published; admins see all).
jobRouter.get('/', (req, res) => {
  try {
    authorize(req.user!, 'job:view');
    res.json(jobService.listJobsForUser(req.user!));
  } catch (err) {
    sendError(res, err);
  }
});

// Create a job (mentor or admin).
jobRouter.post('/', (req, res) => {
  try {
    authorize(req.user!, 'job:create');
    res.status(201).json(jobService.createJob(req.user!, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

// Update a job you created (mentor) or any (admin).
jobRouter.put('/:id', (req, res) => {
  try {
    authorize(req.user!, 'job:manage_own');
    res.json(jobService.updateOwnJob(req.user!, parseInt(req.params.id, 10), req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
});

// Apply to a job (candidate only).
jobRouter.post('/:id/apply', (req, res) => {
  try {
    authorize(req.user!, 'application:create');
    const app = applicationService.applyToJob(req.user!.id, parseInt(req.params.id, 10));
    res.status(201).json(app);
  } catch (err) {
    sendError(res, err);
  }
});

// List own applications (candidate).
jobRouter.get('/applications/mine', (req, res) => {
  try {
    authorize(req.user!, 'application:read_own');
    res.json(applicationService.listCandidateApplications(req.user!.id));
  } catch (err) {
    sendError(res, err);
  }
});
