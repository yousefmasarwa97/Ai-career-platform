import { Agent, skillOverlap, uniqueSkills } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

// Career Coach Agent: identifies skill gaps and suggests career next steps
// and learning opportunities (Req 9.3).
export const careerCoachAgent: Agent = {
  name: 'CareerCoachAgent',
  description: 'Identifies skill gaps and recommends career next steps and learning.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const profile = input.candidateProfile || {};
    const candidateSkills = uniqueSkills(profile.skills || []);
    const jobs = Array.isArray(input.jobs) ? input.jobs : [];

    // Aggregate the most frequently required skills the candidate lacks.
    const gapCount: Record<string, number> = {};
    for (const job of jobs) {
      const { missing } = skillOverlap(candidateSkills, job.required_skills || []);
      for (const skill of missing) gapCount[skill] = (gapCount[skill] || 0) + 1;
    }
    const prioritizedGaps = Object.entries(gapCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, demand]) => ({ skill, demandAcrossJobs: demand }));

    const nextSteps: string[] = [];
    if (prioritizedGaps.length) {
      nextSteps.push(`Focus on learning: ${prioritizedGaps.map((g) => g.skill).join(', ')}`);
    }
    if (!profile.career_goals) nextSteps.push('Define clear career goals to sharpen recommendations');
    if ((profile.projects || []).length === 0) nextSteps.push('Build a portfolio project to demonstrate skills');
    if (candidateSkills.length < 5) nextSteps.push('Expand and document your technical skill set');

    return {
      agent: 'CareerCoachAgent',
      kind: 'career_coaching',
      findings: {
        prioritizedSkillGaps: prioritizedGaps,
        suggestedNextSteps: nextSteps,
        suggestedLearning: prioritizedGaps.map((g) => `Take a focused course or build a project using ${g.skill}`),
      },
      explanation: prioritizedGaps.length
        ? `Identified ${prioritizedGaps.length} priority skill gap(s) based on available jobs.`
        : 'No clear skill gaps detected against available jobs; focus on depth and portfolio.',
      isAiGenerated: true,
      confidence: 0.65,
    };
  },
};
