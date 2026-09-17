# Requirements Document

## Introduction

The Unified Multi-Agent AI Career Platform is an enterprise-oriented product for HasoubLabs that connects community candidates to high-impact technology jobs through a single platform coordinated by multiple specialized AI agents. The platform serves three user roles (Candidate, Career Mentor, Admin), each with distinct capabilities and strict role-based access control. Candidates build profiles, manage up to five CV versions, discover jobs, apply, and receive AI-powered career support. Career Mentors contribute job offers. Admins oversee the platform and can request AI-assisted CV reviews as decision support.

This document defines the functional and non-functional requirements for the MVP. Several product decisions remain open (see the PRD open questions); requirements below are written to the confirmed scope and note assumptions where the PRD leaves an item as TBD.

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to register and log in securely, so that I can access my account and role-appropriate features.

#### Acceptance Criteria

1. WHEN a new user submits valid registration details THEN the system SHALL create an account and assign exactly one role of Candidate, Career Mentor, or Admin.
2. WHEN a user submits valid credentials THEN the system SHALL authenticate the user and establish an authenticated session.
3. WHEN a user submits invalid credentials THEN the system SHALL reject the login and SHALL NOT reveal whether the email or the password was incorrect.
4. IF a user is not authenticated THEN the system SHALL deny access to all protected resources.
5. WHEN passwords are stored THEN the system SHALL store them using a salted one-way hashing algorithm and SHALL NOT store plaintext passwords.

### Requirement 2: Role-Based Access Control

**User Story:** As a platform owner, I want every protected operation authorized by role on the server, so that users can only access what their role permits.

#### Acceptance Criteria

1. THE system SHALL enforce authorization for every protected profile, CV, job, and AI operation at the backend/API level and SHALL NOT rely only on hiding UI elements.
2. WHEN a Candidate requests another candidate's profile or CV THEN the system SHALL deny the request.
3. WHEN a Career Mentor requests candidate profiles or CVs without explicit authorization THEN the system SHALL deny the request.
4. WHEN an Admin requests any candidate profile, CV version, or job offer THEN the system SHALL grant the request.
5. IF a user attempts an operation not permitted for their role THEN the system SHALL return an authorization error and SHALL NOT perform the operation.

### Requirement 3: Candidate Profile Management

**User Story:** As a Candidate, I want to create and maintain a professional profile, so that the platform can understand my background and career goals.

#### Acceptance Criteria

1. WHEN a Candidate creates a profile THEN the system SHALL allow entry of personal information, education, work experience, technical skills, projects, certifications, career goals, and preferred job roles.
2. WHEN a Candidate updates their profile THEN the system SHALL persist the changes and reflect them in subsequent reads.
3. WHEN a Candidate views their own profile THEN the system SHALL display the current stored profile data.
4. THE system SHALL prevent a Candidate from viewing or editing another candidate's profile.

### Requirement 4: Candidate CV Version Management

**User Story:** As a Candidate, I want to upload and manage multiple CV versions, so that I can maintain and improve my resumes over time.

#### Acceptance Criteria

1. WHEN a Candidate uploads a CV THEN the system SHALL store it as a CV version associated with that candidate.
2. IF a Candidate already has 5 CV versions AND attempts to upload another THEN the system SHALL reject the upload and SHALL inform the candidate of the 5-version limit.
3. WHEN a Candidate deletes a CV version THEN the system SHALL remove it and free capacity for a new upload.
4. THE system SHALL prevent any Candidate from accessing another candidate's CV versions.
5. WHEN a CV is uploaded THEN the system SHALL validate the file format against the supported formats (assumption: PDF and DOCX) and SHALL reject unsupported formats.

### Requirement 5: Job Offer Management

**User Story:** As a Career Mentor or Admin, I want to upload and manage job offers, so that candidates can discover and apply to relevant opportunities.

#### Acceptance Criteria

1. WHEN an authorized Career Mentor or Admin submits a job offer THEN the system SHALL store the job offer.
2. WHEN a Candidate views jobs THEN the system SHALL display only job offers that are available/published according to the publication workflow.
3. THE system SHALL prevent a Candidate from uploading job offers.
4. WHEN a Career Mentor manages a job offer they created THEN the system SHALL allow updates subject to the finalized permissions.
5. WHEN an Admin views job offers THEN the system SHALL display all job offers.

### Requirement 6: Job Application

**User Story:** As a Candidate, I want to apply to available jobs, so that I can pursue relevant opportunities.

#### Acceptance Criteria

1. WHEN a Candidate applies to an available job offer THEN the system SHALL record an application linking the candidate and the job.
2. THE system SHALL NOT submit a job application on a candidate's behalf without explicit candidate action/consent.
3. IF a Candidate has already applied to a given job THEN the system SHALL prevent a duplicate application.
4. THE system SHALL allow a Candidate to view the status of their own applications.

### Requirement 7: Career Mentor Profile

**User Story:** As a Career Mentor, I want to optionally provide contact information, so that I control what personal information is shared.

#### Acceptance Criteria

1. WHEN a Career Mentor completes their profile THEN the system SHALL allow personal/professional contact information to be provided.
2. IF a Career Mentor chooses not to provide contact information THEN the system SHALL allow the profile to be saved without it.
3. THE system SHALL only store and display Career Mentor contact information according to the finalized privacy and visibility rules.

