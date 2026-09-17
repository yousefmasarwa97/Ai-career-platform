import { Router } from 'express';
import { authenticate } from '../middleware';
import { authorize } from '../rbac';
import { sendError, HttpError } from '../util';
import { Orchestrator } from '../ai/orchestrator';
import { getCandidateProfile } from '../services/profile';
import { listCvVersions, getCvContent } from '../services/cv';
import { listPublishedJobs } from '../services/jobs';
import { listCandidateApplications } from '../services/applications';
import { saveAiOutput, saveFeedback } from '../services/ai';
import { AgentInput, AuthContext } from '../types';

export const aiRouter = Router();
aiRouter.use(authenticate);

// Assemble the candidate's own AI input (profile + latest CV + jobs).
function buildCandidateInput(candidateId: number, task: string, extra?: Partial<AgentInput>): AgentInput {
  const profile = getCandidateProfile(candidateId);
  const cvs = listCvVersions(candidateId);
  const cvContent = cvs.length ? getCvContent(cvs[0].id) : '';
  const jobs = listPublishedJobs();
  return { task, candidateProfile: profile, cvContent, jobs, ...extra };
}

// Candidate AI assistance (profile/CV analysis, job match, coaching, recommendations).
aiRouter.post('/assist', async (req, res) => {
  try {
    authorize(req.user!, 'ai:candidate_assist');
    const auth: AuthContext = { userId: req.user!.id, role: req.user!.role, targetCandidateId: req.user!.id };
    const input = buildCandidateInput(req.user!.id, 'candidate_assist');
    const result = await Orchestrator.run('candidate_assist', input, auth);
    const outputId = saveAiOutput(req.user!.id, 'candidate_assist', result);
    res.json({ aiOutputId: outputId, ...result });
  } catch (err) {
    sendError(res, err);
  }
});

// Agent 1: rate & order every job for this candidate (out of 10 with reasons).
aiRouter.get('/rated-jobs', async (req, res) => {
  try {
    authorize(req.user!, 'ai:candidate_assist');
    const auth: AuthContext = { userId: req.user!.id, role: req.user!.role, targetCandidateId: req.user!.id };
    const input = buildCandidateInput(req.user!.id, 'rate_jobs');
    const result = await Orchestrator.run('rate_jobs', input, auth);
    const findings = result.outputs.find((o) => o.agent === 'JobMatchScoreAgent')?.findings as any;
    res.json({ ratedJobs: findings?.ratedJobs || [], isAiGenerated: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Agent 1 (detail): rating + explanation for one job for this candidate.
aiRouter.get('/rated-jobs/:jobId', async (req, res) => {
  try {
    authorize(req.user!, 'ai:candidate_assist');
    const auth: AuthContext = { userId: req.user!.id, role: req.user!.role, targetCandidateId: req.user!.id };
    const input = buildCandidateInput(req.user!.id, 'rate_jobs');
    const result = await Orchestrator.run('rate_jobs', input, auth);
    const findings = result.outputs.find((o) => o.agent === 'JobMatchScoreAgent')?.findings as any;
    const jobId = parseInt(req.params.jobId, 10);
    const job = (findings?.ratedJobs || []).find((j: any) => j.id === jobId);
    if (!job) throw new HttpError(404, 'Job not found or not available');
    res.json({ job, isAiGenerated: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Interview preparation: generate questions, or give feedback on an answer.
aiRouter.post('/interview', async (req, res) => {
  try {
    authorize(req.user!, 'ai:candidate_assist');
    const auth: AuthContext = { userId: req.user!.id, role: req.user!.role, targetCandidateId: req.user!.id };
    const input = buildCandidateInput(req.user!.id, 'interview_prep', {
      question: req.body?.question,
      answer: req.body?.answer,
    });
    const result = await Orchestrator.run('interview_prep', input, auth);
    const outputId = saveAiOutput(req.user!.id, 'interview_prep', result);
    res.json({ aiOutputId: outputId, ...result });
  } catch (err) {
    sendError(res, err);
  }
});

// Feedback on any AI output (Req 14).
aiRouter.post('/feedback', (req, res) => {
  try {
    const { aiOutputId, rating, comment } = req.body || {};
    if (rating != null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      throw new HttpError(400, 'rating must be a number between 1 and 5');
    }
    const id = saveFeedback(req.user!.id, aiOutputId ?? null, rating ?? null, comment ?? null);
    res.status(201).json({ feedbackId: id });
  } catch (err) {
    sendError(res, err);
  }
});

// Candidate dashboard aggregation (Req 13).
aiRouter.get('/dashboard', async (req, res) => {
  try {
    if (req.user!.role !== 'candidate') {
      throw new HttpError(403, 'The dashboard is available to candidates');
    }
    const profile = getCandidateProfile(req.user!.id);
    const cvs = listCvVersions(req.user!.id);
    const applications = listCandidateApplications(req.user!.id);

    const auth: AuthContext = { userId: req.user!.id, role: req.user!.role, targetCandidateId: req.user!.id };
    const input = buildCandidateInput(req.user!.id, 'candidate_assist');
    const ai = await Orchestrator.run('candidate_assist', input, auth);

    const profileComplete =
      !!profile.full_name && (profile.skills || []).length > 0 && !!profile.career_goals;

    res.json({
      profileStatus: {
        complete: profileComplete,
        skills: (profile.skills || []).length,
        cvVersions: cvs.length,
        cvLimit: 5,
      },
      recommendedJobs:
        (ai.outputs.find((o) => o.agent === 'JobMatchingAgent')?.findings as any)?.rankedJobs?.slice(0, 5) || [],
      careerInsights: ai.outputs.find((o) => o.agent === 'CareerCoachAgent')?.findings || {},
      recommendedActions:
        (ai.outputs.find((o) => o.agent === 'RecommendationAgent')?.findings as any)?.prioritizedActions || [],
      applications,
      aiSummary: ai.summary,
      isAiGenerated: true,
    });
  } catch (err) {
    sendError(res, err);
  }
});
