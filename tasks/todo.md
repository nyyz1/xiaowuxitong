# Current Task Plan

## Step 7 knowledge cleanup and handoff consistency

- [x] Reconcile the public-pilot launcher docs with the current `start-school-public-tunnel.ps1` behavior so reader-facing docs no longer claim the launcher runs raw `npm.cmd run start`.
- [x] Tighten the dashboard-shell architecture wording so the topbar behavior matches the current desktop-sticky and mobile-non-sticky implementation.
- [x] Record the cleanup result in `memory-bank/progress.md` and `tasks/lessons.md`.

## Step 7 deeper documentation pruning

- [x] Add a single `docs/README.md` entry point so handoff documents are grouped by daily use, deployment, and migration workflows.
- [x] Remove stale live-workstation wording that treated the historical C-drive migrated machine as the current default.
- [x] Compress `memory-bank/progress.md` into an active log and move older milestone history into `memory-bank/progress-archive.md`.

## Paused Step 7 full-site elegant UI and final delivery wrap-up

- [x] Re-read required memory-bank files and map the task to Step 7 stabilization and handover.
- [x] Start the modern light visual-system pass in `src/app/globals.css`.
- [x] Refine the shared dashboard shell, login page, dashboard overview, and shared submit button styling.
- [x] Fix the compatibility academic-year mojibake from `瀛﹀勾` to `学年`.
- [x] Add `docs/final-delivery-checklist.md`.
- [x] Query the database for the exact legacy `教师发展中心检查 / 考试监考检查` record; current local DB returned no exact match, so nothing was deleted.
- [x] Run `npm.cmd run typecheck`.
- [x] Run `npm.cmd run lint`.
- [x] Run `npm.cmd run build`.
- [x] Fix any static or build issues from the paused UI edits.
- [x] Run browser visual smoke across login, dashboard, six business modules, data management, student quick search, and quick inspection entry.
- [x] Run role-boundary smoke for `admin`, `leader1`, `grade11.manager1`, `data.manager`, and `inspector`.
- [x] Update `memory-bank/architecture.md` after verification.
- [x] Link `docs/final-delivery-checklist.md` from README or the main operator handoff docs if appropriate.
- [x] Review git status and commit the UI/delivery slice separately from earlier cleanup work if possible.

## Step 7 school computer transfer convenience

- [x] Restate the request as a Step 7 deployment and handoff convenience task: move only the project code to the school office computer, without carrying the current home database data.
- [x] Add a home-computer packaging launcher that excludes local data, build output, dependencies, logs, backups, and `.env.local`.
- [x] Add a school-computer first-run launcher that prepares `.env.local`, installs dependencies, syncs an empty PostgreSQL schema, optionally seeds demo data, builds, and starts the pilot site.
- [x] Add npm command aliases for the packaging and setup scripts.
- [x] Document the one-click transfer workflow and prerequisites.
- [x] Run static script syntax checks and targeted lint/type verification.

## Step 7 school workstation prerequisite automation

- [x] Treat prerequisite automation as a Step 7 deployment convenience refinement, not a product-scope change.
- [x] Add Node.js/npm detection and winget-based Node.js LTS install attempt to the school workstation setup script.
- [x] Add PostgreSQL/psql detection and winget-based PostgreSQL 17 install attempt to the school workstation setup script.
- [x] Add PostgreSQL service startup, admin-password prompt, and automatic application role/database creation for `school_admin` and `school_affairs`.
- [x] Update transfer docs so the one-click path explains which steps are fully automatic and which may need school computer permissions or PostgreSQL admin password.
- [x] Run script syntax checks and static verification.

## Step 7 migrated workstation acceptance cleanup

- [x] Verify the actual migrated PostgreSQL service, install path, data path, tool path, app database, and app role.
- [x] Repair `school_admin / school_affairs` so `.env.local` can connect with the default application URL.
- [x] Sync Prisma schema, seed the trial dataset, and smoke-check the authenticated business pages.
- [x] Update handoff docs and memory records so the current C-drive PostgreSQL install, `npm.cmd` workaround, and pg_dump fallback are visible to the next maintainer.

## Step 4/5 mistaken-entry correction and deletion

- [x] Confirm existing people and inspection detail panels already support row editing.
- [x] Add guarded delete actions for mistaken teacher, student, archived-student, and inspection-record entries.
- [x] Block teacher hard delete when inspection records already reference that teacher.
- [x] Write deletion audit logs for people and inspection correction actions.
- [x] Update operator docs and memory-bank records so the correction workflow is visible to the next handoff.
- [x] Run targeted lint, typecheck, build, and full lint verification.

## Step 4 people records sidebar cleanup

- [x] Confirm the requested removal refers to the sidebar `学生档案 / 教师档案` submenu shown under `师生档案`.
- [x] Restore `师生档案` to a single sidebar menu entry.
- [x] Update memory-bank and lessons for the UI correction.
- [x] Run targeted verification.

## Step 4 people records secondary entry split

