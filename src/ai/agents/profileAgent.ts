import { Agent, tokenize, uniqueSkills } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

// Candidate Profile Agent: turns raw profile + CV data into a clean,
// structured representation for the other agents to consume.
export const profileAgent: Agent = {
  name: 'ProfileAgent',
  description: 'Extracts and normalizes candidate skills, experience, and background.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const profile = input.candidateProfile || {};
    const declaredSkills: string[] = uniqueSkills(profile.skills || []);

    // Enrich skills with tokens found in the CV text.
    const cvTokens = input.cvContent ? tokenize(input.cvContent) : [];
    const cvSkillHints = cvTokens.filter((t) => declaredSkills.includes(t));

    const experienceCount = Array.isArray(profile.experience) ? profile.experience.length : 0;
    const educationCount = Array.isArray(profile.education) ? profile.education.length : 0;

    const structured = {
      fullName: profile.full_name || null,
      skills: declaredSkills,
      skillsFoundInCv: Array.from(new Set(cvSkillHints)),
      experienceEntries: experienceCount,
      educationEntries: educationCount,
      careerGoals: profile.career_goals || null,
      preferredRoles: profile.preferred_roles || [],
    };

    return {
      agent: 'ProfileAgent',
      kind: 'profile_structuring',
      findings: structured,
      explanation:
        `Normalized the candidate profile into ${declaredSkills.length} skill(s), ` +
        `${experienceCount} experience entr(ies), and ${educationCount} education entr(ies).`,
      isAiGenerated: true,
      confidence: declaredSkills.length > 0 ? 0.9 : 0.5,
    };
  },
};
