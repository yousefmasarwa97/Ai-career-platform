# HasoubLabs — Unified Multi-Agent AI Career Platform

An enterprise-style career platform with three user roles (Candidate, Career Mentor, Admin), role-based access control, CV version management, job offers/applications, and a multi-agent AI layer (an Orchestrator coordinating six specialized agents).

Built to the spec in `.kiro/specs/ai-career-platform/`.

## Multi-agent AI layer

A central **Orchestrator** selects and coordinates specialized agents, merges their outputs, attaches provenance, enforces the caller's authorization, and detects conflicts.

| Agent | Responsibility |
|---|---|
| ProfileAgent | Normalizes candidate profile + CV into structured data |
| CvAnalysisAgent | Skills, strengths, missing info, improvements (also powers Admin CV review) |
| JobMatchingAgent | Ranks jobs vs. profile with a match score + explanation |
| CareerCoachAgent | Prioritized skill gaps, next steps, learning suggestions |
| InterviewAgent | Generates questions and gives feedback on answers |
| RecommendationAgent | Combines all findings into prioritized next actions |

The AI provider is abstracted (`src/ai/provider.ts`):
- **local** (default): deterministic, offline, no API key, no data leaves the machine.
- **openai**: only used when `AI_PROVIDER=openai` **and** `ALLOW_EXTERNAL_LLM=true` **and** a key is set (per privacy requirement 15.5). Otherwise it falls back to local.

## Prerequisites

- **Node.js 18+** and npm. Node is not currently installed on this machine.
  Download from https://nodejs.org (LTS), install, then reopen your terminal.

## Setup & run

```powershell
# from the project folder
npm install
Copy-Item .env.example .env   # optional; sensible defaults work without it
npm run build
npm start
```

Then open http://localhost:3000

For live-reload development:

```powershell
npm run dev
```

## Try it

1. Register three accounts (candidate, mentor, admin) on the sign-in screen.
2. **Candidate:** fill profile + skills, upload a CV (PDF/DOCX, max 5), refresh jobs, generate the AI dashboard, try interview practice.
3. **Mentor:** post a job offer (contact info is optional).
4. **Admin:** load candidates, open one, and run an **AI CV review** (labeled as decision support).

## API quick reference

- `POST /api/auth/register` · `POST /api/auth/login`
- `GET/PUT /api/profile/me`
- `POST/GET /api/cv` · `DELETE /api/cv/:id`
- `GET/POST /api/jobs` · `PUT /api/jobs/:id` · `POST /api/jobs/:id/apply` · `GET /api/jobs/applications/mine`
- `POST /api/ai/assist` · `POST /api/ai/interview` · `POST /api/ai/feedback` · `GET /api/ai/dashboard`
- `GET /api/admin/candidates` · `GET /api/admin/candidates/:id` · `POST /api/admin/candidates/:candidateId/cv/:cvId/review`

## Security notes

- All permissions enforced server-side via the RBAC matrix in `src/rbac.ts`.
- Candidates cannot see other candidates' profiles/CVs; admins can, and those reads are written to `access_logs`.
- Passwords hashed with bcrypt; sessions are JWTs.
- The 5-CV-version limit is enforced transactionally.
