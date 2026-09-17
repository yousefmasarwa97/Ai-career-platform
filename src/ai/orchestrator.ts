import { AgentInput, AgentOutput, AuthContext, OrchestratorResult } from '../types';
import { getAiProvider } from './provider';
import { Agent } from './agents/base';
import { profileAgent } from './agents/profileAgent';
import { cvAnalysisAgent } from './agents/cvAnalysisAgent';
import { jobMatchingAgent } from './agents/jobMatchingAgent';
import { careerCoachAgent } from './agents/careerCoachAgent';
import { interviewAgent } from './agents/interviewAgent';
import { recommendationAgent } from './agents/recommendationAgent';
import { jobMatchScoreAgent } from './agents/jobMatchScoreAgent';
import { candidateMatchAgent } from './agents/candidateMatchAgent';
import { HttpError } from '../util';

// Registry of specialized agents.
const AGENTS: Record<string, Agent> = {
  ProfileAgent: profileAgent,
  CvAnalysisAgent: cvAnalysisAgent,
  JobMatchingAgent: jobMatchingAgent,
  CareerCoachAgent: careerCoachAgent,
  InterviewAgent: interviewAgent,
  RecommendationAgent: recommendationAgent,
  JobMatchScoreAgent: jobMatchScoreAgent,
  CandidateMatchAgent: candidateMatchAgent,
};

// Which agents to run for a given task. The Orchestrator selects agents,
// runs them (feeding earlier findings to the RecommendationAgent), merges
// outputs, attaches provenance, and detects conflicts.
const TASK_PLANS: Record<string, string[]> = {
  candidate_assist: ['ProfileAgent', 'CvAnalysisAgent', 'JobMatchingAgent', 'CareerCoachAgent', 'RecommendationAgent'],
  cv_review: ['CvAnalysisAgent', 'JobMatchingAgent', 'RecommendationAgent'],
  interview_prep: ['ProfileAgent', 'InterviewAgent'],
  job_match: ['ProfileAgent', 'JobMatchingAgent'],
  // Agent 1: rate & order all jobs for the candidate.
  rate_jobs: ['JobMatchScoreAgent'],
  // Agent 2: rank candidates for a job (admin side).
  match_candidates: ['CandidateMatchAgent'],
};

export class Orchestrator {
  // Enforces the caller's authorization context on every invocation (Req 12.2).
  static assertAuthorized(auth: AuthContext): void {
    // Candidates may only operate on their own data.
    if (auth.role === 'candidate' && auth.targetCandidateId && auth.targetCandidateId !== auth.userId) {
      throw new HttpError(403, 'Agents cannot access another candidate\'s data');
    }
    // Mentors are not authorized to run candidate-data AI in this MVP.
    if (auth.role === 'mentor') {
      throw new HttpError(403, 'Career Mentors do not have AI access in this scope');
    }
  }

  static async run(task: string, input: AgentInput, auth: AuthContext): Promise<OrchestratorResult> {
    Orchestrator.assertAuthorized(auth);

    const plan = TASK_PLANS[task];
    if (!plan) throw new HttpError(400, `Unknown AI task: ${task}`);

    const provider = getAiProvider();
    const outputs: AgentOutput[] = [];
    const priorFindings: Record<string, unknown> = {};

    for (const agentName of plan) {
      const agent = AGENTS[agentName];
      if (!agent) continue;
      // Feed accumulated findings to the recommendation agent.
      const agentInput: AgentInput =
        agentName === 'RecommendationAgent'
          ? { ...input, params: { ...(input.params || {}), priorFindings } }
          : input;
      const output = await agent.run(agentInput, auth, provider);
      outputs.push(output);
      priorFindings[agentName] = output.findings;
    }

    const conflicts = Orchestrator.detectConflicts(outputs);
    const summary = Orchestrator.summarize(task, outputs, provider.name);

    return {
      task,
      outputs,
      summary,
      conflicts: conflicts.length ? conflicts : undefined,
      isAiGenerated: true,
    };
  }

  // Simple conflict detection: flag when agents disagree on whether the
  // candidate is job-ready (high match vs. many skill gaps) (Req 12.3).
  private static detectConflicts(outputs: AgentOutput[]): string[] {
    const conflicts: string[] = [];
    const match = outputs.find((o) => o.agent === 'JobMatchingAgent')?.findings as any;
    const coach = outputs.find((o) => o.agent === 'CareerCoachAgent')?.findings as any;
    if (match?.topMatch?.matchScore >= 80 && (coach?.prioritizedSkillGaps?.length || 0) >= 4) {
      conflicts.push(
        'JobMatchingAgent reports a strong match while CareerCoachAgent reports several skill gaps. ' +
          'Presenting both; treat the match as a starting point and address the gaps.'
      );
    }
    return conflicts;
  }

  private static summarize(task: string, outputs: AgentOutput[], providerName: string): string {
    const agents = outputs.map((o) => o.agent).join(', ');
    return `[AI-generated via ${providerName}] Task "${task}" completed using: ${agents}.`;
  }
}
