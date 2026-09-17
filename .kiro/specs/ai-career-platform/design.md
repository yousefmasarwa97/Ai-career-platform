# Design Document

## Overview

The Unified Multi-Agent AI Career Platform is a role-based web application backed by an API server, a relational datastore, object storage for CV files, and a multi-agent AI layer coordinated by an Orchestrator. Three roles (Candidate, Career Mentor, Admin) interact with a single coherent UI while the AI complexity stays hidden behind the Orchestrator. All sensitive operations are authorized server-side via RBAC.

This design targets the confirmed MVP scope in the requirements. Where the PRD leaves items open (job publication approval, external LLM usage, exact profile fields, languages, success metrics), the design defines extension points rather than hard-coding a decision, and marks them as configuration or policy to be finalized.

### Design Goals

- Enforce role-based access control at the API layer for every protected operation.
- Keep candidate data isolated: a candidate can never reach another candidate's profile or CV.
- Present AI output as decision support, always distinguishable from human decisions.
- Make the agent layer modular so agents can be added/removed without changing callers.
- Provide clear explainability and traceability for AI recommendations.

## Architecture

### High-Level Architecture

```
                        ┌─────────────────────────────────────────┐
                        │              Web Frontend (SPA)          │
                        │   Candidate UI · Mentor UI · Admin UI     │
                        └───────────────────┬───────────────────────┘
                                            │ HTTPS (JWT session)
                        ┌───────────────────▼───────────────────────┐
                        │                API Server                  │
                        │  Auth · RBAC middleware · REST controllers  │
                        │  Profile · CV · Job · Application services  │
                        └───────┬───────────────────────┬───────────┘
                                │                       │
              ┌─────────────────▼──────┐     ┌──────────▼───────────────┐
              │  Relational Database   │     │  AI Orchestration Layer   │
              │  users, profiles,      │     │  Orchestrator (Supervisor)│
              │  cv_versions(meta),    │     │  ┌──────────────────────┐ │
              │  jobs, applications,   │     │  │ Profile Agent        │ │
              │  ai_reviews, feedback, │     │  │ CV Analysis Agent    │ │
              │  access_logs           │     │  │ Job Matching Agent   │ │
              └────────────────────────┘     │  │ Career Coach Agent   │ │
              ┌────────────────────────┐     │  │ Interview Agent      │ │
              │  Object Storage (CVs)  │     │  │ Recommendation Agent │ │
              │  encrypted at rest     │     │  └──────────┬───────────┘ │
              └────────────────────────┘     └─────────────┼─────────────┘
                                                           │
                                            ┌──────────────▼──────────────┐
                                            │  LLM / AI Provider (config)  │
                                            │  (external use gated by      │
                                            │   privacy policy)            │
                                            └──────────────────────────────┘
```

### Technology Choices (recommended, adjustable to team skills)

- Frontend: React + TypeScript SPA with a component library and i18n support for the localization requirement.
- API server: A typed backend framework (e.g., Node.js/NestJS or Python/FastAPI). Either is suitable; choose based on team familiarity. The design is framework-neutral.
- Database: PostgreSQL (relational integrity for RBAC, applications, and version limits).
- Object storage: S3-compatible storage with server-side encryption for CV files. The database stores only CV metadata plus a storage key.
- AI layer: An Orchestrator service wrapping pluggable agent implementations; each agent calls a configured LLM provider. External provider use is behind a policy flag per Requirement 15.
- Auth: JWT-based sessions with short-lived access tokens; passwords hashed with bcrypt/argon2.

### Request Flow (authorization is central)

Every protected request passes through: authenticate → resolve role → RBAC check for the specific operation and resource ownership → service logic → (optional) AI orchestration → response. AI responses are tagged with agent provenance so the UI can label them as AI-generated.

## Components and Interfaces

### 1. Auth & RBAC

- `AuthService`: register, login, token issuance/refresh, password hashing/verification.
- `RbacMiddleware`: resolves the caller's role and enforces a permission matrix keyed by (role, operation). Ownership checks (e.g., candidate accessing own resource) are enforced in the service layer using the authenticated user id.

Permission matrix (enforced server-side):

| Operation | Candidate | Career Mentor | Admin |
|---|---|---|---|
| View/edit own profile | Yes | Yes | Yes |
| Upload CV | Yes | No | No |
| Store up to 5 CV versions | Yes | No | View candidate versions |
| View other candidates' profiles/CVs | No | No (not automatic) | Yes |
| View jobs | Yes | Yes | Yes |
| Upload job offers | No | Yes | Yes |
| Apply to jobs | Yes | No | No |
| Request AI CV review | No | No | Yes |

### 2. Candidate Profile Service

- CRUD for the candidate profile (personal info, education, experience, skills, projects, certifications, career goals, preferred roles).
- All reads/writes scoped to the authenticated candidate id; Admin may read any candidate by id.

### 3. CV Version Service

