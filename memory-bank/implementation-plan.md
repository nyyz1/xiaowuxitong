# Implementation Plan

## Working Rule

- Work one step at a time.
- Verify each step before starting the next one.
- After each verified step, update `progress.md` and `architecture.md`.
- If reality changes, refine later steps instead of blindly following the old plan.

## Current Status

- Current authoritative deployment path as of 2026-05-12: Tencent Cloud Lighthouse `124.222.136.121` runs the app and PostgreSQL on the same Ubuntu server, with Nginx proxying public `:80` to `127.0.0.1:3000`.
- Current authoritative update path: local development, push to GitHub, then run `scripts/deploy-tencent-lighthouse.ps1`; the server deploy script backs up PostgreSQL, pulls code, syncs Prisma schema, builds, restarts `xiaowuxitong.service`, and runs authenticated page smoke.
- Current authoritative data state: the cloud PostgreSQL database does not carry old demo/test data; demo seeding and PGlite simulation are local development helpers only.
- Earlier Windows workstation, LAN URL, and public tunnel items below are historical pilot milestones, not the current deployment plan.
- Completed: Step 0, Step 1
- Completed in code/environment: Step 2 application shell, Bootstrap login, protected dashboard shell, Prisma schema, Prisma client generation, and a verified real PostgreSQL connection on the pilot workstation
- Completed in code: Step 3 school structure management page, system-admin checks, validation, and server actions
- Completed in environment/verification: Step 3 school structure workflows have been smoke-checked against the live workstation deployment, including grade-first structure behavior and role-scope boundaries
- Completed in code: Step 4 teacher/student manual CRUD, filtering, Excel templates, Excel import, filtered export, and deactivate/reactivate flows
- Completed in environment/verification: Step 4 people workflows have live browser and authenticated-page verification for teacher multi-department UI, configurable category UI, template flows, and grade-manager visibility rules
- Completed in code: Step 5 routine inspection category/item management, inspection record entry, filtering, and record edits
- Completed in environment/verification: Step 5 inspection workflows have been smoke-checked on the live workstation deployment for student-versus-teacher quantification views plus role-based editing or read-only behavior
- Completed in code: Step 6 statistics and export center for inspection records, including xlsx/csv export and audit logging
- Completed in environment/verification: Step 6 reporting workflows now have live page-shape smoke coverage plus authenticated export-route checks against the running PostgreSQL deployment
- Started Step 7 stabilization, deployment, and handover prep
- Completed in code/docs: local PGlite simulation, shared demo dataset, real PostgreSQL demo seed script, README update, and deployment/smoke-test guide
- Completed in code/docs: database-backed user login, system-admin user and permission management, password reset, account enable/disable, hashed demo user passwords, and Chinese UI copy for the main app shell
- Completed in code/docs: approved school trial role model with school leaders, grade-scoped managers, managed-grade session context, server-side scope enforcement, updated demo seed accounts, and trial handoff docs
- Completed in code/docs/scripts: Grade 11 pilot account pack, school-leader inspection read-only access, and a Windows school-pilot launcher for LAN workstation deployment
- Completed in environment/scripts: native PostgreSQL 17 installed on `D:\PostgreSQL\17`, data directory created at `D:\PostgreSQL\data`, Windows service `postgresql-xiaowuxitong` registered, and the live local instance verified for real schema push and demo seeding
- Completed in environment/verification: reboot confirmed the PostgreSQL Windows service auto-starts cleanly, the workstation pilot now serves in production mode on the chosen LAN address, local role-based smoke checks pass, and backup plus restore rehearsal succeeded on the live workstation database
- Completed in environment/verification: another office PC on the same school network can open the live workstation URL, confirming the current LAN access path works end to end
- Completed in code/schema: the new Step 3 and Step 4 extension for batch class-count changes, academic-year rollover, alumni archive-center support, and teacher multi-duty requirements
- Completed in environment/verification: the new Step 3 and Step 4 lifecycle extension has now been smoke-checked against the live workstation deployment after restarting the stale production process, including admin access to rollover and archive pages plus role-scope verification for leader and Grade 11 manager accounts
- Completed in code/environment/verification: Step 7 auth hardening now requires a browser-session cookie in addition to the normal `Auth.js` session, so closing and reopening the browser no longer auto-enters the previous account on the live workstation URL
- Completed in code/environment/verification: the school-pilot launcher now resolves the correct LAN IPv4 address again after the reboot-recovery bug, and the live workstation site can be restored on the currently detected LAN address instead of collapsing to an invalid host
- Completed in code/environment/verification: the current Windows user now has a verified Startup-folder auto-start launcher for the school-pilot site after login, while machine-wide startup remains blocked by missing Task Scheduler permissions
- Completed in code/docs/environment/verification: Step 7 LAN-change hardening now keeps login redirects relative to the current browser host, lets the launcher refresh current URLs while the service is already running, writes `logs/current-school-pilot-url.txt`, and verifies the moved-network URL `192.168.1.4:3000`
- Completed in code/verification: the grade lifecycle has now been refactored from stage-based `HIGH_ONE/HIGH_TWO/HIGH_THREE` handling to an enrollment-year cohort model that keeps only the latest three cohorts active and archives older cohorts with labels such as `2022级入学 / 2025届毕业`
- Completed in code/verification/docs: the approved low-risk de-academic-year compatibility pass now keeps visible workflows on grade and class only while `AcademicYear` remains a hidden compatibility layer, and the current local repo state has been re-verified after the interrupted earlier attempt
- Completed in environment/verification: the live workstation deployment has now been re-smoked across `/dashboard/structure`, `/dashboard/people`, `/dashboard/inspection`, and `/dashboard/exports` for `admin`, `leader1`, and `grade11.manager1`, confirming the grade-first UI plus the expected role-scope boundaries after the compatibility pass
- Completed in code/docs at Step 7: the backend was scoped to six business modules - school structure, user permissions, people records, alumni archive, routine inspection, and statistics export - and the showcase/local-demo features were removed; V1.5 Step 8 later expanded the live module count to seven by adding application approval
- Completed in code/verification: routine inspection now splits into student quantification and teacher quantification, with teacher quantification records bound to teachers instead of classes across entry, query, statistics, export, and demo-seed flows
- Completed in environment/verification: the inspection split schema has now been pushed to the live local PostgreSQL database, teacher-like legacy categories have been backfilled to teacher quantification, and role-based smoke checks now confirm student-versus-teacher quantification page behavior and export behavior
- Completed in code/verification: Step 4 people records now support teacher multi-department affiliations plus configurable teacher or student information statistics categories, with templates and exports generated from the current active categories
- Completed in code/verification: Step 7 now includes a system-admin-only data management center with grouped data counts, search, pagination, row deletion, fixed cleanup actions, backup-before-delete protection, audit logging, and PGlite cleanup-order simulation
- Completed in environment/verification: the live PostgreSQL database now carries the new people-records schema plus the first teacher or student profile-field definitions, and authenticated live checks confirm the admin people page shape, dynamic template headers, and grade-manager visibility rules
- Completed in environment/verification: the in-app browser visual smoke is now done on the live workstation deployment for teacher multi-department UI, statistics-category creation UI, import file-picker UI, inspection/export target switchers, and the admin/leader/grade-manager role boundaries after the low-risk grade-first compatibility pass
- Completed in code/environment/verification: Step 4 profile categories can now be added, disabled or re-enabled, and deleted from the people page; the live database grade-department names have been renamed from `高X年级部` to enrollment-year labels such as `2025级年级`
- Completed in code/docs/verification: Step 4 now treats former fixed statistics fields such as teacher employee number and student number as configurable profile categories, while identity card number is the required unique identifier for manual saves and spreadsheet import updates
- Completed in code/docs/environment/verification: Step 3 cohort rollover now synchronizes teacher-facing grade-department names against the complete post-rollover active cohort set, and the live database has been repaired so its grade-department names match the current active cohorts
- Completed in environment/verification: the 2026-05-01 live workstation outage follow-up restored the web service on `192.168.1.3:3000`, hardened the startup launcher against duplicate starts, resynced the live PostgreSQL schema after Prisma `P2022 ColumnNotFound` errors, and reverified the four affected business pages
- Completed in code/schema/local database/docs: V1.5 Step 8 application and approval module for teacher repair, material printing, and other configured daily requests, including print quantity tracking and default approval type seeding
- Completed in environment/verification: Step 8 pilot approval configuration now has a bound teacher account, standard approval accounts, and approval responsibilities covering repair, teaching-print, grade-admin-print, school-admin-print, and other requests; authenticated `/dashboard/approvals` access plus database-backed routing and permission assertions pass
- Completed in code/schema/environment/verification: the Step 3/4/7 teacher-student account and department-position refactor now limits login account type to teacher/student, adds highest-administrator capability, student-account binding, identity-card-based import account creation, self-service password changes, department-configured positions, and default department-position seeding
- Next recommended action: complete final cloud handoff by creating real operator accounts, confirming backup retention, and deciding the final HTTPS/domain plan after备案.

