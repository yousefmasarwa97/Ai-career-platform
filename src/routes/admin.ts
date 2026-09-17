import { Router } from 'express';
import { authenticate } from '../middleware';
import { authorize } from '../rbac';
import { sendError, HttpError } from '../util';
import { logAccess } from '../db';
import { listAllCandidates, getCandidateProfile, listCandidatesWithProfiles } from '../services/profile';
import { listCvVersions, getCvContent, getCvVersion } from '../services/cv';
import { listPublishedJobs, getJob } from '../services/jobs';
import { Orchestrator } from '../ai/orchestrator';
import { saveAiReview } from '../services/ai';
import { AgentInput, AuthContext } from '../types';

export const adminRouter = Router();
adminRouter.use(authenticate);

// All admin endpoints require the admin role.
adminRouter.use((req, res, next) => {
  try {
    authorize(req.user!, 'candidate:read_any');
    next();
  } catch (err) {
    sendError(res, err);
  }
});

// List all candidates.
adminRouter.get('/candidates', (req, res) => {
  try {
    logAccess(req.user!.id, 'list_candidates', 'candidate');
    res.json(listAllCandidates());
  } catch (err) {
    sendError(res, err);
  }
});

// View a candidate profile + CV versions.
adminRouter.get('/candidates/:id', (req, res) => {
  try {
    const candidateId = parseInt(req.params.id, 10);
    logAccess(req.user!.id, 'view_candidate', 'candidate', candidateId);
    res.json({
      profile: getCandidateProfile(candidateId),
      cvVersions: listCvVersions(candidateId),
    });
  } catch (err) {
    sendError(res, err);
  }
});

// Agent 2: for a given job, return the top-10 matching candidates
// (name, photo, rating /10, and why). Admin only.
adminRouter.get('/jobs/:jobId/candidates', async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const job = getJob(jobId);
    logAccess(req.user!.id, 'match_candidates', 'job', jobId);

    // Gather every candidate's profile + latest CV text for matching.
    const profiles = listCandidatesWithProfiles();
    const candidates = profiles.map((p) => {
      const cvs = listCvVersions(p.user_id);
      const cvText = cvs.length ? getCvContent(cvs[0].id) : '';
      return {
        userId: p.user_id,
        fullName: p.full_name,
        photo: p.photo,
        skills: p.skills,
        careerGoals: p.career_goals,
        preferredRoles: p.preferred_roles,
        cvText,
      };
    });

    const auth: AuthContext = { userId: req.user!.id, role: 'admin' };
    const input: AgentInput = { task: 'match_candidates', params: { job, candidates } };
    const result = await Orchestrator.run('match_candidates', input, auth);
    const findings = result.outputs.find((o) => o.agent === 'CandidateMatchAgent')?.findings as any;

    res.json({
      jobId,
      jobTitle: job.title,
      topCandidates: findings?.topCandidates || [],
      isAiGenerated: true,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// Admin-requested AI CV review (Req 11). Admin only; decision support only.
adminRouter.post('/candidates/:candidateId/cv/:cvId/review', async (req, res) => {
  try {
    authorize(req.user!, 'ai:cv_review'); // admin-only; non-admins denied
    const candidateId = parseInt(req.params.candidateId, 10);
    const cvId = parseInt(req.params.cvId, 10);

    // Ensure the CV belongs to the stated candidate.
    const cv = getCvVersion(cvId);
    if (cv.candidate_id !== candidateId) {
      throw new HttpError(400, 'CV version does not belong to the specified candidate');
    }

    logAccess(req.user!.id, 'ai_cv_review', 'cv_version', cvId);

    const profile = getCandidateProfile(candidateId);
    const cvContent = getCvContent(cvId);
    const jobs = listPublishedJobs();

    // Admin acts on the candidate's data; auth context reflects that.
    const auth: AuthContext = { userId: req.user!.id, role: 'admin', targetCandidateId: candidateId };
    const input: AgentInput = { task: 'cv_review', candidateProfile: profile, cvContent, jobs };
    const result = await Orchestrator.run('cv_review', input, auth);

    const reviewId = saveAiReview(candidateId, cvId, req.user!.id, result);

    res.json({
      reviewId,
      candidateId,
      cvVersionId: cvId,
      // Explicitly labeled as AI-generated decision support (Req 11.2, 11.3).
      disclaimer:
        'This is an AI-generated review intended as decision support only. It is not a hiring decision and must be reviewed by a human.',
      ...result,
    });
  } catch (err) {
    sendError(res, err);
  }
});