- [x] Restate the request and map it to Step 4 teacher/student master data, with Step 7 navigation stabilization impact.
- [x] Add student-record and teacher-record secondary entries under the `师生档案` navigation item.
- [x] Let `/dashboard/people` focus on the selected student or teacher record view while preserving role boundaries.
- [x] Update memory-bank records after verification.
- [x] Run targeted lint/type/build verification.

## Step 7 data management center

- [x] Add a system-admin-only data management module and route.
- [x] Show grouped data table counts, filters, pagination, row previews, and read-only audit logs.
- [x] Implement single-row, selected-row, and fixed one-click cleanup actions.
- [x] Require PostgreSQL backup before every hard delete and record backup/delete audit logs.
- [x] Wire the sidebar and dashboard entry for system administrators only.
- [x] Extend docs and memory-bank notes for the new operational workflow.
- [x] Run lint, typecheck, build, and targeted smoke checks.

## Step 7 demo data cleanup command

- [x] Confirm the seeded demo data uses fixed IDs from `scripts/demo-data.mjs`.
- [x] Add a delete-only PostgreSQL cleanup script for fixed seeded demo rows.
- [x] Add npm commands for real cleanup and dry-run preview.
- [x] Update handoff docs and memory-bank notes.
- [x] Verify the cleanup dry-run and static checks.

## Step 3 cohort rollover teacher department sync correction

- [x] Diagnose why the first department-name rollover fix did not update all teacher-facing grade department names.
- [x] Change rollover sync from a single archived-cohort rename to final-active-cohort reconciliation.
- [x] Repair the current live database department names without changing teacher/student/grade/class relationships.
- [x] Rebuild and restart the live pilot site so future rollovers use the corrected rule.
- [x] Verify static checks, live department names, and live login reachability.

## Step 4 identity and legacy fixed profile-field configurability

- [x] Add teacher/student `idCardNumber` as the import update and uniqueness identifier.
- [x] Extend `ProfileFieldDefinition` so legacy fixed profile fields can be enabled, disabled, deleted, and restored through the same category UI.
- [x] Move teacher `工号` and student `学籍号` out of import identity matching and into configurable profile-field handling.
- [x] Update people forms, templates, imports, exports, demo data, and simulation coverage for the new identity model.
- [x] Confirm no additional schema change is needed for this check; update memory docs and re-run static/demo verification.

## Step 4 profile categories and department naming refinement

- [x] Add a delete action for teacher/student profile categories in the people records module.
- [x] Expose delete controls beside the existing add and enable/disable category controls.
- [x] Replace grade-department seed/template wording such as `2025级年级部` with `2025级年级`.
- [x] Run targeted verification and update `memory-bank/progress.md` plus `memory-bank/architecture.md`.

## Step 4 people records extension: multi-department teachers and configurable information statistics categories

- [x] Update product and implementation docs so Step 4 explicitly includes teacher multi-department affiliations plus configurable teacher or student information statistics categories before changing schema.
- [x] Extend the Prisma schema for teacher multi-department assignments, configurable profile-field definitions, and teacher or student profile data storage.
- [x] Refactor people validation, actions, and queries so teacher create or update, student create or update, and teacher department filtering all work with the new data model.
- [x] Refactor the people and alumni-archive pages so active categories can be maintained in the UI and their fields appear in teacher or student forms plus detail views.
- [x] Refactor teacher or student import, export, and template generation so downloaded templates and files reflect the current active categories.
- [x] Update demo data, PostgreSQL seed, and PGlite simulation so the new schema remains verifiable.
- [x] Run verification for Prisma generation, lint, typecheck, build, local simulation, and dry-run seed checks.
- [x] Update `memory-bank/progress.md`, `memory-bank/architecture.md`, and `tasks/todo.md` after the result is verified.

## Routine inspection student/teacher quantification split

- [x] Update product and planning docs so routine inspection explicitly includes student quantification and teacher quantification before changing schema.
- [x] Extend the Prisma schema so teacher quantification records can bind to teachers while existing student quantification records remain grade/class based.
- [x] Refactor inspection validation, actions, queries, and page UI so the module is split into student quantification and teacher quantification views.
- [x] Refactor reporting filters, summaries, and exports so teacher quantification aggregates by teacher instead of class.
- [x] Update demo data, PostgreSQL demo seed, and PGlite simulation so the new inspection model remains verifiable.
- [x] Run verification for Prisma generation, lint, typecheck, build, local simulation, and database validation.
- [x] Update `memory-bank/progress.md`, `memory-bank/architecture.md`, and `tasks/todo.md` after the result is verified.

## Step 3 and Step 4 lifecycle extension

- [x] Update product memory and planning docs for the new rollover and archive requirements before changing schema.
- [x] Extend the Prisma schema for grade lifecycle metadata, archived students, and teacher multi-duty storage.
- [x] Implement school-structure actions and UI for batch class-count adjustment and academic-year rollover.
- [x] Hide archived cohorts from the main people page and add a dedicated alumni archive center with query, edit, import, and export support.
- [x] Implement teacher multi-duty support across create, edit, import, export, and page display.
- [x] Update demo data, PostgreSQL demo seed, and PGlite simulation so the new schema remains verifiable.
- [x] Run verification for schema generation, lint, typecheck, build, database push, dry-run seed, and Prisma validation.
- [x] Update `memory-bank/progress.md`, `memory-bank/architecture.md`, and `tasks/lessons.md` with the finished result.

