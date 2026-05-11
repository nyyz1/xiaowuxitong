# Lessons

## 2026-05-11 - Schema sync must cover admin and data-management pages too

- Trigger: after the approval-role and approval-routing work, `/dashboard/users`, `/dashboard/data-management`, and `/dashboard/people` all showed `This page couldn't load` while login and static chunks were still healthy.
- Pattern: schema drift is not limited to obvious data-entry pages; role, approval, and audit schema changes can break administrator pages and data-management pages that join across many models.
- Rule: after schema-affecting changes, run the live Prisma schema sync and smoke `/dashboard/users`, `/dashboard/data-management`, `/dashboard/people`, `/dashboard/approvals`, and the existing data-heavy pages before declaring the pilot recovered.

## 2026-05-11 - Schema roles are not fully shipped until the operator docs speak the same language

- Trigger: the V1.5 application approval module replaced the old demo-oriented `DATA_MANAGER` and `INSPECTION_STAFF` roles with school job roles, but some handoff docs still said 数据管理员 and 常规检查员 after the code and database had moved on.
- Pattern: role-enum migrations can be technically correct while operator guides, smoke tests, and account tables still train people on the previous permission model.
- Rule: after any role-model or workflow module change, search the public docs, acceptance runbooks, task lists, and memory-bank together; update role labels, seed commands, and smoke paths in the same cleanup pass.

## 2026-05-10 - Keep launcher docs anchored to the real entry script, not yesterday's inner command

- Trigger: the public-pilot launcher had already been refactored to reuse `scripts/start-school-pilot.ps1`, but `README.md` and the deployment guide still told readers it directly ran `npm.cmd run start -- --hostname 0.0.0.0 --port 3000`.
- Pattern: launcher internals can change for good reasons like dependency checks, build creation, or duplicate-start protection, while high-level docs keep repeating an older subordinate command and silently drift out of date.
- Rule: when a double-click entry point delegates to another script, document the real entry script as the source of truth and describe the responsibilities it centralizes, instead of hard-coding the older inner command in multiple docs.

## 2026-05-10 - Keep active progress logs short and push old churn into milestone archives

- Trigger: `memory-bank/progress.md` had grown into a multi-thousand-line mix of current state, old migration failures, launcher experiments, and resolved UI feedback, making the file hard to use as a same-day handoff tool.
- Pattern: once a project leaves bootstrap and enters repeated stabilization cycles, the daily active log and the long-term historical record stop being the same document shape.
- Rule: keep `progress.md` optimized for current verified state plus recent changes, and move older resolved churn into a separate milestone archive instead of forcing every future maintainer to reread obsolete debugging detail first.

## 2026-05-09 - Treat each migrated PostgreSQL install as its own verified shape

- Trigger: after moving the project to a new workstation, the docs still described the earlier D-drive PostgreSQL pilot, but the setup path had installed PostgreSQL as `postgresql-x64-17` under `C:\Program Files\PostgreSQL\17\data`.
- Pattern: a successful school-computer setup can produce a valid PostgreSQL installation whose service name, data directory, and tool paths differ from the original pilot workstation; assuming the old path makes `psql`, `pg_dump`, and handoff notes misleading.
- Rule: during migration acceptance, verify the actual PostgreSQL service name, data directory, tool directory, application database owner, and `.env.local` connection string before running schema sync or smoke tests. Prefer `npm.cmd run ...` on Windows when PowerShell blocks direct `npm`.

## 2026-05-08 - Keep production sidebar hierarchy stable unless the visual change is explicit

- Trigger: after the people page was split by student and teacher mode, the user pointed to the sidebar and asked to remove the visible `学生档案 / 教师档案` entries under `师生档案`.
- Pattern: a workflow can have separate internal modes without needing separate sidebar children; adding navigation depth changes the operator's visual map more than adding page-level focus.
- Rule: when adding student/teacher focus to an existing production module, preserve query-state or page-level switching first. Only add nested sidebar entries if the user explicitly asks for that visible hierarchy and keeps that direction after seeing it.

## 2026-05-02 - Rollover department sync must use the final active cohort set

- Trigger: after the first department-name rollover fix, the user reported that teacher-related department names still did not synchronize correctly.
- Pattern: updating only the just-archived or graduating department name is too narrow; real rollover state can include skipped target years, prior partial rollovers, or no newly archived cohort, so the department table must be reconciled against the final active cohort set.
- Rule: when synchronizing teacher-facing grade department names, derive the expected years from the post-rollover active `Grade.enrollmentYear` set, then rename stale `XXXX级年级` department-name segments to the missing active years while leaving unrelated departments and assignments untouched.

## 2026-05-01 - Business page server errors can be schema drift, not a bad route

- Trigger: after restoring `/login`, the user reported that `师生档案`, `往届存档`, `常规检查`, and `统计导出` all showed `This page couldn't load / A server error occurred`.
- Pattern: login and static assets can be healthy while data-heavy server-rendered pages fail because the live PostgreSQL schema is behind the current Prisma schema; Prisma may surface this as `P2022 ColumnNotFound`.
- Rule: after any schema-affecting code change meant for the live pilot URL, run the schema sync against the live PostgreSQL database and smoke the main data pages, not just `/login`.

