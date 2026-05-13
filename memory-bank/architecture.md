# Architecture

## Current State

The repository now contains a runnable Next.js application scaffold with:

- Bootstrap admin login page
- the login surface is now intentionally minimal: hero title plus subtitle on the left, and only the login badge, title, fields, and submit action on the right, with the former trial stats and bootstrap-warning copy removed from the page chrome
- database-backed user login with Bootstrap fallback
- protected dashboard shell
- NextAuth credentials flow
- Prisma schema and generated client
- Tencent Cloud Lighthouse deployment scripts for Ubuntu bootstrap, PostgreSQL backup, GitHub pull, Prisma schema sync, production build, systemd restart, Nginx proxying, and authenticated smoke verification
- one-click Windows school-pilot launcher and project transfer helpers remain in the repository as historical/backup tooling, but they are no longer the current deployment architecture
- one-click multi-workstation Codex development helpers for first-time developer setup, pre-work GitHub sync, end-of-session verify/commit/push, and cloud publish/deploy
- pre-work GitHub sync now self-prepares `.env.local` from `.env.example`, and Prisma config loads `.env.local` before `.env` so fresh clones can regenerate Prisma Client without a separate manual environment step
- the old public-tunnel runtime launcher remains historical/backup tooling for the earlier local-plus-tunnel pilot path
- user and permission management module for system administrators, now including the V1.5 role model and teacher-account to teacher-profile binding
- login account type is now separated from permission capability: `User.accountType` is limited to teacher or student accounts, `User.isSuperAdmin` carries highest-administrator capability, `User.teacherId` and `User.studentId` bind accounts to teacher or active-student profiles, and `UserRole` remains as a compatibility layer
- self-service password maintenance now lives at `/dashboard/account/password`; student accounts are limited to this route in the current phase and are redirected away from management workflows
- approved school trial role model with school leaders, grade-scoped managers, and an optional managed-grade relation on database users; V1.5 additionally supports department leaders, student affairs staff, academic affairs staff, admin office staff, logistics staff, and teacher accounts
- Grade-scoped pilot account pack and school-leader read-only inspection access
- verified Tencent Cloud server-local PostgreSQL database `school_affairs`; the cloud database currently does not carry old demo/test data
- school structure management module for visible grade, class, department, and subject maintenance, with `AcademicYear` retained only as an internal compatibility layer
- grade lifecycle helper for enrollment-year cohort naming, academic-year rollover, alumni cohort rules, and grade-department name synchronization
- department-position configuration under each department through `DepartmentPosition`, with default positions for `XXXX级年级`, `校领导`, and ordinary departments; teacher department assignments bind to positions while preserving old `identityType` compatibility metadata
- people management module for active teacher and student manual maintenance, mistaken-entry deletion with audit logging, configurable information statistics category add/disable/delete flows, identity-card-number-based import updates, Excel import templates, Excel import, filtered export, teacher multi-duty support, and teacher multi-department support
- teacher department assignments are now stored as explicit rows that can accumulate multiple positions or identity variants per department, so the teacher maintenance form exposes a multi-select department-position chooser and the structure page keeps department-position CRUD on the same surface
- people imports and manual active people creation create bound login accounts when a new teacher profile or new active student profile is created by identity card number; repeated imports update the profile without resetting passwords, archived-student imports and manual archived-student creation do not create student accounts, and conflicting existing account bindings fail before leaving partial data
- teacher compatibility roles are derived from the teacher's active department-position assignments, and the stored user role is treated as a compatibility field that gets re-synced when the teacher profile or a referenced department position changes
- people status configuration is now role-aware inside the people module: teachers use `正常 / 备孕 / 产假 / 长病假`, while students use `正常 / 休学 / 长期请假`, and the same shared definitions drive forms, filters, import normalization, and export labels
- the active people module is exposed as a single `师生档案` sidebar entry, while the people page can still internally focus student or teacher records through query state
- alumni archive module for archived student query, edit, import, and export flows
- inspection management module for student quantification and teacher quantification categories, items, record entry, filtered review, record edits, and mistaken-entry deletion
- reporting module for student quantification and teacher quantification summaries, xlsx/csv exports, and export audit logging
- application and approval module for teacher-submitted repair, material printing, and other configured requests, including approval responsibility routing, decision comments, print quantity tracking, and audit logging
- approval pilot configuration seeding through `scripts/seed-approval-pilot-config.mjs`, which creates or repairs the bound teacher self-service account `teacher.wangming`, the `logistics.office` and `admin.office` approval accounts, and standard active responsibilities for repair, teaching printing, grade administrative printing, school administrative printing, and other daily requests
- system-admin-only data management module for grouped record counts, search, pagination, selected-row deletion, fixed one-click cleanup, backup-before-delete protection, and read-only audit-log viewing
- mobile-first quick task routes for active-student lookup and routine-inspection entry, keeping full maintenance workflows on the existing people and inspection pages; the student quick-search path now also treats dormitory-code keywords as case-insensitive, normalizes dormitory-related student profile values to uppercase on save/import so `C123` and `c123` resolve to the same dormitory, and requires grade-first class selection so quick-search class options stay limited to the chosen grade
- visible grade/class selectors now load directly from `Grade` and `Class` instead of front-end academic-year groupings
- the visible app shell now exposes seven business modules: school structure, user permissions, people records, alumni archive, routine inspection, application approval, and statistics export
- the shared dashboard shell and global design tokens now use a lighter operator-facing visual system with a desktop sidebar, a mobile drawer navigation trigger, a desktop-sticky but mobile-non-sticky topbar, and consistent secondary-action styling for topbar controls
- the Step 7 UI-delivery surface currently centers on `src/components/auth/login-form.tsx`, `src/components/shell/dashboard-shell.tsx`, `src/app/dashboard/page.tsx`, `src/components/form/submit-button.tsx`, and `docs/final-delivery-checklist.md`; the current shape removes the global RBAC explainer, the top `私有部署` badge, and the homepage `下一阶段任务` card so the dashboard reads as an operator work surface instead of a delivery checklist, and this slice has current static verification coverage through `typecheck`, `lint`, and `build`
- the latest Step 7 feedback refinement also moves inspection save notices down into the record-entry section, anchors full-page inspection saves back to `#record-entry` for continuous data entry, links student grade/class selectors on the people page through a dedicated client component, removes duplicate topbar user-role wording, simplifies the homepage quick-task cards, and makes the mobile topbar non-sticky so it does not dominate narrow screens during scroll
- the mobile quick inspection route now also carries an explicit Chinese remarks placeholder instead of fallback/question-mark text, so the compact entry form stays usable on narrow screens
- local PGlite simulation and demo seed scripts remain local development helpers only; they are not part of the current cloud deployment path
- updated README and handoff documents now match the Tencent Cloud server deployment, cloud PostgreSQL boundary, and GitHub-driven update flow
- V1.5 planning materials now live under `docs/product-roadmap-v1-5-v2.md` and `docs/v1-5-executable-plan.md`, with a leadership decision deck at `docs/roadmap-leadership-brief-v1-5-v2.pptx`; these are recommendation and reporting artifacts only, not approved V1 scope changes
- GitHub remote collaboration is now prepared around the public repository `https://github.com/nyyz1/xiaowuxitong.git`; source, docs, scripts, schema, and generated Prisma client are versioned, while local environment files, installed dependencies, build output, logs, artifacts, tunnel material, and workstation runtime data stay outside Git.

