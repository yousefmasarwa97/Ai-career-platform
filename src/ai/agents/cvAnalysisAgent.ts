import { Agent, tokenize, uniqueSkills } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

// Signals a well-formed CV usually contains.
const EXPECTED_SECTIONS = ['experience', 'education', 'skills', 'project', 'contact', 'summary'];
const COMMON_TECH = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'sql', 'react',
  'node', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'html', 'css', 'linux',
];

// CV Analysis Agent: reads CV text and produces skills, strengths,
// missing/unclear info, and improvement suggestions.
export const cvAnalysisAgent: Agent = {
  name: 'CvAnalysisAgent',
  description: 'Analyzes a CV to identify skills, strengths, gaps, and improvements.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const text = (input.cvContent || '').toLowerCase();
    const tokens = new Set(tokenize(text));

    const detectedSkills = uniqueSkills(COMMON_TECH.filter((s) => text.includes(s)));
    const presentSections = EXPECTED_SECTIONS.filter((s) => text.includes(s));
    const missingSections = EXPECTED_SECTIONS.filter((s) => !text.includes(s));

    const strengths: string[] = [];
    if (detectedSkills.length >= 5) strengths.push('Broad technical skill coverage');
    if (text.includes('project')) strengths.push('Includes project experience');
    if (/\b\d{4}\b/.test(text)) strengths.push('Includes dated experience/timeline');

    const improvements: string[] = [];
    if (missingSections.includes('summary')) improvements.push('Add a concise professional summary at the top');
    if (missingSections.includes('skills')) improvements.push('Add an explicit skills section');
    if (!/\b\d+%|\b\d+\+/.test(text)) improvements.push('Quantify achievements with metrics (e.g., "improved X by 20%")');
    if (detectedSkills.length < 3) improvements.push('List more relevant technical skills');

    const findings = {
      detectedSkills,
      presentSections,
      missingInformation: missingSections,
      strengths,
      suggestedImprovements: improvements,
      wordCountApprox: tokens.size,
      hasContent: text.trim().length > 0,
    };

    return {
      agent: 'CvAnalysisAgent',
      kind: 'cv_analysis',
      findings,
      explanation: text.trim().length
        ? `Detected ${detectedSkills.length} skill(s); ${missingSections.length} section(s) appear missing.`
        : 'No readable CV text was available to analyze.',
      isAiGenerated: true,
      confidence: text.trim().length ? 0.75 : 0.3,
    };
  },
};