- Upload: validate format (assumption PDF/DOCX), enforce the 5-version limit atomically, store file in object storage encrypted, persist metadata (id, candidate id, filename, storage key, uploaded_at, version_label).
- List/delete versions scoped to owner (Admin may list any candidate's versions).
- The 5-version limit is enforced with a transactional count check to avoid race conditions.

### 4. Job Service

- Create job offer (Career Mentor/Admin), list published jobs (Candidate), list all jobs (Admin), manage own jobs (Mentor).
- Publication workflow is a configurable state (`draft` → `published`), leaving room for the open question of whether Admin approval is required before a mentor job becomes visible.

### 5. Application Service

- Create application (Candidate only) with a unique constraint on (candidate_id, job_id) to prevent duplicates.
- List own applications with status; Admin may view application history (subject to the open question on admin visibility).

### 6. AI Orchestration Layer

- `Orchestrator`: receives a task with the caller's role/authorization context, selects agents, invokes them, merges outputs, attaches provenance, and returns a unified result. Enforces that agents never operate on data the caller cannot access.
- Agent interface (uniform contract):

```
interface Agent {
  name: string
  run(input: AgentInput, authContext: AuthContext): Promise<AgentOutput>
}

type AgentInput = { candidateData?, cvContent?, jobData?, question?, params? }
type AgentOutput = { agent: string, kind: string, findings: object, explanation: string }
```

- Agents: Profile, CV Analysis, Job Matching, Career Coach, Interview, Recommendation. Each is independently testable and calls the configured LLM provider through a single `AiProvider` abstraction (so external-provider policy and prompt handling live in one place).
- Conflict handling: the Orchestrator uses a defined strategy (e.g., prefer higher-confidence structured findings, otherwise present both and flag the conflict) — the exact policy is a config value pending client confirmation.

### 7. AI Review (Admin)

- `AiReviewService`: Admin-only. Given (candidate_id, cv_version_id), routes through the Orchestrator to the CV Analysis Agent (and optionally Job Matching/Recommendation) and persists a structured `ai_review` record labeled AI-generated. The response is never presented as a hiring decision.

### 8. Dashboard Service

- Aggregates profile status, recommended actions, recommended jobs, career insights, and application progress for the candidate.

### 9. Feedback Service

- Stores user feedback linked to a specific AI output id.

## Data Models

```
User            { id, email(unique), password_hash, role[candidate|mentor|admin], created_at }
CandidateProfile{ id, user_id(fk unique), personal{}, education[], experience[], skills[],
                  projects[], certifications[], career_goals, preferred_roles[], updated_at }
MentorProfile   { id, user_id(fk unique), contact_info?(nullable), updated_at }
CvVersion       { id, candidate_id(fk), filename, storage_key, format, version_label,
                  uploaded_at }   // max 5 per candidate enforced in service
Job             { id, created_by(fk user), title, description, required_skills[],
                  location, status[draft|published], created_at }
Application     { id, candidate_id(fk), job_id(fk), status, applied_at }  // unique(candidate_id, job_id)
AiReview        { id, candidate_id(fk), cv_version_id(fk), requested_by_admin(fk),
                  findings{}, explanation, source_agents[], created_at, is_ai_generated=true }
AiOutput        { id, user_id(fk), type, payload{}, source_agents[], created_at }
Feedback        { id, user_id(fk), ai_output_id(fk), rating, comment, created_at }
AccessLog       { id, actor_user_id(fk), action, target_type, target_id, created_at }
```

Notes:
- CV files live in encrypted object storage; only metadata + `storage_key` are in the database.
- `AccessLog` satisfies the sensitive-data access logging requirement.
- Retention/deletion policies operate over these tables plus object storage.

## Error Handling

- Authentication failures return a generic error without disclosing which field was wrong (Req 1.3).
- Authorization failures return 403 and are logged; the operation is not performed (Req 2.5).
- CV upload over the limit returns a clear 409/422 with the 5-version message (Req 4.2).
- Duplicate application returns a conflict error (Req 6.3).
- Unsupported CV format returns a validation error listing supported formats (Req 4.5).
- AI provider/timeout failures return a degraded, user-friendly message and record a `failed agent workflow` guardrail event; partial agent results are labeled as incomplete.
- All AI responses are tagged AI-generated so the UI never presents them as human decisions.

## Testing Strategy

- Unit tests: RBAC permission matrix, ownership checks, 5-CV-limit enforcement (including concurrency), duplicate-application prevention, CV format validation, password hashing.
- Authorization tests: for each protected endpoint, assert that each role is allowed or denied per the matrix, including candidate-to-candidate isolation (Req 2, 3.4, 4.4) and Admin-only AI review (Req 11.4).
- Agent tests: each agent tested in isolation with mocked `AiProvider`; Orchestrator tested for correct agent selection, output merging, provenance, and auth-context enforcement.
- Integration tests: end-to-end candidate flow (register → profile → CV → jobs → apply → recommendations), mentor flow (register → upload job → visible to candidate), admin flow (view candidate → request AI review).
- Security tests: encryption in transit, access logging on sensitive reads, and verification that external-LLM transmission is gated by the policy flag.
- Non-functional checks: response-time budgets for reads vs. AI operations; accessibility checks on candidate UI.

## Open Decisions Deferred to Client (tracked, not blocking design)

These map to the PRD open questions and are implemented as configuration/policy: mentor job approval workflow, mentor visibility into candidates, exact profile fields, admin CV download, whether AI review scores or only qualitative findings, review across all 5 CV versions, external LLM permission, retention windows, logged admin actions, supported languages, and final success metrics.