## Step 0: Freeze Version 1 Scope

### Goal

Turn the school affairs system brief into a concrete version 1 scope.

### Deliverables

- `prd.md` updated with users, scope, non-goals, and acceptance examples
- minimum teacher and student fields listed
- routine inspection scope defined at a usable level

### Verification

- a new AI session can explain the product without guessing core workflows
- the main user flows are concrete enough to design the data model

## Step 1: Freeze The Technical Direction

### Goal

Choose the simplest secure stack for a private school deployment.

### Deliverables

- `tech-stack.md` updated with the selected stack
- auth, database, import or export, and deployment choices documented
- unresolved infrastructure questions listed separately

### Verification

- every major technology choice has a short reason
- no duplicate tools are solving the same problem

## Step 2: Bootstrap The Application Shell

### Goal

Create the minimal runnable project with authentication and database wiring.

### Deliverables

- Next.js application scaffolded
- TypeScript, package manager, lint, formatting, and environment setup in place
- PostgreSQL connection configured
- initial Prisma schema and migration flow working
- login page and protected app shell working

### Verification

- the app runs locally
- the database connection works
- unauthenticated users cannot access protected pages

## Step 3: Build School Structure And Permissions

### Goal

Create the shared foundation used by all later modules.

### Deliverables

- roles and permission checks defined
- school structure models created: grade, class, department, subject, plus an internal `AcademicYear` compatibility layer
- admin UI for managing school structure created
- classes can be added, renamed, and removed under each grade from the UI
- classes can also be batch-increased or batch-decreased under a grade through a target count workflow
- the visible structure UI manages grades, classes, departments, and subjects directly while `AcademicYear` stays server-managed for compatibility
- cohort rollover creates the newest enrollment-year cohort, keeps only the latest three cohorts active, and archives older cohorts automatically
- departments can be added, renamed, and removed from the UI
- grade-department names should follow enrollment-year wording such as `2025级年级` instead of `高一年级部`, and rollover should automatically synchronize teacher-facing grade-department names to the final active cohort set after rolling
- subjects can be added, renamed, and removed from the UI
- seed or bootstrap flow for initial admin account documented