Historical migration acceptance note for the earlier workstation pilot as of 2026-05-09:

- The verified workstation PostgreSQL service was `postgresql-xiaowuxitong`, installed under `D:\PostgreSQL\17`, with the data directory at `D:\PostgreSQL\data`.
- The application database is `school_affairs`, owned by `school_admin`, and `.env.local` must match the current `school_admin` password recorded in `docs/pilot-accounts-and-usage-guide.md`.
- PostgreSQL command-line tools are available at `D:\PostgreSQL\17\bin`; they are not guaranteed to be on PATH in the current PowerShell session.
- Direct `npm` invocation in PowerShell can be blocked by execution policy on this workstation, while `npm.cmd` works and is the safer command form for manual verification.
- The local production app was verified listening on `0.0.0.0:3000`, with same-network URL tracking in `logs/current-school-pilot-url.txt`.
- The Chinese handoff markdown docs in `README.md`, `docs/`, and `tasks/` are stored as UTF-8 text; earlier mojibake reports were mostly caused by Windows PowerShell default decoding rather than widespread content corruption.

## System Shape

The planned version 1 architecture is:

- single-tenant internal web application
- one primary codebase
- server-rendered and API-backed admin workflows
- relational database as the system of record
- explicit role-based authorization around sensitive operations

## Source of Truth

- `prd.md` defines product scope and acceptance
- `tech-stack.md` defines tool and platform choices
- `implementation-plan.md` defines execution order
- `progress.md` keeps the short active change log, while `progress-archive.md` keeps compressed older milestone history
- `docs/README.md` is the operator-facing document index
- `docs/tencent-lighthouse-deployment.md` is the source of truth for the Tencent Cloud server deployment and one-command update flow
- `docs/pilot-accounts-and-usage-guide.md` is the cloud operator guide for login URL, account setup, daily use, and common maintenance checks
- `README.md` is now kept intentionally short and mainly points readers toward `docs/README.md`, the cloud deployment guide, and the cloud operator guide instead of repeating every operator detail inline
- `docs/product-roadmap-v1-5-v2.md`, `docs/v1-5-executable-plan.md`, and `docs/roadmap-leadership-brief-v1-5-v2.pptx` are post-V1 planning and leadership-reporting artifacts; they should guide scope discussion but do not change the implemented architecture until explicitly approved
- this file defines module boundaries, data flow, and architectural constraints

## Architecture Goals

- keep the product modular even inside a single application
- model school structure, people, and inspection data relationally
- make filters, statistics, and exports derive from the same source data
- keep permission checks explicit around imports, edits, and exports
- keep school structure configurable in the UI rather than hard-coded in forms
- optimize for maintainability by future operators, not cleverness

## Planned Module Inventory