## Follow-up

- [x] Do one browser smoke pass for `/dashboard/structure`, `/dashboard/people`, and `/dashboard/archive/students` on the live workstation deployment.
- [x] Re-verify the live workstation deployment across `/dashboard/structure`, `/dashboard/people`, `/dashboard/inspection`, and `/dashboard/exports` after the low-risk grade-first compatibility pass, including admin, school-leader, and grade-manager role scope checks.
- [x] Apply the new people-records schema to the live workstation PostgreSQL database.
- [x] Restore one stable live site process on `0.0.0.0:3000` and harden the launcher so duplicate startup attempts no longer race over `.env.local`.
- [x] Run one true browser-interaction smoke for teacher multi-department edit UI, statistics-category creation UI, import file-picker UI, and the student-versus-teacher inspection or export switchers.
- [x] Resync the live PostgreSQL schema after Prisma `P2022 ColumnNotFound` errors and reverify `/dashboard/people`, `/dashboard/archive/students`, `/dashboard/inspection`, and `/dashboard/exports`.
- [x] Harden the pilot against LAN changes by keeping login redirects on the current host and writing the current access URLs to `logs/current-school-pilot-url.txt`.
- [ ] Manually rebind the one legacy `教师发展中心检查 / 考试监考检查` record from class scope to the correct teacher in the teacher-quantification page.
- [x] Fix the live pilot so closing and reopening the browser requires a fresh login instead of auto-entering the previous account.
- [x] Configure the current Windows account to auto-start the web app after login, so the site no longer depends on manually rerunning the launcher every time.
- [ ] If the school later wants pre-login machine-wide auto-start, complete that with an administrator account and a real Windows task or service.
- [ ] Decide whether to use the new academic-year rollover flow immediately or keep it ready for the next school-year boundary.

## Step 3 and Step 4 enrollment-year cohort refactor

- [x] Replace stage-based grade metadata with enrollment-year cohort metadata in the Prisma schema and shared lifecycle helpers.
- [x] Refactor school-structure validation, rollover actions, and structure UI to create and manage enrollment-year cohorts.
- [x] Refactor people, alumni archive, inspection, reporting, and user-scope queries to use enrollment-year active/archive rules.
- [x] Update student archive routing and import/export templates so active and archived cohort labels follow the new display format.
- [x] Update demo data, PostgreSQL demo seed, and PGlite simulation so the new cohort model stays verifiable.
- [x] Run verification for schema generation, lint, typecheck, build, local simulation, and database validation.
- [x] Update `memory-bank/progress.md`, `memory-bank/architecture.md`, and `tasks/lessons.md` with the finished result.

## Low-risk de-academic-year compatibility pass

- [x] Update `memory-bank/prd.md` and `memory-bank/implementation-plan.md` so the approved low-risk compatibility approach is explicit before code changes.
- [x] Remove remaining academic-year wording from the visible structure page, while keeping `AcademicYear` as a hidden compatibility layer in the data model.
- [x] Keep manual grade creation and cohort rollover server-managed through compatibility `AcademicYear` records, without re-exposing academic-year CRUD in the UI.
- [x] Remove academic-year dependence from student import/export, grade-scope options, inspection filters, reporting filters, and related query shapes so business flows operate on grade and class only.
- [x] Update local demo routes, templates, exports, and visible dashboard copy so example flows no longer mention academic years.
- [x] Run verification for lint, typecheck, build, local simulation, and targeted smoke-level code review of the affected grade, people, inspection, and reporting flows.
- [x] Update `memory-bank/progress.md`, `memory-bank/architecture.md`, and `tasks/lessons.md` after the compatibility pass is verified.

## Six-module cleanup and structure pass

- [x] Update planning docs so the app is explicitly scoped to six business modules only: school structure, user permissions, people records, alumni archive, routine inspection, and statistics export.
- [x] Remove the showcase and local-demo routes, menu entries, homepage entry points, helper code, and launch scripts.
- [x] Keep `src/app/dashboard/**` as thin route entry points and move remaining business page or route logic under the six module directories wherever it is still scattered.
- [x] Standardize the six module folders so each module owns its page component plus related actions, queries, and export/template helpers.
- [x] Update shared shell navigation, dashboard overview copy, and app config so only the six business modules remain visible.
- [x] Update README, docs, and memory-bank records to remove demo/showcase guidance and describe the six-module structure.
- [x] Run verification for lint, typecheck, and build after the restructuring.

## Reporting export detail columns adjustment

- [x] Add target-type-specific inspection detail rows for reporting exports.
- [x] Update Excel and CSV exports so student quantification includes date, item, grade, class, value, and remarks.
- [x] Update Excel and CSV exports so teacher quantification includes date, item, teacher name, value, and remarks.
- [x] Run targeted verification for reporting export builders and document the result.
