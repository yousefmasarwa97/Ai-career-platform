import { Agent } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';
import { computeMatch } from './matchScoring';

// Agent 2 — "Candidate matching for jobs".
// For a given job, rates every candidate out of 10 (based on their CV/profile),
// orders them most-matching -> least, and returns the top 10 with a per-candidate
// explanation of why each rating was given.
//
// The list of candidates is provided via input.params.candidates, each shaped as:
//   { userId, fullName, photo, skills, careerGoals, preferredRoles, cvText }
export const candidateMatchAgent: Agent = {
  name: 'CandidateMatchAgent',
  description: 'Ranks candidates for a job (top 10) and explains each rating.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const candidates = (input.params?.candidates as any[]) || [];
    const job = (input.params?.job as any) || {};

    const rated = candidates
      .map((c) => {
        const m = computeMatch({
          candidateSkills: c.skills || [],
          candidateGoals: c.careerGoals,
          candidatePreferredRoles: c.preferredRoles || [],
          cvText: c.cvText,
          jobTitle: job.title,
          jobRequiredSkills: job.required_skills || [],
          jobDescription: job.description,
        });
        return {
          userId: c.userId,
          fullName: c.fullName || null,
          photo: c.photo || null,
          rating: m.score, // out of 10
          matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills,
          reasons: m.reasons,
          explanation: m.explanation,
        };
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10); // top 10 only

    return {
      agent: 'CandidateMatchAgent',
      kind: 'top_candidates',
      findings: { topCandidates: rated, jobTitle: job.title, evaluated: candidates.length },
      explanation: rated.length
        ? `Ranked ${candidates.length} candidate(s); returning top ${rated.length} for "${job.title}".`
        : 'No candidates available to rank.',
      isAiGenerated: true,
      confidence: 0.7,
    };
  },
};