| Path | Responsibility | Inputs | Outputs | Notes |
| --- | --- | --- | --- | --- |
| `src/app/login/page.tsx` | login route entry | session state | login page or redirect to dashboard | implemented |
| `src/app/dashboard/layout.tsx` | route protection for dashboard area | session cookies | guarded app shell | implemented |
| `src/app/dashboard/page.tsx` | operator overview page | authenticated request | quick-task-first dashboard with module entry cards, admin data-management entry, and lighter module responsibility summary | implemented |
| `src/app/dashboard/quick/students/page.tsx` | mobile-first active student quick search route | authenticated people session, student keyword or grade/class filters | compact student result cards with full authorized active-student details, including case-insensitive dormitory-number keyword search through student profile data and grade-first class filter linkage | implemented for Step 7 task-entry optimization |
| `src/app/dashboard/quick/inspection/page.tsx` | mobile-first inspection quick entry route | inspection-recorder session, target type/date/item parameters | focused student or teacher quantification entry form that stays in quick-entry flow after save | implemented for Step 7 task-entry optimization |
| `setup-dev-workstation.cmd` | multi-computer development setup launcher | a cloned GitHub repository on a developer computer | prepares Git/Node/npm, Git identity, local `.env.local`, dependencies, and Prisma Client for Codex-assisted development | implemented for Step 7 collaboration convenience |
| `start-work.cmd` | pre-Codex work sync launcher | clean local Git worktree | pulls the latest GitHub code, refreshes generated Prisma Client, and copies the standard Codex memory-bank prompt to the clipboard | implemented for Step 7 collaboration convenience |
| `save-work.cmd` | end-of-session save launcher | local code changes | runs typecheck and lint, commits with an operator-provided message, rebases on the remote branch, and pushes to GitHub | implemented for Step 7 collaboration convenience |
| `scripts/setup-dev-workstation.ps1` | developer-computer setup helper | cloned repository, optional Git identity, optional winget | checks or installs Git and Node.js, configures repository safety and commit identity, creates `.env.local` from `.env.example`, installs dependencies, and generates Prisma Client | implemented for Step 7 collaboration convenience |
| `scripts/start-work.ps1` | GitHub sync helper before Codex work | clean Git branch, `.env.example` when `.env.local` is missing | fast-forward pulls from GitHub, installs missing dependencies when needed, prepares `.env.local`, regenerates Prisma Client, and copies the standard Codex startup prompt | implemented for Step 7 collaboration convenience |
| `scripts/save-work.ps1` | GitHub save helper after Codex work | modified Git branch and commit message | optionally verifies with typecheck/lint, stages, commits, rebases, and pushes the current branch | implemented for Step 7 collaboration convenience |
| `commit-and-push.cmd` | local GitHub save launcher | local code changes | verifies, commits, rebases, pushes, and prints the Tencent Cloud deployment command | implemented for cloud update workflow |
| `scripts/commit-and-push.ps1` | local GitHub save helper | modified Git branch and commit message | optional typecheck/lint/build, stage, commit, rebase, push | implemented for cloud update workflow |
| `publish-and-deploy.cmd` | one-click cloud publish launcher | local code changes and SSH access | verifies, commits, pushes, deploys to Tencent Cloud, and checks local/GitHub/server commit alignment | implemented for cloud update workflow |
| `scripts/publish-and-deploy.ps1` | one-click cloud publish helper | commit message, SSH key, Tencent Cloud host | runs local validation, Git push, server deployment, and three-way commit verification | implemented for cloud update workflow |
| `scripts/deploy-tencent-lighthouse.ps1` | local Tencent Cloud deployment entrypoint | SSH key, server host, optional accept-data-loss flag | triggers the server-side deployment script over SSH | implemented for cloud update workflow |
| `scripts/server/bootstrap-ubuntu.sh` | first-time Tencent Cloud bootstrap | Ubuntu server, GitHub repo, generated secrets | installs Node/PostgreSQL/Nginx, prepares `.env.local`, syncs schema, builds, installs systemd service, and smoke-tests | implemented for current deployment |
| `scripts/server/deploy.sh` | server-side one-command update | current server checkout and PostgreSQL | backup, Git pull, dependency install, Prisma sync, baseline seeds, build, restart, smoke | implemented for current deployment |
| `scripts/server/backup-postgres.sh` | server-side PostgreSQL backup | `DATABASE_URL`, backup retention | custom-format `.dump` backups under `/opt/xiaowuxitong/backups` | implemented for current deployment |
| `src/app/dashboard/structure/page.tsx` | school structure route entry | authenticated request, query status | structure management screen | implemented |
| `src/app/dashboard/users/page.tsx` | user management route entry | system-admin session, query status | user and permission management screen | implemented for Step 7 |
| `src/app/dashboard/account/password/page.tsx` | self-service password route | authenticated account session | current-password verification and password update form; student accounts are limited to this route in the current phase | implemented for Step 7 account hardening |
| `src/app/dashboard/people/page.tsx` | people management route entry | authenticated request, `view=students` or `view=teachers`, query filters | focused active-student or teacher management screen | implemented |
| `src/app/dashboard/archive/page.tsx` | archive-module entry redirect | authenticated request | forwards archive traffic to the student archive center | implemented |
| `src/app/dashboard/archive/students/page.tsx` | alumni archive route entry | authenticated request, query filters | archived-student management screen | implemented |
| `src/app/dashboard/archive/students/export/route.ts` | archived student filtered export | filters, archive-access role context | `.xlsx` export | implemented |
| `src/app/dashboard/archive/students/templates/route.ts` | archived student import template download | archive-access role context | `.xlsx` template | implemented |
| `src/app/dashboard/people/templates/teachers/route.ts` | teacher import template download | authenticated request | `.xlsx` template | implemented |
| `src/app/dashboard/people/templates/students/route.ts` | student import template download | authenticated request | `.xlsx` template | implemented |
| `src/app/dashboard/people/export/teachers/route.ts` | teacher filtered export | filters, role context | `.xlsx` export | implemented |
| `src/app/dashboard/people/export/students/route.ts` | student filtered export | filters, role context | `.xlsx` export | implemented |
| `src/app/dashboard/inspection/page.tsx` | inspection management route entry | authenticated request, query filters | inspection management screen with read-only leader access and editable recorder/admin flows | implemented |
| `src/app/dashboard/approvals/page.tsx` | application approval route entry | authenticated request, request types, approval responsibilities, query status | teacher request submission, approval decisions, request tracking, and admin configuration | implemented for V1.5 Step 8 |
| `src/app/dashboard/exports/page.tsx` | export center route entry | authenticated request, report filters | inspection summary dashboard and export links | implemented |
| `src/app/dashboard/exports/inspection/xlsx/route.ts` | inspection report Excel export | filters, role context | multi-sheet `.xlsx` export with detail rows plus summary sheets | implemented |
| `src/app/dashboard/exports/inspection/csv/route.ts` | inspection report CSV export | filters, role context | `.csv` detail export with target-type-specific columns | implemented |
| `src/app/dashboard/data-management/page.tsx` | data management route entry | system-admin session, query filters | guarded data management center | implemented for Step 7 operations |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler | auth requests | session and auth responses | implemented |
| `src/components/auth/login-form.tsx` | Bootstrap admin login UI | username and password | sign-in attempt and redirect | implemented |
| `src/components/shell/dashboard-shell.tsx` | internal admin layout shell | authenticated user name, role, current route, current query view, and child content | desktop sidebar plus mobile drawer navigation, single people entry, desktop-sticky but mobile-non-sticky topbar, role display, quick-task actions, and flat working canvas without process-facing status clutter | implemented |
| `src/components/shell/logout-button.tsx` | logout interaction | current session | sign-out and redirect | implemented |
| `src/lib/auth.ts` | auth configuration and Bootstrap credential check | credentials, env vars | `NextAuthOptions` | implemented |
| `src/lib/authorization.ts` | server-side role checks for protected workflows | current session | allow or redirect decisions | implemented |
| `src/lib/prisma.ts` | Prisma client singleton | generated Prisma client and PostgreSQL adapter | shared DB access point | implemented |
| `src/lib/grade-lifecycle.ts` | enrollment-year cohort lifecycle, alumni naming, and class-count helper rules | enrollment year, year date, class names | deterministic rollover and archive helper behavior | implemented |
| `src/lib/validation/auth.ts` | login schema validation | form input | validated credentials payload | implemented |
| `src/lib/validation/users.ts` | user management validation | account forms and password reset forms | normalized user payloads | implemented for Step 7 |
| `src/lib/validation/school-structure.ts` | structure management input validation | form submissions | normalized names and field constraints | implemented |
| `src/lib/validation/people.ts` | teacher and student input validation | profile forms and filters | validated people payloads | implemented |
| `src/lib/validation/inspection.ts` | inspection input validation | category, item, record, and filter forms | validated inspection payloads | implemented |
| `src/lib/validation/approvals.ts` | application approval validation | type, responsibility, request, and decision forms | normalized approval payloads, including required print quantity fields | implemented for V1.5 Step 8 |
| `src/lib/validation/reporting.ts` | report filter validation | export center filters | validated report filter payloads | implemented |
| `src/lib/app-config.ts` | app metadata and dashboard highlight config | static config | UI labels and descriptions | implemented |
| `src/modules/school-structure` | school structure module: page, actions, queries, and structure-specific UI helpers | admin form input | canonical school structure records | implemented |
| `src/modules/users` | user permissions module: page, actions, queries, and role-management flows | system-admin forms | canonical login users and permission assignments | implemented for Step 7 |
| `src/modules/approvals` | application approval module: page, actions, queries, labels, and routing helpers | teacher requests, approval configuration, decision forms | application requests, approval responsibility routing, decision logs, and audit rows | implemented for V1.5 Step 8 |
| `src/modules/people` | people records module: page, actions, queries, helper utilities, spreadsheet helpers, category maintenance, and people export/template handlers | forms, filters, spreadsheet files | canonical teacher data, active student data, profile-field definitions, and `.xlsx` files | implemented for Step 4 plus lifecycle extension |
| `src/modules/people/routes.ts` | people-module route handlers for teacher/student templates and exports | HTTP requests plus people filters | thin route results for `.xlsx` exports and templates | implemented |
| `src/modules/alumni-archive` | alumni archive module: page plus archive-specific export/template handlers | archive filters, forms, spreadsheet files | canonical archived student data and `.xlsx` files | implemented for lifecycle extension |
| `src/modules/alumni-archive/routes.ts` | alumni-archive route handlers for archived-student template and export flows | HTTP requests plus archive filters | thin route results for `.xlsx` archive downloads | implemented |
| `src/modules/inspection` | routine inspection module: page, actions, queries, and record-management flows | inspection entry forms | inspection records and validation errors | implemented for Step 5 |
| `src/modules/inspection/record-scope-fields.tsx` | client-side dependent selectors for inspection record entry | selected grade, department, subject, and current option lists | narrowed class or teacher dropdown options for the record form | implemented for the 2026-05-01 Step 5 refinement |
| `src/modules/reporting` | statistics export module: page, queries, export builders, audit helper, and export route handlers | filters, time ranges, role context | summaries, export files, and audit rows | implemented for Step 6 |
| `src/modules/reporting/routes.ts` | reporting-module route handlers for inspection Excel and CSV exports | HTTP requests plus report filters | thin route results for report downloads | implemented |
| `src/modules/data-management` | data management module: definitions, queries, backup helper, server actions, and page UI | system-admin filters and deletion confirmations | grouped table data, backup files, hard-delete transactions, and audit rows | implemented for Step 7 operations |
| `src/modules/audit` | broader action logging for imports and sensitive changes | domain events | audit trail records | planned |
| `scripts/simulate-school-affairs.mjs` | local fake database simulation | generated demo data | PGlite database, summary output, xlsx/csv smoke exports | implemented for Step 7 prep |
| `scripts/simulate-data-management.mjs` | local data-management simulation | minimal PGlite scenario | preview counts and cleanup-order assertions for the three fixed cleanup actions | implemented for Step 7 operations |
| `scripts/demo-data.mjs` | shared deterministic demo dataset | none | reusable fake school data for simulation and real PostgreSQL seed, including the Grade 11 pilot user pack | implemented for Step 7 prep |
| `scripts/seed-demo-postgres.mjs` | real PostgreSQL demo data seed | `DATABASE_URL`, Prisma-synced DB | deterministic demo rows for browser smoke testing with explicit timestamps and foreign-key-safe insertion order | implemented for Step 7 prep |
| `scripts/clear-demo-postgres.mjs` | real PostgreSQL seeded demo data cleanup | `DATABASE_URL`, fixed demo IDs from `scripts/demo-data.mjs` | deletes only the fixed seeded demo rows without rewriting them, with dry-run support | implemented for Step 7 operations |
| `scripts/backfill-inspection-target-types.mjs` | post-schema helper for live inspection-category target-type backfill | reachable PostgreSQL plus the new inspection schema | upgrades obvious legacy teacher categories to teacher quantification and lists orphan teacher records that still need manual rebinding | implemented for the 2026-04-28 inspection rollout follow-up |
| `docs/tencent-lighthouse-deployment.md` | Tencent Cloud deployment guide | server details and scripts | first-time bootstrap and one-command update runbook | implemented for current deployment |
| `docs/deployment-and-smoke-test.md` | cloud deployment and verification guide | target environment details | GitHub-to-server deployment steps and smoke checklist | implemented for current deployment |
| `docs/postgresql-install-and-acceptance-runbook.md` | cloud PostgreSQL operations runbook | server-local PostgreSQL and backups | schema sync, backup, restore, and troubleshooting steps | implemented for current deployment |
| `docs/security-and-deployment-plan.md` | security and deployment explanation | private cloud deployment assumptions | data safety, role boundary, backup, and rollout guidance | implemented for current deployment |
| `prisma/schema.prisma` | database schema and relations | model changes | migrations and DB structure | implemented |
| `src/generated/prisma` | generated Prisma client code | Prisma schema | type-safe DB client for future modules | implemented |

