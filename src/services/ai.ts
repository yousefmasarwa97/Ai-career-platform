import { db } from '../db';
import { OrchestratorResult } from '../types';

export function saveAiOutput(userId: number, type: string, result: OrchestratorResult): number {
  const sourceAgents = result.outputs.map((o) => o.agent);
  const info = db
    .prepare(
      `INSERT INTO ai_outputs (user_id, type, payload, source_agents)
       VALUES (?, ?, ?, ?)`
    )
    .run(userId, type, JSON.stringify(result), JSON.stringify(sourceAgents));
  return Number(info.lastInsertRowid);
}

export function saveAiReview(
  candidateId: number,
  cvVersionId: number,
  adminId: number,
  result: OrchestratorResult
): number {
  const findings = Object.fromEntries(result.outputs.map((o) => [o.agent, o.findings]));
  const info = db
    .prepare(
      `INSERT INTO ai_reviews (candidate_id, cv_version_id, requested_by_admin, findings, explanation, source_agents)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      candidateId,
      cvVersionId,
      adminId,
      JSON.stringify(findings),
      result.summary,
      JSON.stringify(result.outputs.map((o) => o.agent))
    );
  return Number(info.lastInsertRowid);
}

export function saveFeedback(userId: number, aiOutputId: number | null, rating: number | null, comment: string | null): number {
  const info = db
    .prepare('INSERT INTO feedback (user_id, ai_output_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(userId, aiOutputId, rating, comment);
  return Number(info.lastInsertRowid);
}
