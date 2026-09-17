import { Agent, uniqueSkills } from './base';
import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

const BEHAVIORAL = [
  'Tell me about a challenging project and how you handled it.',
  'Describe a time you disagreed with a teammate. How did you resolve it?',
  'How do you prioritize work when everything feels urgent?',
  'Tell me about a time you failed and what you learned.',
];

function technicalQuestionsFor(skill: string): string[] {
  return [
    `What are common pitfalls when working with ${skill}?`,
    `Explain a project where you used ${skill} and the trade-offs you made.`,
  ];
}

// Interview Agent: generates tailored questions and gives feedback on answers
// (Req 10.1, 10.2).
export const interviewAgent: Agent = {
  name: 'InterviewAgent',
  description: 'Generates interview questions and provides feedback on answers.',

  async run(input: AgentInput, _auth: AuthContext, _provider: AiProvider): Promise<AgentOutput> {
    const profile = input.candidateProfile || {};
    const skills = uniqueSkills(profile.skills || []).slice(0, 3);

    // Mode A: feedback on a submitted answer.
    if (input.answer && input.question) {
      const answer = input.answer.trim();
      const words = answer.split(/\s+/).filter(Boolean).length;
      const feedbackPoints: string[] = [];
      if (words < 30) feedbackPoints.push('Answer is quite short; add concrete detail and an example.');
      if (!/\bi\b|\bwe\b/i.test(answer)) feedbackPoints.push('Clarify your personal role using "I" statements.');
      if (!/because|so that|result|impact|led to/i.test(answer)) {
        feedbackPoints.push('Explain the outcome/impact of your actions.');
      }
      if (feedbackPoints.length === 0) feedbackPoints.push('Solid, structured answer with clear detail and outcome.');

      return {
        agent: 'InterviewAgent',
        kind: 'interview_feedback',
        findings: { question: input.question, feedback: feedbackPoints, approxWordCount: words },
        explanation: 'Provided structured feedback on the submitted interview answer.',
        isAiGenerated: true,
        confidence: 0.7,
      };
    }

    // Mode B: generate questions.
    const technical = skills.flatMap(technicalQuestionsFor);
    if (technical.length === 0) {
      technical.push('Walk me through a technical problem you solved recently.');
    }

    return {
      agent: 'InterviewAgent',
      kind: 'interview_questions',
      findings: {
        technicalQuestions: technical,
        behavioralQuestions: BEHAVIORAL,
        basedOnSkills: skills,
      },
      explanation: `Generated ${technical.length} technical and ${BEHAVIORAL.length} behavioral question(s).`,
      isAiGenerated: true,
      confidence: 0.7,
    };
  },
};