## Core Planned Entities

| Entity | Purpose |
| --- | --- |
| `User` | application login identity, role assignment, and optional managed-grade scope |
| `Role` | permission grouping |
| `AcademicYear` | internal compatibility layer for rollover history and legacy relations during the low-risk grade-first rollout |
| `Grade` | grade grouping |
| `Class` | class grouping |
| `Department` | teacher department ownership |
| `Subject` | teaching subject reference |
| `Teacher` | teacher master record keyed for imports by identity card number, with multiple duties, multiple department affiliations, and configurable profile data |
| `TeacherDepartmentAssignment` | explicit teacher-to-department affiliation join rows |
| `Student` | student master record keyed for imports by identity card number, with active-versus-archived state plus configurable profile data |
| `ProfileFieldDefinition` | configurable teacher or student information statistics category definition, including former fixed fields such as teacher employee number and student number |
| `InspectionTargetType` | distinguishes student quantification from teacher quantification |
| `InspectionCategory` | top-level inspection grouping |
| `InspectionItem` | concrete inspection rule or metric |
| `InspectionRecord` | recorded daily or periodic quantification result linked either to grade/class or to teacher |
| `AuditLog` | trace of sensitive actions such as import and export |

## Data Flow

### School Structure Data Flow

1. A system admin opens the school structure management page.
2. The server checks that the current session has permission to manage master data.
3. The user adds, renames, or removes visible grades, classes, departments, or subjects.
4. Shared validation rules normalize names and reject invalid input early.
5. Prisma writes the change to PostgreSQL, then the page re-renders with the latest structure snapshot.
6. Later people management and inspection modules consume the same structure tables as foreign-key-backed reference data.

