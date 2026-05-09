# Architecture

## Current State

The repository now contains a runnable Next.js application scaffold with:

- Bootstrap admin login page
- database-backed user login with Bootstrap fallback
- protected dashboard shell
- NextAuth credentials flow
- Prisma schema and generated client
- one-click Windows school-pilot launcher for LAN workstation deployment
- one-click project-only transfer helpers for moving the codebase to a school office computer without carrying the current local database data, including school-workstation prerequisite checks and app database bootstrap
- one-click multi-workstation Codex development helpers for first-time developer setup, pre-work GitHub sync, and end-of-session verify/commit/push
- duplicate-start protection and existing-port detection in the Windows school-pilot launcher
- user and permission management module for system administrators
- approved school trial role model with school leaders, grade-scoped managers, and an optional managed-grade relation on database users
- Grade-scoped pilot account pack and school-leader read-only inspection access
- verified native PostgreSQL 17 workstation installation with a real `school_affairs` database and a localhost-only live instance
- school structure management module for visible grade, class, department, and subject maintenance, with `AcademicYear` retained only as an internal compatibility layer
- grade lifecycle helper for enrollment-year cohort naming, academic-year rollover, alumni cohort rules, and grade-department name synchronization
- people management module for active teacher and student manual maintenance, mistaken-entry deletion with audit logging, configurable information statistics category add/disable/delete flows, identity-card-number-based import updates, Excel import templates, Excel import, filtered export, teacher multi-duty support, and teacher multi-department support
- the active people module is exposed as a single `师生档案` sidebar entry, while the people page can still internally focus student or teacher records through query state
- alumni archive module for archived student query, edit, import, and export flows
- inspection management module for student quantification and teacher quantification categories, items, record entry, filtered review, record edits, and mistaken-entry deletion
- reporting module for student quantification and teacher quantification summaries, xlsx/csv exports, and export audit logging
- system-admin-only data management module for grouped record counts, search, pagination, selected-row deletion, fixed one-click cleanup, backup-before-delete protection, and read-only audit-log viewing
- mobile-first quick task routes for active-student lookup and routine-inspection entry, keeping full maintenance workflows on the existing people and inspection pages
- visible grade/class selectors now load directly from `Grade` and `Class` instead of front-end academic-year groupings
- the visible app shell now exposes only six business modules: school structure, user permissions, people records, alumni archive, routine inspection, and statistics export
- the shared dashboard shell and global design tokens now use a `校务档案馆` backend visual system: warm paper surfaces, ink-green navigation, coral signal accents, fine dividers, a sticky top status bar, role label, neutral working canvas, and tighter controls
- local PGlite simulation script for demo data and report smoke verification when PostgreSQL is not available
- PostgreSQL demo seed script and deployment smoke-test guide for handoff preparation
- updated README and trial handoff documents that match the approved school PostgreSQL pilot and account model
- GitHub remote collaboration is now prepared around the public repository `https://github.com/nyyz1/xiaowuxitong.git`; source, docs, scripts, schema, and generated Prisma client are versioned, while local environment files, installed dependencies, build output, logs, artifacts, tunnel material, and workstation runtime data stay outside Git.

Migration acceptance note for the current workstation as of 2026-05-09:

