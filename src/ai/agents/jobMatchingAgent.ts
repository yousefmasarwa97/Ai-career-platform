import { Agent, skillOverlap, uniqueSkills } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

// Job Matching Agent: ranks available jobs against the candidate profile and
// explains each match (Req 9.1, 9.2).
export const jobMatchingAgent: Agent = {
  name: 'JobMatchingAgent',
  description: 'Compares the candidate profile against available jobs and ranks matches.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const profile = input.candidateProfile || {};
    const candidateSkills = uniqueSkills([
      ...(profile.skills || []),
      ...(profile.preferred_roles || []),
    ]);
    const jobs = Array.isArray(input.jobs) ? input.jobs : [];

    const ranked = jobs
      .map((job: any) => {
        const { ratio, matched, missing } = skillOverlap(candidateSkills, job.required_skills || []);
        const scorePct = Math.round(ratio * 100);
        return {
          jobId: job.id,
          title: job.title,
          location: job.location ?? null,
          matchScore: scorePct,
          matchedSkills: matched,
          missingSkills: missing,
          explanation:
            (job.required_skills || []).length === 0
              ? 'No required skills listed on this job; ranked as a general match.'
              : `Your profile matches ${matched.length} of ${(job.required_skills || []).length} required skills (${scorePct}%).`,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      agent: 'JobMatchingAgent',
      kind: 'job_matching',
      findings: { rankedJobs: ranked, topMatch: ranked[0] || null, candidateSkills },
      explanation: ranked.length
        ? `Ranked ${ranked.length} job(s); top match "${ranked[0].title}" at ${ranked[0].matchScore}%.`
        : 'No jobs were available to match against.',
      isAiGenerated: true,
      confidence: candidateSkills.length ? 0.7 : 0.4,
    };
  },
};