### Verification

- roles gate actions correctly
- school structure data can be created and edited from the UI
- a user can change the effective class count of a grade by adding or removing class records
- department and subject names can be maintained without editing code or the database manually

## Step 4: Build Teacher And Student Master Data

### Goal

Make people data management usable for real operators.

### Deliverables

- teacher profile CRUD
- teacher profile deletion for mistakenly entered rows, guarded so teachers already referenced by inspection records are not casually hard-deleted
- teacher profile supports multiple department affiliations
- teacher profile supports multiple duty values
- student profile CRUD
- student profile deletion for mistakenly entered active or archived rows
- alumni archive center for automatically archived historical student cohorts
- configurable teacher and student information statistics categories can be added, disabled or re-enabled, and deleted in the system
- former fixed statistics fields such as teacher employee number and student number are managed through the same configurable category workflow instead of acting as import identity fields
- identity card number is required and is used as the unique record match key for manual saves and spreadsheet import updates
- search and filter by core dimensions
- spreadsheet import for teachers and students
- filtered export for teacher and student data

### Verification

- manual teacher and student records can be created, edited, filtered, deactivated, reactivated, and deleted from the UI when they were entered by mistake
- teachers can be saved with more than one department affiliation and department-based filtering still behaves correctly
- archived historical cohorts can still be edited, imported, and exported in their dedicated archive page while remaining hidden from the main active student view
- operators can import valid data and see clear row-level errors for invalid data
- teacher and student imports update existing rows by identity card number rather than employee number or student number
- downloaded teacher and student import templates reflect the currently configured active information statistics categories
- deleting a teacher or student information statistics category removes it from later forms, templates, and exports
- exported files match current filters
- critical fields are validated before save

Current verified status as of 2026-04-26:

- active cohorts are now modeled and displayed by enrollment year such as `2023级`, `2024级`, and `2025级`
- cohort rollover creates the newest cohort, keeps only the latest three cohorts active, and archives older cohorts as labels like `2022级入学 / 2025届毕业`
- archive imports, exports, templates, and demo datasets now follow the same enrollment-year cohort rules
- completed compatibility follow-up: visible people, inspection, reporting, and demo flows no longer expose academic-year wording or manual academic-year selection while `AcademicYear` stays server-side as a hidden compatibility layer
- completed extension follow-up: visible people workflows, archive workflows, and spreadsheet templates now use the multi-department teacher model plus configurable teacher or student information statistics categories
- completed live-smoke follow-up: browser-driven UI checks now cover category-creation entry, teacher multi-department editing entry, import-picker entry, and the student-versus-teacher inspection or export switchers on the live workstation deployment
- completed refinement follow-up: people-profile categories now expose delete controls beside the existing add and enable/disable controls, and live grade-department department names now use enrollment-year labels such as `2025级年级`
- completed identity follow-up: teacher employee number, student number, and other former fixed statistics fields now live behind `ProfileFieldDefinition` rows, can be enabled, disabled, deleted, and restored, and spreadsheet imports match existing teacher or student records by identity card number

## Step 5: Build The Routine Inspection Module

### Goal

Allow inspection staff to record and review routine checks.

### Deliverables

- inspection category and item management split by student quantification and teacher quantification
- inspection record entry by date and target scope, supporting student quantification by grade or class and teacher quantification by teacher
- edit and query views for recorded inspections
- deletion of mistakenly entered inspection records from the same record detail workflow
- validation rules for score, count, or deduction values

### Verification

- a staff member can record a day's student or teacher quantification data without direct spreadsheet editing
- a staff member with inspection entry permission can correct or delete a mistakenly entered inspection record without direct database access
- invalid or incomplete inspection records are rejected clearly

## Step 6: Build Statistics And Export Center

### Goal

Turn inspection data and personnel data into usable output for school operations.

### Deliverables

- summary queries by time range, grade, class, teacher, and inspection item according to the selected quantification type
- reusable filter UI for reports
- `xlsx` and `csv` export for summaries
- export permissions and audit logging

### Verification

- a leader can export monthly or weekly student or teacher quantification summaries without manual spreadsheet merging
- export actions are permission-checked and logged

## Step 7: Stabilize, Deploy, And Handover

### Goal

Prepare the project for real use.

### Deliverables

- smoke tests for login, people management, inspection entry, and export
- deployment instructions validated
- environment variables documented
- backup and restore guidance documented
- obvious security and data handling risks reviewed
- a system administrator can use `/dashboard/data-management` to visually inspect, filter, delete selected operational rows, and run fixed cleanup actions, with `pg_dump` backup required before any hard delete

### Verification

- someone else can run the product from the docs
- the release path is repeatable
- the highest-value workflows pass smoke validation
- data cleanup actions are covered by static checks plus a PGlite simulation of preview counts and foreign-key-safe deletion order

## Step 8: Build Application And Approval Workflow

### Goal

Add a lightweight teacher-facing request workflow for daily repair, material printing, and other configured applications.

### Deliverables

- role model expanded to system administrator, school leader, department leader, grade manager, student affairs staff, academic affairs staff, admin office staff, logistics staff, and teacher
- login account type is now separated from permission capability: accounts are teacher or student accounts, with highest-administrator capability stored as a flag and `UserRole` retained as a compatibility layer
- teacher user accounts can bind to teacher profile records
- student user accounts can bind to active student profile records and are limited to self-service password maintenance in this phase
- department positions can be configured under departments and teacher department assignments bind to those positions while preserving old identity-type compatibility
- application type configuration for repair, printing, and other request types
- approval responsibility configuration with optional request type, grade, subject, and department scope
- teacher-facing application submission and personal request tracking
- approval workbench for users with matching approval responsibilities
- repair requests route to logistics approval responsibilities
- printing requests route by material type: teaching use, grade administrative use, or school administrative use
- printing requests require material type, print mode, paper size, and print quantity
- approval and rejection actions save decision comments, approver, time, and audit logs

### Verification

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- teacher accounts can only see and submit their own requests
- student accounts can log in only to the self-service password page and cannot enter business management workflows
- newly imported teacher and active-student profiles create identity-card-number login accounts only on first profile creation, and repeated imports do not reset passwords
- default department positions are generated for existing and newly created departments, and deleting a referenced position is blocked
- printing requests cannot submit without material type, print mode, paper size, and print quantity
- users without matching approval responsibility cannot approve requests
- configured repair, printing, and other request types route to matching approval responsibilities

## Session Prompt Template

Use this when starting a new AI coding session:

```text
Read everything in /memory-bank first.
Identify the current implementation-plan step before making changes.
Restate the task, constraints, and verification plan in concise bullets.
Only execute the current step or sub-step.
Do not touch unrelated files.
After completing the change, update progress.md and architecture.md.
```