- The migrated workstation's PostgreSQL service is `postgresql-x64-17`, installed under `C:\Program Files\PostgreSQL\17`, with the data directory at `C:\Program Files\PostgreSQL\17\data`.
- The application database is `school_affairs`, owned by `school_admin`, and `.env.local` currently points to `postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public`.
- PostgreSQL command-line tools are available at `C:\Program Files\PostgreSQL\17\bin`; they are not guaranteed to be on PATH in the current PowerShell session.
- Direct `npm` invocation in PowerShell can be blocked by execution policy on this workstation, while `npm.cmd` works and is the safer command form for manual verification.
- The local production app has been verified listening on `0.0.0.0:3000`, and the current same-network login URL is tracked in `logs/current-school-pilot-url.txt`.
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
- `progress.md` records what was actually done
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
| `src/app/dashboard/page.tsx` | scaffolded admin overview page | authenticated request | roadmap-oriented dashboard screen | implemented |
| `src/app/dashboard/quick/students/page.tsx` | mobile-first active student quick search route | authenticated people session, student keyword or grade/class filters | compact student result cards with full authorized active-student details | implemented for Step 7 task-entry optimization |
| `src/app/dashboard/quick/inspection/page.tsx` | mobile-first inspection quick entry route | inspection-recorder session, target type/date/item parameters | focused student or teacher quantification entry form that stays in quick-entry flow after save | implemented for Step 7 task-entry optimization |
| `start-school-pilot.cmd` | Windows double-click workstation pilot launcher | user double-click | calls the school-pilot PowerShell helper from the project root | implemented for Step 7 pilot hardening |
| `package-for-school.cmd` | home-computer transfer packager | project files | creates a zip under `artifacts\school-transfer` while excluding local data, dependencies, build output, logs, backups, and `.env.local` | implemented for Step 7 transfer convenience |
| `setup-school-workstation.cmd` | school-computer first-run setup launcher | extracted project, local PostgreSQL, Node.js or winget install path | checks or installs prerequisites, prepares PostgreSQL user/database, prepares `.env.local`, installs dependencies, syncs schema, optionally seeds demo data, builds, and starts the pilot site | implemented for Step 7 transfer convenience |
| `setup-dev-workstation.cmd` | multi-computer development setup launcher | a cloned GitHub repository on a developer computer | prepares Git/Node/npm, Git identity, local `.env.local`, dependencies, and Prisma Client for Codex-assisted development | implemented for Step 7 collaboration convenience |
| `start-work.cmd` | pre-Codex work sync launcher | clean local Git worktree | pulls the latest GitHub code, refreshes generated Prisma Client, and copies the standard Codex memory-bank prompt to the clipboard | implemented for Step 7 collaboration convenience |
| `save-work.cmd` | end-of-session save launcher | local code changes | runs typecheck and lint, commits with an operator-provided message, rebases on the remote branch, and pushes to GitHub | implemented for Step 7 collaboration convenience |
| `scripts/package-for-school.ps1` | transfer package builder | project files and optional output path | zip file suitable for copying to the school office computer | implemented for Step 7 transfer convenience |
| `scripts/setup-school-workstation.ps1` | first-run school workstation setup | project files, optional winget, PostgreSQL admin password, environment options | prerequisite checks, optional Node.js/PostgreSQL install attempts, app PostgreSQL role/database bootstrap, initialized app environment, schema sync, optional demo data, production build, and pilot startup | implemented for Step 7 transfer convenience |
| `scripts/setup-dev-workstation.ps1` | developer-computer setup helper | cloned repository, optional Git identity, optional winget | checks or installs Git and Node.js, configures repository safety and commit identity, creates `.env.local` from `.env.example`, installs dependencies, and generates Prisma Client | implemented for Step 7 collaboration convenience |
| `scripts/start-work.ps1` | GitHub sync helper before Codex work | clean Git branch | fast-forward pulls from GitHub, installs missing dependencies when needed, regenerates Prisma Client, and copies the standard Codex startup prompt | implemented for Step 7 collaboration convenience |
| `scripts/save-work.ps1` | GitHub save helper after Codex work | modified Git branch and commit message | optionally verifies with typecheck/lint, stages, commits, rebases, and pushes the current branch | implemented for Step 7 collaboration convenience |
| `scripts/start-school-pilot.ps1` | workstation pilot startup helper | project files, optional missing dependencies, optional public host override | prepares `NEXTAUTH_URL`, prints LAN access guidance, builds the app, and starts Next.js in production mode | implemented for Step 7 pilot hardening |
| `scripts/autostart-school-pilot.cmd` | current-user logon auto-start helper | current Windows user logon, existing build, current `.env.local` | launches the school-pilot site in the background after this Windows account signs in | implemented for Step 7 hardening |
| `src/app/dashboard/structure/page.tsx` | school structure route entry | authenticated request, query status | structure management screen | implemented |
| `src/app/dashboard/users/page.tsx` | user management route entry | system-admin session, query status | user and permission management screen | implemented for Step 7 |
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
| `src/app/dashboard/exports/page.tsx` | export center route entry | authenticated request, report filters | inspection summary dashboard and export links | implemented |
| `src/app/dashboard/exports/inspection/xlsx/route.ts` | inspection report Excel export | filters, role context | multi-sheet `.xlsx` export with detail rows plus summary sheets | implemented |
| `src/app/dashboard/exports/inspection/csv/route.ts` | inspection report CSV export | filters, role context | `.csv` detail export with target-type-specific columns | implemented |
| `src/app/dashboard/data-management/page.tsx` | data management route entry | system-admin session, query filters | guarded data management center | implemented for Step 7 operations |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler | auth requests | session and auth responses | implemented |
| `src/components/auth/login-form.tsx` | Bootstrap admin login UI | username and password | sign-in attempt and redirect | implemented |
| `src/components/shell/dashboard-shell.tsx` | internal admin layout shell | authenticated user name, role, current route, current query view, and child content | consistent archive-style backend shell with ink-green sidebar navigation, single people entry, sticky status header, role display, and flat working canvas | implemented |
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
| `src/lib/validation/reporting.ts` | report filter validation | export center filters | validated report filter payloads | implemented |
| `src/lib/app-config.ts` | app metadata and dashboard highlight config | static config | UI labels and descriptions | implemented |
| `src/modules/school-structure` | school structure module: page, actions, queries, and structure-specific UI helpers | admin form input | canonical school structure records | implemented |
| `src/modules/users` | user permissions module: page, actions, queries, and role-management flows | system-admin forms | canonical login users and permission assignments | implemented for Step 7 |
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
| `docs/deployment-and-smoke-test.md` | deployment and verification guide | target environment details | setup steps and smoke checklist | implemented for Step 7 prep |
| `docs/school-server-pilot-checklist.md` | school-side trial coordination checklist | school approval status, server and role constraints | deployment readiness checklist for leadership, IT, and trial operators | implemented for Step 7 prep |
| `docs/postgresql-install-and-acceptance-runbook.md` | PostgreSQL install and trial acceptance runbook | approved server access, project files, database credentials | step-by-step setup, app connection, and acceptance flow | implemented for Step 7 prep |
| `docs/approval-brief.md` | trial approval brief | current gaps and PostgreSQL need | concise approval request | implemented for Step 7 prep |
| `docs/security-and-deployment-plan.md` | security and deployment explanation | private deployment assumptions | answers for data safety and trial risk | implemented for Step 7 prep |
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

