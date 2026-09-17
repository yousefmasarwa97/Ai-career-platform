import { skillOverlap, tokenize, uniqueSkills } from './base';

// Shared match-scoring core used by both new agents:
//  - JobMatchScoreAgent  (candidate side: rate each job for a candidate)
//  - CandidateMatchAgent (admin side: rate each candidate for a job)
//
// Produces a score out of 10 plus a human-readable, evidence-based explanation
// of WHY that score was given (as required by "The two basic agents").

export interface MatchInput {
  candidateSkills: string[];
  candidateGoals?: string | null;
  candidatePreferredRoles?: string[];
  cvText?: string;
  jobTitle: string;
  jobRequiredSkills: string[];
  jobDescription?: string | null;
}

export interface MatchResult {
  score: number; // 0..10
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[]; // bullet points explaining the score
  explanation: string; // one-paragraph summary
}

export function computeMatch(input: MatchInput): MatchResult {
  const candidateSkills = uniqueSkills([
    ...(input.candidateSkills || []),
    // Skills mentioned in the CV text count too.
    ...(input.cvText ? tokenize(input.cvText) : []),
  ]);
  const required = uniqueSkills(input.jobRequiredSkills || []);

  const reasons: string[] = [];
  let score10: number;
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  if (required.length === 0) {
    // No required skills to compare: give a neutral baseline.
    score10 = 5;
    reasons.push('This job lists no required skills, so it received a neutral baseline score.');
  } else {
    const { ratio, matched, missing } = skillOverlap(candidateSkills, required);
    matchedSkills = matched;
    missingSkills = missing;
    // Skills are the dominant signal: up to 8 of 10 points.
    let points = ratio * 8;
    reasons.push(
      `Skills match: you have ${matched.length} of ${required.length} required skill(s)` +
        (matched.length ? ` (${matched.join(', ')})` : '') +
        `.`
    );
    if (missing.length) {
      reasons.push(`Missing skill(s): ${missing.join(', ')}.`);
    }

    // Bonus up to 1 point: goals/preferred roles align with the job title.
    const goalText = `${input.candidateGoals || ''} ${(input.candidatePreferredRoles || []).join(' ')}`.toLowerCase();
    const titleTokens = tokenize(input.jobTitle);
    const goalHit = titleTokens.some((t) => goalText.includes(t));
    if (goalHit) {
      points += 1;
      reasons.push('Your career goals / preferred roles align with this job title.');
    }

    // Bonus up to 1 point: CV text overlaps the job description.
    if (input.cvText && input.jobDescription) {
      const descTokens = new Set(tokenize(input.jobDescription));
      const cvTokens = tokenize(input.cvText);
      const overlapCount = cvTokens.filter((t) => descTokens.has(t)).length;
      if (overlapCount >= 3) {
        points += 1;
        reasons.push('Your CV content overlaps with the job description.');
      }
    }

    score10 = Math.max(0, Math.min(10, Math.round(points)));
  }

  const explanation =
    `Overall match ${score10}/10 for "${input.jobTitle}". ` +
    (matchedSkills.length
      ? `Strong points: matched ${matchedSkills.length} required skill(s). `
      : 'No required skills matched yet. ') +
    (missingSkills.length ? `To improve, gain: ${missingSkills.join(', ')}.` : 'You meet the listed skill requirements.');

  return { score: score10, matchedSkills, missingSkills, reasons, explanation };
}
