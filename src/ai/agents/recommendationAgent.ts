import { Agent } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

// Recommendation Agent: combines the outputs of other agents (passed via
// input.params.priorFindings) into a single prioritized list of next actions.
export const recommendationAgent: Agent = {
  name: 'RecommendationAgent',
  description: 'Combines agent findings into prioritized, personalized next actions.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const prior = (input.params?.priorFindings as Record<string, any>) || {};
    const actions: Array<{ priority: number; action: string; source: string }> = [];

    // From CV analysis.
    const cv = prior.CvAnalysisAgent;
    if (cv?.suggestedImprovements?.length) {
      for (const imp of cv.suggestedImprovements.slice(0, 3)) {
        actions.push({ priority: 2, action: imp, source: 'CvAnalysisAgent' });
      }
    }

    // From job matching.
    const match = prior.JobMatchingAgent;
    if (match?.topMatch) {
      actions.push({
        priority: 1,
        action: `Apply to your top job match: "${match.topMatch.title}" (${match.topMatch.matchScore}% match)`,
        source: 'JobMatchingAgent',
      });
    }

    // From career coaching.
    const coach = prior.CareerCoachAgent;
    if (coach?.prioritizedSkillGaps?.length) {
      actions.push({
        priority: 2,
        action: `Close top skill gap: learn ${coach.prioritizedSkillGaps[0].skill}`,
        source: 'CareerCoachAgent',
      });
    }
    if (coach?.suggestedNextSteps?.length) {
      actions.push({ priority: 3, action: coach.suggestedNextSteps[0], source: 'CareerCoachAgent' });
    }

    if (actions.length === 0) {
      actions.push({ priority: 1, action: 'Complete your profile and upload a CV to unlock recommendations', source: 'RecommendationAgent' });
    }

    const prioritized = actions.sort((a, b) => a.priority - b.priority);

    return {
      agent: 'RecommendationAgent',
      kind: 'recommendations',
      findings: { prioritizedActions: prioritized },
      explanation: `Combined findings into ${prioritized.length} prioritized next action(s).`,
      isAiGenerated: true,
      confidence: 0.8,
    };
  },
};