Current implementation note:

- Grades now carry explicit lifecycle metadata through `enrollmentYear`, `isVisibleInMain`, and optional `graduationYear`; `stage` remains only as transitional compatibility metadata for archived rows.
- Batch class count changes create numbered classes on expansion and only delete empty tail classes on reduction.
- Cohort rollover creates a new active cohort for the target enrollment year, copies the latest carried-forward class structures, moves active students into the newest compatibility cohort, archives older cohorts as labels like `2022级入学 / 2025届毕业`, and hides no-longer-active historical grade records from the main front-end.
- The rollover intentionally preserves old grade and class records for historical inspection reporting instead of mutating them in place.
- The main active front-end now keeps only the latest three enrollment cohorts visible.
- During rollover, department names containing a grade-department segment such as `2023级年级` are synchronized against the full post-rollover active enrollment-year set inside the same transaction. This lets teacher-facing grade departments end up matching the active cohorts, for example `2024级年级 / 2025级年级 / 2027级年级`, while unrelated departments stay unchanged.
- The active `/dashboard/structure` route continues to render the grade-first `src/modules/school-structure/page.tsx` surface directly; there is no separate academic-year-facing page in the live route path.
- The visible structure page no longer exposes academic-year CRUD; server actions keep compatibility `AcademicYear` rows in sync behind the scenes.

### Personal Data Flow

1. An authenticated user opens a teacher or student management page.
2. The server checks role permissions.
3. Input is validated with shared schemas.
4. Data is stored or queried through Prisma and PostgreSQL.
5. Filtered results are rendered in tables and can be exported through the reporting module.

Current implementation note:

- Step 4 currently supports manual teacher and student create, edit, filter, deactivate, reactivate, and mistaken-entry delete flows.
- Deactivation updates `employmentStatus` or `enrollmentStatus`; delete actions hard-delete only the selected row, write an `AuditLog`, and keep role checks on the server action.
- Teacher deletion is blocked when the teacher is already referenced by inspection records, so historical teacher-quantification records are not silently detached; operators should use deactivation or correct the inspection records first.
- Student saves verify that the selected class belongs to the selected grade before writing.
- Spreadsheet import uses identity card number to update existing teacher or student rows or create new rows; teacher employee number and student number are no longer import identity fields.
- Spreadsheet import requires department, subject, grade, and class names to match existing school structure records.
- Teacher department affiliations are now stored through explicit `TeacherDepartmentAssignment` rows, while the legacy `Teacher.departmentId` field remains as a compatibility pointer to the first selected department.
- Configurable teacher or student information statistics categories are now defined in `ProfileFieldDefinition`, while concrete per-record values are stored in `Teacher.profileData` and `Student.profileData`.
- Active category definitions now drive the visible teacher or student forms, plus the generated import-template and export column sets.
- Profile-field definitions can be added, renamed, disabled or re-enabled, and deleted from the people page; former fixed statistics fields such as employee number, student number, gender, phone, duties, guardian contact, and remarks are bridged through `fieldKey` definitions so they follow the same category workflow.
- Deleting a custom profile-field definition hard-deletes the definition and prunes stored JSON values; deleting a bridged system profile-field definition marks it deleted and inactive so it is removed from forms, templates, and exports without being automatically recreated by later profile-field queries.
- Teacher grade-department names now use enrollment-year wording such as `2025级年级` instead of lifecycle wording such as `高一年级部`, including the shared demo dataset, teacher template example row, and the live workstation database departments; rollover keeps those teacher-facing grade departments aligned with the final active cohort set.
- Filtered export routes generate `.xlsx` files from the current query filters.
- Teacher records now store `duties` as structured multi-value data rather than a single free-text slot.
- The main `/dashboard/people` page is now explicitly the active front-end people view; archived cohorts are filtered out there by default.
- `/dashboard/people?view=students` focuses on active student records, while `/dashboard/people?view=teachers` focuses on teacher records. The sidebar itself keeps only one `师生档案` entry and does not expose student or teacher children.
- `/dashboard/quick/students` is a mobile-first active-student lookup route that reuses the same people access roles, grade-scope enforcement, active-cohort filtering, and active profile-field definitions, but does not render import/export, category configuration, or manual maintenance controls.
- Empty quick-student searches intentionally show an empty prompt instead of loading the first page of students; searches by keyword, grade, or class return compact authorized detail cards for active students only, with archived students remaining in the separate archive center.
- Grade-scoped managers are forced to the student view even if they request `view=teachers`, preserving the existing rule that they cannot browse school-wide teacher data.
- Teacher filters, imports, manual saves, status changes, and teacher profile-category actions redirect back to the teacher view; active-student operations redirect back to the student view.
- Active people filters, templates, imports, and exports now operate on grade and class only, without front-end academic-year selection.

### Alumni Archive Data Flow

1. A school-wide archive-authorized user opens `/dashboard/archive/students`.
2. The server checks archive access separately from grade-scoped people access.
3. Archived students are queried from the same `Student` table using `isArchived = true` plus archived-grade filters.
4. Imports and manual edits continue to write back to the same canonical `Student` rows.
5. Archive exports generate `.xlsx` files from the current archive filters without reintroducing archived cohorts into the active people page.

Current implementation note:

- the shared `Student` table approach remains valid and is now implemented with enrollment-year cohort rules
- archived student views now depend on `Student.isArchived` plus archived-grade metadata rather than active high-school stage labels
- archived student detail rows reuse the people-module delete action with `studentViewMode=archived`, so mistakenly entered archive rows can be deleted without exposing them in the active people view

### Inspection Data Flow

1. Inspection staff selects a quantification type, date, target scope, and inspection item.
2. Input is validated for required fields and score or count format.
3. The inspection record is stored in the database.
4. Reporting queries aggregate records by time range, class, grade, teacher, or inspection item according to the selected quantification type.
5. Export requests generate files from the same filtered dataset and write audit records.

Current implementation note:

- Step 5 supports category create, rename, and delete only when the category has no items.
- Inspection items can be created, edited, enabled, and disabled; historical records are preserved.
- Inspection records can be created, edited, and deleted from `/dashboard/inspection`; delete actions validate recorder permissions, grade scope, and the selected student-versus-teacher target type before writing an audit log.
- The visible inspection workflow is now split into student quantification and teacher quantification views under the same module route.
- `SCHOOL_LEADER` sessions can open `/dashboard/inspection` in read-only mode to review school-wide raw records without receiving record-edit or configuration controls.
- Record saves verify that student quantification uses `grade/class` while teacher quantification uses `teacher`, and they reject mixed-scope payloads.
- Grade-scoped manager accounts remain limited to student quantification; teacher quantification stays school-wide only.
- When a grade-scoped session requests `targetType=TEACHER` directly through the URL, the live rendered inspection page still falls back to student-scoped `grade/class` fields and does not render the teacher selector.
- The record-entry form now narrows student class options immediately after a grade is chosen, and narrows teacher options by the selected department and or subject before teacher selection.
- `/dashboard/quick/inspection` is a mobile-first quick-entry route for users with record-entry permission. It reuses the same validation, grade-scope coercion, student/teacher target rules, and dependent scope selectors, while omitting category configuration, record filtering, and record-maintenance panels.
- `createInspectionRecord` now accepts the hidden `returnMode=quick` mode for quick-entry forms; this mode redirects only to `/dashboard/quick/inspection` with whitelisted target type, date, and item parameters so repeated mobile entry stays in the focused flow without allowing arbitrary return URLs.
- The current page supports filtering records by date range, category, item, grade, class, and teacher according to the selected quantification type.
- Inspection list and reporting selectors now default to visible active grades only, so archived cohorts no longer appear in the front-end inspection or export workflow unless a future archive-specific reporting path is added.
- The visible inspection workflow now loads flat grade and class selectors directly from visible `Grade` rows rather than grouping them under academic-year records.
- A live rollout-specific edge case now exists and is documented: one pre-split teacher-centered record was originally stored under `grade/class`, so after the target-type backfill it appears in teacher quantification as an unbound legacy record until an admin manually selects the correct teacher and re-saves it.

### Reporting Data Flow

1. A permitted user opens the export center.
2. The server validates report filters for date range, category, item, and the appropriate student or teacher scope.
3. Reporting queries load inspection records and derive summaries from source records instead of storing manual totals.
4. The page renders KPI cards and summary tables by item, target scope, date, and value type.
5. Export routes reuse the same filters to generate `xlsx` or `csv` files.
6. Each inspection report export writes an `AuditLog` row with actor, format, filters, and record counts.

Current implementation note:

- Step 6 currently focuses on inspection exports for both student quantification and teacher quantification, while keeping the page preview summary-oriented.
- Excel exports now include a `检查明细` sheet plus overview, inspection item, target scope, date, and result type summary sheets.
- CSV exports now emit inspection detail rows only, using student columns `记录日期 / 检查项目 / 年级 / 班级 / 结果数值 / 备注内容` and teacher columns `记录日期 / 检查项目 / 教师姓名 / 结果数值 / 备注内容`.
- Teacher and student exports remain available from the people management page using current people filters.
- The export center now switches between `grade/class` filters and `teacher` filters based on the chosen quantification type, while keeping the same no-academic-year visible workflow model.
- The same scope guard used by inspection also holds in the live export center: a grade-scoped session may carry `targetType=TEACHER` in the URL, but the rendered page still stays on student-scoped `grade/class` filters and does not render a teacher selector.

### Data Management Flow

1. A system administrator opens `/dashboard/data-management`.
2. The route and every server action call `requireSystemAdmin()` before reading or mutating data.
3. Query helpers load grouped counts, the selected table page, search results, and dependency previews from PostgreSQL.
4. The page exposes per-row delete, selected-row delete, and three fixed cleanup actions: clear inspection records, clear people records, and clear structure plus business data.
5. Each destructive action requires a checkbox plus exact confirmation text; the broad structure cleanup requires `清空结构和业务数据`.
6. Before any delete transaction starts, `createDataManagementBackup()` runs `pg_dump --format=custom`, using `PG_DUMP_PATH` when present, then common Windows PostgreSQL paths such as `D:\PostgreSQL\17\bin\pg_dump.exe` and `C:\Program Files\PostgreSQL\17\bin\pg_dump.exe`, and writing to `DATA_BACKUP_DIR` or `artifacts/data-management-backups`.
7. If backup fails, deletion is cancelled. If backup succeeds, the server action writes a backup audit row, runs the foreign-key-safe delete order in a database transaction, and writes a delete audit row with deleted counts and the backup path.
8. User accounts and audit logs are preserved by this module; user lifecycle remains under `/dashboard/users`, while audit logs are read-only in the data management center.

Current implementation note:

- `clearInspectionRecords` deletes only `InspectionRecord`.
- `clearPeopleRecords` deletes `TeacherDepartmentAssignment`, `Student`, and `Teacher`, while leaving school structure and configuration records in place.
- `clearStructureAndBusinessData` deletes inspection records, teacher/student records, profile-field definitions, inspection items/categories, classes, grades, `AcademicYear`, departments, and subjects, while preserving `User` and `AuditLog`.
- `npm run test:data-management` verifies preview counts and the fixed cleanup orders against a PGlite schema with matching foreign-key behavior.

### Local Simulation Data Flow