## 2026-05-01 - Duplicate Windows launcher starts can take the site down before Next starts

- Trigger: attempting to recover the live pilot through the Startup-folder launcher kicked off overlapping startup instances that both tried to rewrite `.env.local`.
- Pattern: a launcher can fail before `next start` if multiple instances race over environment-file reads and writes, leaving port `3000` offline even though PostgreSQL and `.env.local` are otherwise healthy.
- Rule: Windows pilot launchers should use a single-start guard and exit cleanly when port `3000` is already serving the site.

## 2026-04-27 - When the user wants inspectable modules, remove non-business surfaces and thin the routes too

- Trigger: the user asked not just for code cleanup, but specifically for all retained functionality to be organized as six independent business modules and for showcase/local-demo features to be removed.
- Pattern: a codebase can already have feature folders, but still feel unmodular if route handlers, overview entry points, launch scripts, and presentation-only features remain scattered around them.
- Rule: when the user asks for modular inspection-friendly structure, keep the app router thin, move module-specific page and export/template logic under the owning module, and remove non-business surfaces that blur the module boundaries.

## 2026-04-27 - Do not treat discovery as completion when a tracked refactor is still open

- Trigger: the user had to point out that the approved low-risk de-academic-year pass was still unfinished after the repo had only been reread and summarized.
- Pattern: for cross-module refactors, context gathering and partial status reporting can look like progress while the real task remains open across code, visible copy, docs, and verification.
- Rule: when a task already exists in `tasks/todo.md`, keep it open until the visible workflow changes, memory/docs updates, and verification steps are all complete in the same slice.

## 2026-04-27 - Keep compatibility layers when the user asks for a lower-risk rollout

- Trigger: the user approved removing academic-year concepts from the front-end and business workflows, but explicitly asked to keep the `AcademicYear` table for compatibility instead of deleting it immediately.
- Pattern: user-facing simplification and schema cleanup are related but not identical changes; coupling them in one pass adds risk to structure, import/export, permission, and reporting flows.
- Rule: when the user chooses a low-risk rollout, first remove the business dependency and visible wording, then keep the legacy table or relation as an internal compatibility layer until a later dedicated schema-cleanup step.

## 2026-04-24 - Resume interrupted sessions from tracked state, not memory

- Trigger: the previous run was interrupted before completion, and the user had to explicitly ask for a `/memory-bank` reread and step confirmation.
- Pattern: interrupted coding sessions often leave a mix of partial code edits, stale docs, and unfinished verification; guessing the current step from memory is unreliable.
- Rule: after any interrupted run, reread `/memory-bank`, inspect `tasks/todo.md`, verify the current implementation-plan step, and rerun verification before assuming the work is complete.

## 2026-04-24 - Trial approvals can change core authorization scope

- Trigger: the user received real school approval details, including network access, local PostgreSQL placement, one super admin, school-leader accounts, and grade-scoped manager accounts.
- Pattern: once a project moves from demo to real trial, deployment and role assumptions often become concrete and can require schema-level permission refactors.
- Rule: when a user reports an approved trial model, treat it as a product and architecture change, update the PRD first, and then enforce the scope server-side instead of only changing page copy.

## 2026-04-24 - Academic-year rollover rules must become explicit data model rules

- Trigger: the user expanded the product with automatic grade promotion, alumni archiving, an archive center, batch class-count changes, and teacher multi-duty support.
- Pattern: once a school describes year-transition behavior in operational terms, grade labels like “高一/高二/高三” are no longer just display text; they become lifecycle states that affect visibility, editing, and retention.
- Rule: when a user adds school-year rollover and archive behavior, update the PRD and schema first, model active-versus-archived cohorts explicitly, and avoid hiding the behavior in ad hoc UI-only logic.

## 2026-04-24 - Pilot rollout scope can narrow without changing the full data model

- Trigger: the user narrowed the first real rollout to Grade 11 on a single workstation, even though the system still models the whole school and keeps cross-grade reference data.
- Pattern: a real pilot often uses a smaller operational slice than the product's long-term model; if docs and seed accounts keep the generic defaults, stakeholders see conflicting rollout plans.
- Rule: when the rollout narrows to one grade or one host machine, update seeded users, read-only permissions, launch scripts, smoke-test steps, and leadership materials to match the actual pilot while keeping the broader schema intact unless the user changes product scope.

## 2026-04-24 - Real PostgreSQL catches seed issues that local simulation can miss

- Trigger: after installing the real workstation PostgreSQL instance, `scripts/seed-demo-postgres.mjs` failed on missing `updatedAt` values and on inserting grade-scoped `User` rows before the referenced `Grade` rows existed.
- Pattern: seed scripts that bypass Prisma and write through raw `pg` can pass in lightweight simulation but still fail on real PostgreSQL constraints, especially `@updatedAt` columns and foreign-key ordering.
- Rule: whenever a pilot moves from simulation to a real PostgreSQL instance, rerun the real seed path early and verify timestamp columns and insert order before assuming the seed script is production-ready.

