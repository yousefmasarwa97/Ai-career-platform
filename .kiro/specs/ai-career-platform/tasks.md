# Implementation Plan

- [x] 1. Set up project structure and core scaffolding
  - Create the backend project (typed framework), frontend SPA project, and shared config
  - Configure environment management, linting, formatting, and a test runner
  - Add a database migration tool and object-storage client configuration
  - _Requirements: 16.2, 16.4_

- [ ] 2. Implement data models and migrations
  - [ ] 2.1 Define the User, CandidateProfile, and MentorProfile models with migrations
    - Enforce unique email and single-role assignment on User
    - _Requirements: 1.1, 3.1, 7.1_
  - [ ] 2.2 Define CvVersion, Job, and Application models with migrations
    - Add unique(candidate_id, job_id) constraint on Application
    - Add Job status field (draft/published)
    - _Requirements: 4.1, 5.1, 6.3_
  - [ ] 2.3 Define AiReview, AiOutput, Feedback, and AccessLog models with migrations
    - _Requirements: 11.1, 12.4, 14.2, 15.2_

- [ ] 3. Implement authentication
  - [ ] 3.1 Implement registration with role assignment and password hashing
    - Hash passwords with argon2/bcrypt; never store plaintext
    - _Requirements: 1.1, 1.5_
  - [ ] 3.2 Implement login, session/JWT issuance, and refresh
    - Return a generic error on invalid credentials without revealing which field failed
    - _Requirements: 1.2, 1.3_
  - [ ] 3.3 Add authentication guard that denies all protected resources when unauthenticated
    - Write tests for authenticated vs. unauthenticated access
    - _Requirements: 1.4_

- [ ] 4. Implement RBAC layer
  - [ ] 4.1 Implement role resolution and the permission matrix middleware
    - Enforce authorization server-side for every protected operation
    - _Requirements: 2.1, 2.5_
  - [ ] 4.2 Implement ownership checks in the service layer
    - Deny candidate access to other candidates' resources; allow Admin access to any
    - _Requirements: 2.2, 2.3, 2.4_
  - [ ] 4.3 Write authorization tests for each role across protected endpoints
    - Include candidate-to-candidate isolation and Admin-only paths
    - _Requirements: 2.2, 3.4, 4.4, 11.4_

- [ ] 5. Implement candidate profile management
  - [ ] 5.1 Implement profile CRUD scoped to the authenticated candidate
    - Support personal info, education, experience, skills, projects, certifications, goals, preferred roles
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 5.2 Enforce that candidates cannot view/edit other candidates' profiles
    - _Requirements: 3.4_

- [ ] 6. Implement CV version management
  - [ ] 6.1 Implement CV upload with format validation and encrypted object storage
    - Validate PDF/DOCX (assumption); store file encrypted; persist metadata + storage key
    - _Requirements: 4.1, 4.5, 15.1_
  - [ ] 6.2 Enforce the 5-version limit transactionally
    - Reject uploads beyond 5 with a clear limit message; handle concurrency
    - _Requirements: 4.2_
  - [ ] 6.3 Implement list and delete for CV versions with ownership scoping
    - Deleting a version frees capacity for a new upload
    - _Requirements: 4.3, 4.4_

- [ ] 7. Implement job offer management
  - [ ] 7.1 Implement job creation for Career Mentor and Admin
    - Support a draft/published status field
    - _Requirements: 5.1, 5.4_
  - [ ] 7.2 Implement job listing (published for candidates, all for admin) and mentor management of own jobs
    - Prevent candidates from uploading jobs
    - _Requirements: 5.2, 5.3, 5.5_

- [ ] 8. Implement job applications
  - [ ] 8.1 Implement application creation with duplicate prevention
    - Require explicit candidate action; block duplicate (candidate, job)
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ] 8.2 Implement candidate application status listing
    - _Requirements: 6.4_

- [ ] 9. Implement Career Mentor profile
  - Implement optional contact info; allow saving without it; store per visibility rules
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10. Implement the AI provider abstraction and orchestrator
  - [ ] 10.1 Implement the AiProvider abstraction with an external-use policy flag
    - Gate any transmission of CV/personal data to external LLMs behind the policy flag
    - _Requirements: 15.5_
  - [ ] 10.2 Implement the Orchestrator with agent selection, output merging, and provenance
    - Enforce the caller's auth context in every agent invocation
    - Record which agent produced each part of the response
    - _Requirements: 12.1, 12.2, 12.4_
  - [ ] 10.3 Implement conflict-handling strategy in the Orchestrator
    - _Requirements: 12.3_

- [ ] 11. Implement specialized agents
  - [ ] 11.1 Implement Profile Agent and CV Analysis Agent
    - Extract skills, experience, strengths, missing/unclear info; label output as AI-generated
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ] 11.2 Implement Job Matching Agent and Recommendation Agent
    - Recommend jobs with explanation/score; provide career-readiness recommendations
    - _Requirements: 9.1, 9.2, 9.3, 16.3_
  - [ ] 11.3 Implement Career Coach Agent and Interview Agent
    - Generate questions and provide feedback on answers
    - _Requirements: 10.1, 10.2_
  - [ ] 11.4 Unit-test each agent with a mocked AiProvider
    - _Requirements: 8.1, 9.1, 10.1_

- [ ] 12. Implement Admin AI-assisted CV review
  - [ ] 12.1 Implement Admin-only review endpoint routing through the Orchestrator
    - Return structured findings; deny non-Admin requests
    - _Requirements: 11.1, 11.4_
  - [ ] 12.2 Persist reviews labeled AI-generated and distinct from admin decisions
    - Never present the review as an automatic hiring decision
    - _Requirements: 11.2, 11.3_

- [ ] 13. Implement the candidate dashboard
  - Aggregate profile status, recommended actions, recommended jobs, insights, and application progress; reflect updated recommendations
  - _Requirements: 13.1, 13.2_

- [ ] 14. Implement AI feedback capture
  - Allow feedback on any AI output; persist it linked to the AI output id
  - _Requirements: 14.1, 14.2_

- [ ] 15. Implement security, privacy, and data governance
  - [ ] 15.1 Enforce encryption in transit and access logging on sensitive candidate reads
    - _Requirements: 15.1, 15.2_
  - [ ] 15.2 Implement data retention/deletion, including candidate self-deletion, and privacy notices
    - _Requirements: 15.3, 15.4_

- [ ] 16. Build the frontend for the three user faces
  - [ ] 16.1 Build auth screens and role-aware navigation
    - _Requirements: 1.1, 1.2, 2.1_
  - [ ] 16.2 Build candidate UI (profile, CV versions, job discovery, apply, dashboard)
    - Label all AI output as AI-generated
    - _Requirements: 3.1, 4.1, 5.2, 6.1, 8.2, 13.1_
  - [ ] 16.3 Build mentor UI (profile, job upload/management)
    - _Requirements: 5.1, 7.1_
  - [ ] 16.4 Build admin UI (candidate/CV browsing, job management, AI CV review)
    - Present AI review as decision support, distinct from admin decisions
    - _Requirements: 5.5, 11.1, 11.3, 18_
  - [ ] 16.5 Add i18n scaffolding and accessibility best practices
    - _Requirements: 16.5, 16.6_

- [ ] 17. Integration and end-to-end tests
  - Test candidate, mentor, and admin flows end to end, including RBAC isolation and AI-review provenance
  - _Requirements: 2.2, 6.1, 11.1, 12.2_