1. `npm run test:demo-db` starts a PGlite database under `.tmp/pglite-school-affairs`.
2. The script recreates tables compatible with the current Prisma model shape.
3. It seeds a fake high school dataset from `scripts/demo-data.mjs`: users, academic year, grades, classes, departments, subjects, profile-field definitions, teachers with multi-department assignments, students with configurable profile data, student quantification categories and items, teacher quantification categories and items, and inspection records.
4. It runs both student quantification and teacher quantification summary queries and writes a simulated export audit row.
5. It produces readable smoke-test artifacts under `outputs/simulation`.

Current implementation note:

- The simulation is for local verification only; production and real deployment still use PostgreSQL through Prisma.
- The script intentionally avoids Docker because the project still needs a no-risk fake database path even after the pilot workstation received a real local PostgreSQL service.
- `npm run db:seed:demo:dry-run` verifies the real PostgreSQL seed plan without opening a database connection.
- `npm run db:seed:demo` writes the same deterministic demo data to a reachable PostgreSQL database after schema sync.
- `npm run db:clear:demo` deletes only the deterministic seeded demo rows identified by `scripts/demo-data.mjs`; manually entered test records are not reliably distinguishable without explicit filters or a backup restore point.
- The current simulation now emits separate student-quantification and teacher-quantification report artifacts so both flows stay covered by smoke verification.
- `npm run test:data-management` starts a separate PGlite database under `.tmp/pglite-data-management` and verifies data-management cleanup behavior without touching PostgreSQL.

### Tencent Cloud Deployment Flow

1. Developer changes code locally.
2. Developer runs `publish-and-deploy.cmd`.
3. The local publish helper validates Prisma schema, typecheck, lint, and build, then commits and pushes `main` to GitHub.
4. The helper SSHes into Tencent Cloud Lighthouse `124.222.136.121` and runs `scripts/server/deploy.sh`.
5. `scripts/server/deploy.sh` creates a PostgreSQL backup, pulls GitHub, installs dependencies, generates Prisma Client, validates schema, syncs PostgreSQL, seeds baseline configuration, previews missing identity-card login accounts, builds, restarts `xiaowuxitong.service`, reloads Nginx, and runs authenticated page smoke.
6. The helper verifies local HEAD, `origin/main`, and the server checkout HEAD match after deployment.
7. The cloud PostgreSQL database remains server-local and does not include old local demo/test data.

Current implementation note:

- Active deployment docs now describe only the Tencent Cloud path.
- Windows workstation, LAN, and public-tunnel flows were removed from active handoff docs and remain historical context only in archived progress or git history.
- If several authenticated dashboard pages show "This page couldn't load" at once, first check Prisma schema drift against the cloud PostgreSQL database and rerun authenticated smoke after schema sync.
- `npm run smoke:pages` checks the protected data-heavy route set with the browser-session cookie behavior required by the app.
- `npm run db:repair:identity-accounts:dry-run` previews teacher and active-student profile records that can receive missing identity-card-number login accounts; `npm run db:repair:identity-accounts` applies the repair after a backup is confirmed.

### Current Auth Flow

1. User visits `/login`.
2. `src/components/auth/login-form.tsx` submits credentials through `next-auth/react`.
3. `src/lib/auth.ts` validates input, normalizes the username, and first tries to load an active database `User`.
4. If the database user exists and has a password hash, the submitted password is checked with `bcryptjs`.
5. If the database is unavailable or no matching database user is found, the Bootstrap admin credentials from environment variables remain available as a fallback.
6. On success, NextAuth creates a JWT-backed session with the user id, account type, highest-administrator flag, compatibility role, optional `managedGradeId`, optional `teacherId`, and optional `studentId`.
7. The login form also writes a separate browser-session cookie with no explicit expiry, so it disappears when the browser session ends.
8. `getBrowserBoundServerSession()` now treats a session as valid only when both the NextAuth session and the browser-session cookie are present.
9. `/dashboard` routes check that browser-bound session server-side before rendering the app shell.
10. Domain routes add explicit server-side role checks before allowing sensitive actions.
11. Student accounts are redirected to `/dashboard/account/password` in the current phase instead of entering business-management workflows.
12. Grade-scoped roles derive their allowed grade from the session and enforce it again inside people, inspection, reporting, and approval server logic.
13. Teacher accounts can carry a `teacherId` in the session so self-service approval requests can be tied back to the teacher profile.

### User Management Data Flow

1. A system administrator opens `/dashboard/users`.
2. The server checks `requireSystemAdmin()` before loading or mutating users.
3. User form input is validated by `src/lib/validation/users.ts`.
4. The visible account model supports teacher and student account types, while highest-administrator capability is stored on `User.isSuperAdmin`; the compatibility role model still supports `SYSTEM_ADMIN`, `SCHOOL_LEADER`, `DEPARTMENT_LEADER`, `GRADE_MANAGER`, `STUDENT_AFFAIRS_STAFF`, `ACADEMIC_AFFAIRS_STAFF`, `ADMIN_OFFICE_STAFF`, `LOGISTICS_STAFF`, and `TEACHER`.
5. Teacher accounts can bind to `Teacher` through `User.teacherId`, student accounts can bind to active `Student` rows through `User.studentId`, and grade managers must be bound to exactly one `Grade` through `User.managedGradeId`.
6. Teacher-role compatibility is derived from the teacher's department-position assignments and re-synced when the teacher profile or a referenced department position changes.
7. New or reset passwords are hashed with `bcryptjs` before being stored in `User.passwordHash`.
8. User records are not hard-deleted; administrators can enable or disable accounts.
9. The action layer prevents the current database admin from disabling itself and prevents removing the last active highest-administrator account.
10. User creation, role updates, status changes, and password resets write `AuditLog` entries.

### Application Approval Data Flow

1. A teacher or system administrator opens `/dashboard/approvals` and submits a request from an active `ApprovalType`.
2. Repair requests use the logistics responsibility kind; printing requests use material type to select teaching, grade administrative, or school administrative responsibility; other requests use their configured responsibility kind.
3. The routing helper matches active `ApprovalResponsibility` rows by request type plus optional grade, subject, and department scope, then assigns the request to a current approver.
4. Printing requests must include material type, print mode, paper size, and print quantity before they can be saved.
5. Approvers can only approve pending requests when they are a system administrator or have an active matching approval responsibility.
6. Approval or rejection writes decision status, decision comment, approver, decision time, an `ApprovalLog` row, and an `AuditLog` row.

