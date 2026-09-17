# HasoubLabs — Unified Multi-Agent AI Career Platform

An enterprise-style career platform with three user roles (Candidate, Career Mentor, Admin), role-based access control, CV version management, job offers/applications, and a multi-agent AI layer (an **Orchestrator** coordinating several specialized agents).

Built to the spec in `.kiro/specs/ai-career-platform/`.

---

## The 5 main agents

Every AI request goes through a central **Orchestrator**, which decides which specialized agent(s) to run, feeds them the right data (respecting the user's role and permissions), merges their outputs, tags everything as AI-generated, and returns one coherent answer. Users never talk to the agents directly, they interact with one platform while the agents work behind the scenes.

Below are the five most important agents and how each one works.

### 1. Orchestrator / Supervisor Agent

The coordinator that sits in front of all the others (`src/ai/orchestrator.ts`).

- Reads the incoming task (e.g. "rate jobs", "review CV", "match candidates") and picks the right agent plan for it.
- Runs the chosen agents in order, passing earlier findings forward when a later agent needs them.
- **Enforces authorization on every call**: a candidate's request can only touch that candidate's own data, and an agent can never expose information the requester isn't allowed to see.
- Merges the agents' outputs, attaches which agent produced what (provenance), and detects conflicts (e.g. a strong job match but many skill gaps) so the result stays trustworthy.

### 2. Job Matching Agent (candidate side)

Rates and ranks jobs for the logged-in candidate (`src/ai/agents/jobMatchScoreAgent.ts`).

- Takes the candidate's CV + profile (skills, career goals, preferred roles) and compares it against **every available job**.
- Gives each job a **rating out of 10** based mainly on how many of the job's required skills the candidate has, plus bonuses for goal/role alignment and CV-to-description overlap.
- Orders the jobs **most-matching first**, and on each job card shows the rating (with a ★) at the top-left.
- When the candidate opens a job, it produces an **evidence-based explanation** of exactly why they got that rating (which skills matched, which are missing, etc.).

**In the app** — the candidate's job list, ranked by match, each card showing its ★ rating out of 10:

![Job Matching Agent — candidate job list ranked by match rating](<img width="1920" height="1008" alt="image" src="https://github.com/user-attachments/assets/73ed11f1-863e-40aa-bfe0-cb9060d881b2" />
)

### 3. Candidate Matching Agent (admin side)

The mirror image of the job-matching agent, for admins (`src/ai/agents/candidateMatchAgent.ts`).

- For a selected job, it scores **every candidate** against that job using the same transparent skills/goals/CV logic.
- Returns the **top 10 candidates**, ordered from best match to least.
- For each candidate it provides a **name, photo, rating out of 10, and a reason** for that rating, presented strictly as decision support (a human still makes the hiring call).

**In the app** — after an admin clicks a job, the top matching candidates with their photo, ★ rating, and why:

![Candidate Matching Agent — top candidates for a job](docs/screenshots/candidate-matching-agent.png)

### 4. CV Analysis Agent

Reads a candidate's CV and turns it into useful, structured feedback (`src/ai/agents/cvAnalysisAgent.ts`).

- Identifies **detected skills**, the CV sections that are present vs. **missing** (summary, skills, experience, etc.), and **strengths**.
- Suggests concrete **improvements** (e.g. add a professional summary, quantify achievements, list more relevant skills).
- Powers the **Admin AI CV Review**: an admin can select a candidate's CV and get this structured review as decision support, clearly labeled as AI-generated.

### 5. Career Coach Agent

Looks at the candidate holistically and points them forward (`src/ai/agents/careerCoachAgent.ts`).

- Aggregates the skills that available jobs demand but the candidate is missing, and **prioritizes the skill gaps** by how often they appear across jobs.
- Suggests **next steps** (define career goals, build a portfolio project, expand skills) and matching **learning suggestions**.
- Its findings feed the Recommendation layer that populates the candidate dashboard's "recommended actions".

> The platform also includes an **Interview Agent** (generates tailored questions and gives feedback on answers) and a **Recommendation Agent** (combines all findings into a single prioritized action list). The Orchestrator wires these in the same way as the five above.

---

## AI provider

The agents reach an LLM through a single abstraction (`src/ai/provider.ts`):

- **local** (default): deterministic, offline, no API key, and **no data ever leaves the machine**. Matching uses a transparent, explainable skills/goals/CV heuristic, which is why every rating comes with a clear reason.
- **openai**: used only when `AI_PROVIDER=openai` **and** `ALLOW_EXTERNAL_LLM=true` **and** a key is configured (privacy requirement 15.5). Otherwise it safely falls back to local.

---

## Prerequisites

- **Node.js 18+** and npm (developed and tested on Node 24, which provides the built-in `node:sqlite` used for storage).
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

Optional: add sample jobs and candidates (safe to run repeatedly; only adds, never overwrites):

```powershell
npm run seed
```

## Try it

1. Register three accounts (candidate, mentor, admin) on the sign-in screen.
2. **Candidate:** fill profile + skills, upload a CV (PDF/DOCX, max 5). The job list is ranked for you with a ★ rating out of 10; click a job to see why you got that rating.
3. **Mentor:** post a job offer (company name + photo, contact info optional).
4. **Admin:** click a job to see its top-10 matching candidates, or open a candidate and run an **AI CV review** (decision support only).

## API quick reference

- `POST /api/auth/register` · `POST /api/auth/login`
- `GET/PUT /api/profile/me`
- `POST/GET /api/cv` · `DELETE /api/cv/:id`
- `POST /api/uploads/image` (company logos / candidate photos)
- `GET/POST /api/jobs` · `PUT /api/jobs/:id` · `POST /api/jobs/:id/apply` · `GET /api/jobs/applications/mine`
- `GET /api/ai/rated-jobs` · `GET /api/ai/rated-jobs/:jobId` (Job Matching Agent)
- `POST /api/ai/assist` · `POST /api/ai/interview` · `POST /api/ai/feedback` · `GET /api/ai/dashboard`
- `GET /api/admin/jobs/:jobId/candidates` (Candidate Matching Agent)
- `GET /api/admin/candidates` · `GET /api/admin/candidates/:id` · `POST /api/admin/candidates/:candidateId/cv/:cvId/review`

## Security notes

- All permissions enforced server-side via the RBAC matrix in `src/rbac.ts`.
- Candidates cannot see other candidates' profiles/CVs; admins can, and those reads are written to `access_logs`.
- Passwords hashed with bcrypt; sessions are JWTs.
- The 5-CV-version limit is enforced transactionally.