### School Pilot Workstation Flow

1. Operator runs `start-school-pilot.cmd` or `npm run pilot:school`.
2. `scripts/start-school-pilot.ps1` detects or accepts the public school-network IP, then rewrites `NEXTAUTH_URL` in `.env.local` for that address.
3. The script keeps `DATABASE_URL` on local PostgreSQL, prints LAN access guidance, optionally warns when manual `-PublicHost` input is needed, and starts the app in production mode on `0.0.0.0`.
4. Office PCs on the same school network access only the web application URL; PostgreSQL remains local to the workstation for the first pilot when possible.

### Project-Only School Transfer Flow

1. On the home computer, the operator runs `package-for-school.cmd` or `npm run package:school`.
2. `scripts/package-for-school.ps1` creates a timestamped zip under `artifacts\school-transfer` and excludes local runtime state: `.env.local`, `node_modules`, `.next`, `.tmp`, `logs`, `outputs`, `artifacts`, `.git`, dump files, zip files, and log files.
3. The zip is copied to the school office computer and extracted, preferably to `D:\xiaowuxitong`.
4. On the school computer, the operator runs `setup-school-workstation.cmd` or `npm run setup:school`.
5. `scripts/setup-school-workstation.ps1` checks Node.js/npm and PostgreSQL/`psql.exe`; when missing and not skipped, it attempts `winget` installation for `OpenJS.NodeJS.LTS` and `PostgreSQL.PostgreSQL.17`.
6. The setup script starts the local PostgreSQL service when possible, prompts for the `postgres` administrator password, and ensures the application role and database exist, defaulting to `school_admin` and `school_affairs`.
7. The setup script creates or updates `.env.local`, generates a fresh `NEXTAUTH_SECRET` when needed, installs npm dependencies, runs Prisma generation and schema push against the local empty PostgreSQL database, writes demo data unless `-SkipDemoSeed` is passed, builds the app, and then starts the normal school-pilot launcher.
8. This transfer path intentionally does not copy the home computer's PostgreSQL data; real school data should be entered or imported after the school workstation is initialized.

Current implementation note:

