# Unified Multi-Agent AI Career Platform

Monorepo scaffolding for the AI Career Platform (see `.kiro/specs/ai-career-platform`).

## Stack

- **Frontend**: React + TypeScript SPA (Vite), i18n via `i18next`, component-friendly structure.
- **Backend**: NestJS + TypeScript (typed backend framework per design).
- **Database**: PostgreSQL, migrations via TypeORM DataSource.
- **Object storage**: S3-compatible client (`@aws-sdk/client-s3`) for encrypted CV files.
- **Auth**: JWT-based sessions; passwords hashed with argon2 (added in later tasks).

## Layout

```
app/
  package.json          # npm workspaces root
  tsconfig.base.json    # shared TS compiler options
  .prettierrc.json      # formatting
  .env.example          # environment template
  packages/shared/      # shared types & constants
  backend/              # NestJS API server
  frontend/             # React SPA
```

## Getting started

Requires Node.js >= 20 and npm >= 10.

```bash
npm install                 # install all workspaces
cp .env.example backend/.env
cp .env.example frontend/.env

npm run dev:backend         # start API (watch mode)
npm run dev:frontend        # start SPA dev server

npm run lint                # lint all workspaces
npm run format              # format with prettier
npm run test                # run all test suites

npm run migration:run       # apply DB migrations
```

## Scope of this scaffold (Task 1)

This sets up structure, environment management, linting/formatting, test runners
(Jest for backend, Vitest for frontend), migration tooling, and the object-storage
client configuration. Business logic (models, auth, RBAC, agents) is implemented in
subsequent tasks.
