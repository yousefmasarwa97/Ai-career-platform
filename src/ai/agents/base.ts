import { AgentInput, AgentOutput, AuthContext } from '../../types';
import { AiProvider } from '../provider';

// Uniform agent contract. Every specialized agent implements this so the
// Orchestrator can invoke them interchangeably.
export interface Agent {
  readonly name: string;
  readonly description: string;
  run(input: AgentInput, auth: AuthContext, provider: AiProvider): Promise<AgentOutput>;
}

// Shared helpers used across agents.

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'you', 'your', 'our', 'are', 'was', 'were', 'this', 'that',
  'from', 'have', 'has', 'will', 'not', 'but', 'all', 'can', 'a', 'an', 'to', 'of', 'in',
  'on', 'at', 'is', 'it', 'as', 'be', 'or', 'we', 'i',
]);

export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function uniqueSkills(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean)));
}

// Overlap ratio between two skill lists, 0..1.
export function skillOverlap(candidate: string[], required: string[]): {
  ratio: number;
  matched: string[];
  missing: string[];
} {
  const cand = new Set(uniqueSkills(candidate));
  const req = uniqueSkills(required);
  if (req.length === 0) return { ratio: 0, matched: [], missing: [] };
  const matched = req.filter((s) => cand.has(s));
  const missing = req.filter((s) => !cand.has(s));
  return { ratio: matched.length / req.length, matched, missing };
}