## 2026-04-24 - On Windows, validate Prisma table restores through stdin-fed SQL

- Trigger: the live backup-and-restore rehearsal succeeded, but repeated `psql -c` validation attempts falsely reported missing tables because PowerShell stripped the quotes around Prisma's mixed-case table names like `"User"` and `"InspectionRecord"`.
- Pattern: on Windows PowerShell, quoted PostgreSQL identifiers can be mangled when passed through a complex native-command argument string, making a healthy restore look broken.
- Rule: when validating this project's PostgreSQL backups on Windows, feed SQL into `psql` through stdin or a `.sql` file instead of a heavily escaped `-c` string whenever the query touches Prisma's quoted table names.

## 2026-04-24 - Demo pages must expose implemented evidence

- Trigger: the user noticed that the local demo ran, but did not visibly show the implemented people-management Excel import/export work.
- Pattern: a leadership demo must include clickable evidence for each claimed capability, not only a summary table or description.
- Rule: when preparing a no-database demo, map every completed business capability to a visible demo action, downloadable artifact, or clearly labeled explanation of what is simulated versus what needs PostgreSQL.

## 2026-04-24 - Keep double-click launchers diagnosable

- Trigger: the user double-clicked `start-local-demo.cmd`; it flashed and closed before showing the login page.
- Pattern: Windows double-click launchers must not close immediately on failure, or non-technical users cannot report the real error.
- Rule: any user-facing `.cmd` launcher should keep the window open after exit, print a clear Chinese error message, and write a log file before being considered demo-ready.

## 2026-04-23 - Do not freeze school structure as static data

- Trigger: the user clarified that each grade's class count must be adjustable inside the system, and that departments and subjects must support add, remove, and rename flows.
- Pattern: treat school structure as configurable master data, not hard-coded reference data.
- Rule: when planning admin systems, explicitly confirm whether organizational dictionaries must be editable in-app before locking scope or schema behavior.

## 2026-04-24 - Do not mutate historical grade rows during promotion

- Trigger: implementing the new year rollover exposed that directly moving existing `Grade` rows into the new academic year would make old inspection records appear under the wrong academic year in reporting.
- Pattern: current-state people data can move forward each year, but historical reporting still depends on the original grade and class records staying attached to the old academic year.
- Rule: when implementing academic-year promotion in a school system, create new active grade and class rows for the next year, move current students forward, and keep the old structural rows in place for history instead of mutating them in place.

## 2026-04-25 - On the pilot workstation, a new build is not enough without restarting the live service

- Trigger: the user logged into the school LAN URL after the lifecycle work and reported that none of the new pages or controls were visible.
- Pattern: on this Windows workstation deployment, `npm run build` updates `.next`, but the already running `next start` process continues serving the older code until the pilot service is restarted.
- Rule: after any feature build meant for the live pilot URL, verify the current port-`3000` process start time against the latest build timestamps and restart the school-pilot service before claiming the deployment is updated.

## 2026-04-25 - Auth.js default session persistence is longer than school operators expect

- Trigger: the user closed the browser, reopened the pilot URL, and was surprised that the system auto-entered the previously logged-in account again.
- Pattern: `Auth.js` credential sessions persist by default through a cookie with an explicit expiry, so browser restart does not mean logout unless the app adds its own browser-session rule.
- Rule: for this school pilot, do not assume “close browser” implies logout; if the product expectation is browser-close reauthentication, verify the actual `Set-Cookie` behavior and enforce an explicit browser-session boundary in the app.

## 2026-04-25 - PowerShell launcher helpers must preserve a single detected IP as a full string

- Trigger: after reboot, the pilot site was down and `.env.local` had been rewritten to `NEXTAUTH_URL=http://1:3000`.
- Pattern: in PowerShell, a function that emits one string can be treated as a scalar instead of an array; indexing `[0]` then returns the first character, not the full IP address.
- Rule: when a launcher returns candidate IP addresses, always normalize the result with `@(...)` before indexing and validate that the chosen value is a real private IPv4 address before writing it into environment files.

## 2026-04-25 - Verify the actual startup artifact, not just the registration step

- Trigger: a system-level scheduled task could not be created, the first hidden `vbs` startup helper did not reliably restore the site, and only the later Startup-folder `cmd` launcher passed a real bring-up test.
- Pattern: Windows auto-start setup can look correct on paper while the real artifact still fails to launch the app at login or startup.
- Rule: after wiring any Windows auto-start path for this project, execute that exact startup artifact once, wait for port `3000`, and verify `/login` before treating the setup as complete.

## 2026-04-26 - Enrollment-year redesign must update demos and templates in the same slice

- Trigger: the user replaced the old `高一 / 高二 / 高三` model with `2023级 / 2024级 / 2025级` active cohorts plus `2022级入学 / 2025届毕业` archive labels.
- Pattern: if schema and business logic switch to enrollment-year cohorts but demo datasets, import templates, and archive copy keep the old stage wording, stakeholders will assume the feature was only half-finished.
- Rule: when this project changes cohort semantics, update schema helpers, rollover logic, active/archive queries, import/export templates, and demo/seed data together before calling the slice complete.