Current implementation note:

- System administrators retain fallback approval authority for operational recovery.
- School leaders can view approval records, but they no longer receive blanket decision authority; they must match an active approval responsibility unless they are operating through the system-admin role.
- The pilot seed currently routes repair to `logistics.office`, teaching-use printing to `data.manager`, `2024级` grade-administrative printing to `grade11.manager1`, school-administrative printing for `校务办公室` to `admin.office`, and other daily requests to `leader1`.

## External Dependencies

| Dependency | Purpose | Why it exists | Risk or note |
| --- | --- | --- | --- |
| `Next.js` | full-stack web application shell | reduces coordination cost versus separate frontend and backend | keep modules separated to avoid monolith sprawl |
| `Ant Design` | admin UI forms and tables | school affairs workflows are table and form heavy | avoid over-customizing too early |
| `PostgreSQL` | primary relational database | strong fit for structured school and inspection data | schema discipline matters |
| `Prisma` | ORM and schema migration | fast iteration on relational models | DB connectivity still needs verification against a real running instance |
| `Auth.js` | authentication foundation | quicker than building login plumbing from scratch | credentials flow must be configured securely |
| `bcryptjs` | password hashing and verification | stores database user passwords as hashes instead of plain text | keep demo passwords out of production and use strong real passwords |
| `Zod` | validation | shared input rules across forms and server logic | keep schemas close to domain modules |
| `xlsx` | spreadsheet import and export | required by school operations | validates imports carefully before write; powers Step 4 people exports and Step 6 report exports |
| `@electric-sql/pglite` | local fake Postgres database | supports demo data and smoke verification without installing PostgreSQL | simulation only; not used by production app runtime |

## Red Lines

- no teacher or student export without explicit permission checks
- no silent spreadsheet import that partially corrupts data without clear row-level errors
- no duplicated free-text school structure fields where foreign keys should exist
- no fixed class-count assumptions in code when class records can be managed by grade
- no manual summary totals stored as source of truth when they can be derived from records
- no casual hard delete of teacher, student, or inspection records without an archival rule
- no new module added without updating this file and `tech-stack.md` if dependencies change

## Open Questions

- Should archived cohorts eventually receive their own inspection-history archive view, or is hiding them from the main inspection/reporting pages sufficient for the first version?
- Do we need guardian information in the first schema freeze, or can it remain optional?
- Will the first release support only one campus, or do we need campus as a first-class entity?
- After the first real system administrator account is verified, should the Bootstrap fallback remain enabled or be restricted further for production?

## 2026-05-11 Permission-Context Update

- The authorization layer now derives a teacher-position context from `User.teacherId` and `TeacherDepartmentAssignment`, including department-leader assignment tracking.
- People, inspection, approval, and dashboard entrypoints now consume that context so permissions are no longer based on `User.role` alone where the plan required teacher-position awareness.
- The dashboard shell now receives teacher identity types from the server so quick-entry and menu visibility can reflect teacher-side duties.
- The approval submit flow now validates teacher-bound department scope before saving a school-administrative print request.
- A standalone script assertion was added to keep the requested permission matrix executable outside the browser.

## 2026-05-11 Account-Type And Department-Position Update

- `AccountType` now limits login accounts to `TEACHER` and `STUDENT`; `isSuperAdmin` carries highest-administrator capability so administrator access is not a third account type.
- `DepartmentPosition` is the configurable position layer under departments. Each position stores an old identity-type compatibility value plus permission tags, and teacher department assignments now bind to the position through `positionId`.
- the same department can now accumulate multiple teacher position rows, and the teacher edit form renders those positions as a multi-select department-position chooser instead of a single identity dropdown
- `src/modules/accounts/helpers.ts` centralizes identity-card-number username normalization, initial password generation, and import-time account creation.
- `scripts/seed-department-positions.mjs` backfills default positions for existing departments after schema sync, and `npm.cmd run smoke:positions` keeps the position-derived permission matrix executable.

## 2026-05-12 Tencent Cloud Lighthouse Deployment Update

- `scripts/server/bootstrap-ubuntu.sh` defines the first-time Ubuntu bootstrap path for Tencent Cloud Lighthouse: install Node.js, PostgreSQL, Git, and Nginx; create `/opt/xiaowuxitong`; clone GitHub; generate production `.env.local`; create the local PostgreSQL app database; run Prisma schema sync and baseline seeds; install `xiaowuxitong.service`; and proxy public `:80` to `127.0.0.1:3000`.
- On Tencent Cloud Lighthouse, the bootstrap defaults to Ubuntu repository PostgreSQL packages for reliability; setting `POSTGRES_VERSION=17` opts into the external PostgreSQL apt repository when that network path is healthy.
- The live Tencent Cloud Lighthouse deployment is now running at `124.222.136.121` with Nginx on `:80`, PostgreSQL local to the instance, and `xiaowuxitong.service` under systemd; the published login page responds with HTTP `200`.
- `scripts/server/deploy.sh` is the server-side one-command update path: back up PostgreSQL, pull GitHub, install dependencies, generate and validate Prisma, sync the live database schema, preview missing identity-card login accounts, rebuild, restart systemd, and smoke-test data-heavy pages.
- `scripts/server/backup-postgres.sh` creates custom-format PostgreSQL backups with bounded retention under `/opt/xiaowuxitong/backups`, and `scripts/deploy-tencent-lighthouse.ps1` is the local SSH entrypoint for triggering the server update.
- The current cloud PostgreSQL database is treated as a clean production/pilot database, not a continuation of old local demo data; `db:seed:demo`, `db:clear:demo`, and PGlite simulation remain local-only helpers.
- Active handoff docs now promote the cloud path and demote Windows workstation, LAN, and public-tunnel paths to historical or backup references.

## 2026-05-12 Local Commit Push Helper

- `publish-and-deploy.cmd` and `scripts/publish-and-deploy.ps1` are the preferred local cloud publishing path: verify, prompt for a commit message when needed, stage, commit, rebase, push, run the Tencent Cloud deployment script, and confirm local/GitHub/server commit alignment.
- `commit-and-push.cmd` and `scripts/commit-and-push.ps1` remain available when the operator only wants to save code to GitHub without deploying.
