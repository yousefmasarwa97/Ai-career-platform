import { Agent, uniqueSkills } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';
import { computeMatch } from './matchScoring';

// Agent 1 — "Job matching for candidate".
// Rates every available job out of 10 against the candidate's CV/profile,
// orders them most-matching -> least, and provides a per-job explanation of
// why each rating was given.
export const jobMatchScoreAgent: Agent = {
  name: 'JobMatchScoreAgent',
  description: 'Rates each job out of 10 for a candidate and explains the rating.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const profile = input.candidateProfile || {};
    const candidateSkills = uniqueSkills(profile.skills || []);
    const jobs = Array.isArray(input.jobs) ? input.jobs : [];

    const rated = jobs
      .map((job: any) => {
        const m = computeMatch({
          candidateSkills,
          candidateGoals: profile.career_goals,
          candidatePreferredRoles: profile.preferred_roles || [],
          cvText: input.cvContent,
          jobTitle: job.title,
          jobRequiredSkills: job.required_skills || [],
          jobDescription: job.description,
        });
        return {
          ...job,
          rating: m.score, // out of 10
          matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills,
          reasons: m.reasons,
          explanation: m.explanation,
        };
      })
      // Order from the most matching to the least (as specified).
      .sort((a, b) => b.rating - a.rating);

    return {
      agent: 'JobMatchScoreAgent',
      kind: 'rated_jobs',
      findings: { ratedJobs: rated, count: rated.length },
      explanation: rated.length
        ? `Rated and ordered ${rated.length} job(s); top rating ${rated[0].rating}/10 for "${rated[0].title}".`
        : 'No jobs available to rate.',
      isAiGenerated: true,
      confidence: candidateSkills.length ? 0.75 : 0.4,
    };
  },
};