### Requirement 8: AI Profile and CV Analysis

**User Story:** As a Candidate, I want AI to analyze my profile and CV, so that I understand my strengths and skill gaps.

#### Acceptance Criteria

1. WHEN candidate profile or CV data is available THEN the system SHALL extract skills, experience, strengths, and missing/unclear information.
2. WHEN the AI produces analysis output THEN the system SHALL present it as AI-generated and distinct from human decisions.
3. THE system SHALL restrict AI analysis of a candidate's data to that candidate and authorized Admins.

### Requirement 9: Job Matching and Recommendations

**User Story:** As a Candidate, I want relevant job recommendations and career guidance, so that I can focus on suitable opportunities.

#### Acceptance Criteria

1. WHEN candidate data and available job offers exist THEN the system SHALL recommend relevant jobs based on skills, experience, career goals, and preferences.
2. WHEN a job is recommended THEN the system SHALL provide an explanation of why it was recommended (for example, a match rationale or score).
3. THE system SHALL provide personalized recommendations for improving career readiness (skills to improve, suggested paths, next actions).

### Requirement 10: Interview Preparation

**User Story:** As a Candidate, I want AI-assisted interview preparation, so that I can improve my performance.

#### Acceptance Criteria

1. WHEN a Candidate starts interview preparation THEN the system SHALL generate technical and behavioral interview questions relevant to the candidate's profile.
2. WHEN a Candidate submits an answer THEN the system SHALL provide feedback on the answer.

### Requirement 11: Admin AI-Assisted CV Review

**User Story:** As an Admin, I want to request an AI review of a candidate's CV, so that I have decision support while retaining human oversight.

#### Acceptance Criteria

1. WHEN an authorized Admin selects a candidate CV version and requests a review THEN the system SHALL return a structured AI review containing identified skills, relevant experience, strengths, missing/unclear information, and potential improvements.
2. THE system SHALL present the AI review as decision support and SHALL NOT treat it as an automatic hiring decision.
3. THE system SHALL clearly distinguish AI-generated observations from Admin decisions.
4. WHEN a non-Admin requests an AI CV review THEN the system SHALL deny the request.

### Requirement 12: Multi-Agent Orchestration

**User Story:** As a user, I want to interact with one coherent platform, so that the multi-agent complexity is handled in the background.

#### Acceptance Criteria

1. WHEN a user request requires AI work THEN the Orchestrator SHALL select and invoke the appropriate specialized agent(s) and combine their outputs into a single response.
2. THE system SHALL enforce the requesting user's role and authorization context in every agent invocation, and an agent SHALL NOT expose candidate information to a user not authorized to access it.
3. IF specialized agents produce conflicting outputs THEN the Orchestrator SHALL resolve or clearly present the conflict according to the finalized conflict-handling rule.
4. THE system SHALL record which agent produced each part of a combined AI response for traceability.

### Requirement 13: Unified Dashboard

**User Story:** As a Candidate, I want a unified dashboard, so that I can see my status, recommendations, and progress in one place.

#### Acceptance Criteria

1. WHEN a Candidate opens the dashboard THEN the system SHALL display profile status, recommended actions, recommended jobs, career insights, and application progress.
2. WHEN new AI recommendations are generated THEN the dashboard SHALL reflect the updated recommendations.

### Requirement 14: User Feedback on AI Output

**User Story:** As a user, I want to give feedback on AI recommendations, so that the platform can improve quality.

#### Acceptance Criteria

1. WHEN AI-generated output is shown THEN the system SHALL allow the user to submit feedback on that output.
2. WHEN feedback is submitted THEN the system SHALL persist it associated with the related AI output.

### Requirement 15: Security, Privacy, and Data Governance

**User Story:** As a candidate, I want my personal data and CVs protected, so that my sensitive information stays private.

#### Acceptance Criteria

1. THE system SHALL encrypt candidate data and uploaded CVs at rest and in transit.
2. THE system SHALL log access to sensitive candidate data (profiles and CVs).
3. THE system SHALL provide defined data retention and deletion policies, including a candidate's ability to delete their data.
4. WHEN candidate data is present THEN the system SHALL make available notices describing what data is collected, why, which agents access it, and whether it is shared.
5. IF CV or personal data would be transmitted to an external AI/LLM provider THEN the system SHALL only do so when this is confirmed as permitted, and SHALL apply consent and protection controls.

### Requirement 16: Non-Functional Requirements

**User Story:** As a stakeholder, I want the platform to be responsive, reliable, explainable, scalable, and accessible, so that it meets enterprise expectations.

#### Acceptance Criteria

1. THE system SHALL return AI responses within an acceptable user-experience time (target: TBD, assumption 30 seconds for AI operations, 2 seconds for standard reads).
2. THE system SHALL reliably persist user sessions, profile data, and AI workflow state.
3. WHERE a recommendation materially affects a candidate THE system SHALL provide an explanation for that recommendation.
4. THE architecture SHALL support increasing numbers of users, AI requests, jobs, documents, and agent workflows.
5. THE candidate-facing interface SHALL follow accessibility best practices (specific WCAG level: TBD with client).
6. THE system SHALL support the confirmed set of languages (candidate set: English, Arabic, Hebrew — to be confirmed).