- The earlier pilot workstation database used native PostgreSQL 17 under `D:\PostgreSQL\17`, with data under `D:\PostgreSQL\data` and service `postgresql-xiaowuxitong`.
- The current migrated workstation verified on 2026-05-09 uses native PostgreSQL 17 under `C:\Program Files\PostgreSQL\17`, with data under `C:\Program Files\PostgreSQL\17\data` and service `postgresql-x64-17`.
- The current verified application database is `school_affairs` owned by `school_admin`.
- After a real reboot check, `postgresql-xiaowuxitong` is verified to auto-start cleanly as an Automatic Windows service and still listens only on `127.0.0.1:5432` and `[::1]:5432`.
- The production pilot launcher has been verified on the workstation LAN path: `.env.local` currently points `NEXTAUTH_URL` at the chosen school-network address, the app listens on `0.0.0.0:3000`, and office PCs should access only the web application URL while PostgreSQL remains local-only.
- A separate office PC on the same school network has now confirmed it can open the pilot site, so the current workstation-to-LAN access model is verified beyond localhost.
- In-app browser smoke is now verified again too, and credentials login now routes to a safe relative callback path after sign-in, so the browser stays on the host it used to open `/login` instead of being pulled to a stale `NEXTAUTH_URL`.
- The live workstation PostgreSQL database now also contains active `ProfileFieldDefinition` rows for teacher `办公室 / 职称` and student `宿舍信息 / 生源地`, so the current live people templates expose dynamic profile columns instead of only fixed columns.
- `docs/pilot-accounts-and-usage-guide.md` is now the consolidated operator handoff document for the current live pilot's account list, passwords, role usage guidance, startup steps, and basic backup or restore notes.
- The operator-facing README, deployment guide, PostgreSQL acceptance runbook, and pilot usage guide now all explicitly mention that cohort rollover also synchronizes teacher-facing grade-department names to the final active cohort set.
- The operator-facing README, deployment guide, and PostgreSQL acceptance runbook now all point to `logs/current-school-pilot-url.txt` as the source of truth for the current same-network login URL after DHCP or network changes.
- The inspection split rollout is now applied in the real local PostgreSQL database too: the schema is pushed, obvious teacher-like legacy categories can be backfilled by script, and role-based page plus export verification has been completed against a live `next start` session.
- One operational caveat is now verified: rebuilding `.next` on the workstation does not update the already running production `next start` process; the school-pilot service must be restarted after feature builds, or office PCs will continue seeing the older live process.
- A concrete failure mode of that caveat is now verified too: `/login` can still return HTML `200` while the browser shows `This page couldn’t load` because a referenced `/_next/static/chunks/*.js` file returns `404` and triggers `ChunkLoadError`; the recovery is to restart the live site process so it matches the current `.next` output.
- The lifecycle-extension browser smoke is now verified on the live workstation deployment: the system administrator can reach rollover and archive pages, school leaders can reach the archive center but not structure controls, and Grade 11 managers remain limited to their scoped active-data pages.
- The later browser-use visual smoke is now verified too: on loopback the admin can open the live teacher multi-department form, category-create UI, import picker UI, and click the student/teacher quantification switchers, while `leader1` and `grade11.manager1` still respect the expected structure and scope boundaries.
- Browser-close login persistence is now hardened for the live pilot: besides the normal `Auth.js` session token, the app now requires a dedicated browser-session cookie that has no explicit expiry and therefore disappears when the browser session ends.
- Another operational caveat is now explicit: PostgreSQL is a real Windows service and survives reboot automatically, but the web application currently does not; it is started by `scripts/start-school-pilot.ps1`, so a machine reboot requires either rerunning that launcher or adding a future Windows auto-start registration.
- The pilot launcher now validates private IPv4 candidates and falls back to parsing `ipconfig`, which prevents accidental `NEXTAUTH_URL=http://1:3000` corruption when only one LAN IP is present.
- Under the current account permissions, system-level Task Scheduler registration is blocked, so the live fallback is a Startup-folder launcher for the current Windows user rather than a machine-wide service.
- The current verified auto-start path is therefore: machine boots, this Windows account signs in, the Startup-folder `autostart-school-pilot.cmd` runs, detects the current LAN IPv4 address, and relaunches the site in the background on that current address.
- `scripts/start-school-pilot.ps1` now uses a named startup mutex for startup preparation, releases it before entering the long-running `next start` process, and checks whether port `3000` is already accepting connections, so duplicate manual or Startup-folder launches no longer race over `.env.local` while later check-only runs can still refresh the current URL.
- The launcher writes `logs/current-school-pilot-url.txt` with `LocalLoginUrl`, `SameNetworkLoginUrl`, `ComputerNameLoginUrl`, and all detected private IPv4 URL candidates so operators can recover after DHCP or network-location changes without relying on stale bookmarks such as the old `192.168.1.3`.
- A public-relay deployment path now exists for school networks that block workstation-to-device LAN access: `scripts/start-school-public-tunnel.ps1` can pair the local Next.js app with a reverse tunnel to the Tencent Cloud server `119.45.252.190`, while `start-school-public-pilot.cmd` provides the matching launcher entry point.
- The current relay design sends workstation traffic to server-local `127.0.0.1:63000` through an SSH reverse tunnel, and a dedicated `Caddy` site can proxy that relay port to a public entry point.
- The remaining deployment decision for that relay path is the final public entry shape: bare IP root replacement, dedicated IP plus port, or a more invasive path-prefix deployment.
- The current working public-access path is now the dedicated Tencent Cloud IP-plus-port entry `http://119.45.252.190:62000`, with the workstation app still running locally on port `3000` and a visible `plink` reverse-SSH session keeping the remote `62000` port forwarded over SSH `22`.
- `start-school-public-pilot.cmd` is now the one-click public startup entry: it prepares the app environment for the external base URL, ensures the visible `plink` tunnel launcher exists, opens or reuses the tunnel window, and opens a local app window that runs `npm.cmd run start -- --hostname 0.0.0.0 --port 3000`.
- A 2026-05-01 live recovery confirmed that data-heavy pages can fail with Prisma `P2022 ColumnNotFound` when the running app expects schema columns that have not yet been pushed to the live PostgreSQL database; the operational recovery is to run the Prisma schema sync against the local PostgreSQL database and then re-smoke the affected pages.
- Operator-facing docs now separate the two common `This page couldn't load` recovery paths: stale Next.js static chunks require restarting the live site process, while Prisma schema drift requires syncing the live PostgreSQL schema and rechecking the data-heavy pages.
- Operator-facing docs now also describe row-level correction and mistaken-entry deletion for people records, archived students, and routine inspection records, including the teacher deletion guard when inspection history already references that teacher.
- The remaining rollout follow-ups are now operational rather than structural: keep the current detached-process story stable when needed, manually rebind the one legacy teacher-quantification record, decide when to use cohort rollover in practice, and only later upgrade to machine-wide pre-login auto-start if the school asks for it.

