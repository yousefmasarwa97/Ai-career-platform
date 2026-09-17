export type Role = 'candidate' | 'mentor' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

// Authorization context passed into the AI layer so agents can never
// operate on data the requesting user is not allowed to access.
export interface AuthContext {
  userId: number;
  role: Role;
  // The candidate whose data is being operated on (may differ from userId
  // when an admin acts on a candidate).
  targetCandidateId?: number;
}

export interface AgentInput {
  task: string;
  candidateProfile?: any;
  cvContent?: string;
  jobs?: any[];
  question?: string;
  answer?: string;
  params?: Record<string, unknown>;
}

export interface AgentOutput {
  agent: string;
  kind: string;
  findings: Record<string, unknown>;
  explanation: string;
  isAiGenerated: true;
  confidence?: number;
}

export interface OrchestratorResult {
  task: string;
  outputs: AgentOutput[];
  summary: string;
  conflicts?: string[];
  isAiGenerated: true;
}