### Current Auth Flow

1. User visits `/login`.
2. `src/components/auth/login-form.tsx` submits credentials through `next-auth/react`.
3. `src/lib/auth.ts` validates input, normalizes the username, and first tries to load an active database `User`.
4. If the database user exists and has a password hash, the submitted password is checked with `bcryptjs`.
5. If the database is unavailable or no matching database user is found, the Bootstrap admin credentials from environment variables remain available as a fallback.
6. On success, NextAuth creates a JWT-backed session with the user id, role, and optional `managedGradeId`.
7. The login form also writes a separate browser-session cookie with no explicit expiry, so it disappears when the browser session ends.
8. `getBrowserBoundServerSession()` now treats a session as valid only when both the NextAuth session and the browser-session cookie are present.
9. `/dashboard` routes check that browser-bound session server-side before rendering the app shell.
10. Domain routes add explicit server-side role checks before allowing sensitive actions.
11. Grade-scoped roles derive their allowed grade from the session and enforce it again inside people, inspection, and reporting server logic.

### User Management Data Flow

1. A system administrator opens `/dashboard/users`.
2. The server checks `requireSystemAdmin()` before loading or mutating users.
3. User form input is validated by `src/lib/validation/users.ts`.
4. The trial role model supports `SYSTEM_ADMIN`, `SCHOOL_LEADER`, `GRADE_MANAGER`, `DATA_MANAGER`, and `INSPECTION_STAFF`.
5. Grade managers must be bound to exactly one `Grade` through `User.managedGradeId`; non-grade-scoped roles clear that field.
6. New or reset passwords are hashed with `bcryptjs` before being stored in `User.passwordHash`.
7. User records are not hard-deleted; administrators can enable or disable accounts.
8. The action layer prevents the current database admin from disabling itself and prevents removing the last active system administrator.
9. User creation, role updates, status changes, and password resets write `AuditLog` entries.

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
