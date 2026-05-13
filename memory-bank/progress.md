# Progress

## How To Read This File

- This file now keeps a short active log plus the current verified project state.
- Older milestone history has been compressed into `memory-bank/progress-archive.md`.
- For the cloud deployment, account operating guidance, login URL, and daily usage rules, use `docs/pilot-accounts-and-usage-guide.md` and `docs/tencent-lighthouse-deployment.md` as the source of truth.

## Current Verified State

- The app is scoped to seven live business modules: school structure, user permissions, people records, alumni archive, routine inspection, application approval, and statistics export.
- The current live environment is Tencent Cloud Lighthouse `124.222.136.121`, with the app and PostgreSQL hosted on the same Ubuntu server.
- The cloud app runs from `/opt/xiaowuxitong/app`, stores PostgreSQL backups under `/opt/xiaowuxitong/backups`, and is managed by systemd service `xiaowuxitong` behind Nginx.
- The cloud PostgreSQL database currently has no old demo/test dataset; demo seeding and PGlite simulation are local development tools only.
- Cloud operator guidance and the public login URL are maintained in `docs/pilot-accounts-and-usage-guide.md`, while server deployment and update details are maintained in `docs/tencent-lighthouse-deployment.md`.
- The main README now stays compact and points readers to the operator doc index plus the live pilot guide instead of repeating long handoff detail in one place.
- The dashboard shell now uses a desktop sidebar, mobile drawer navigation, and a mobile-non-sticky topbar so narrow screens keep more usable height.
- Homepage cleanup has removed process-facing status clutter such as the old RBAC explainer, the `私有部署` badge, and the `下一阶段任务` card.
- Inspection save feedback now returns to the record-entry area, and student grade/class selectors now use linked dependent selection in people maintenance.
- Windows school-pilot and public-pilot launchers remain historical/backup tooling and are not the current deployment path.
- Historical milestone detail before 2026-05-09 is summarized in `memory-bank/progress-archive.md`.

## 2026-05-11

- User asked to implement the desktop `PLAN.md` for teacher/student accounts and department-position ownership.
- Changes made:
  - added `AccountType`, `User.accountType`, `User.isSuperAdmin`, `User.studentId`, student login relations, `DepartmentPosition`, and `TeacherDepartmentAssignment.positionId` to the Prisma schema
  - added account helpers so new teacher imports and new active student imports create bound login accounts from identity card numbers, with initial password equal to the identity-card-number last 8 characters and no password reset on update imports
  - added `/dashboard/account/password` plus self-service password-change action; student accounts are redirected away from business routes and kept to password maintenance in this phase
  - added department-position helpers, default position generation for grade departments, school leadership, and ordinary departments, and structure-page UI/actions for adding, updating, enabling/disabling, and deleting unreferenced department positions
  - updated user management around account type, student/teacher binding, highest-administrator capability, and compatibility role handling
  - added `scripts/seed-department-positions.mjs`, `npm.cmd run db:seed:department-positions`, and `npm.cmd run smoke:positions`
  - pushed the schema to the local PostgreSQL database and seeded default department positions for existing departments
- Verification:
  - `npm.cmd run db:generate`
  - `npm.cmd run db:validate`
  - `npx.cmd prisma db push --accept-data-loss`
  - `npm.cmd run db:seed:department-positions`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run smoke:positions`
  - `npm.cmd run build`
  - `npm.cmd run smoke:pages`
- Result:
  - the six data-heavy smoke pages still return `200`
  - department-position derived permission assertions pass
  - the only `db push` warning was the new unique constraint on `User.studentId`; the push completed successfully

- User reported that after syncing the latest GitHub code, `/dashboard/users`, `/dashboard/data-management`, `/dashboard/people`, `/dashboard/archive/students`, `/dashboard/approvals`, and `/dashboard/exports` showed `This page couldn't load`.
- Recovery and hardening:
  - reproduced the authenticated page failures and confirmed the live database was missing the new `User.teacherId` column
  - ran the approval-role migration, then `npx.cmd prisma db push --accept-data-loss` after confirming the old role values had already been remapped
  - hardened `scripts/seed-approval-pilot-config.mjs` so the approval pilot seed can repair a missing standard teacher profile and the standard `校务办公室` department instead of failing on a fresh or partially seeded database
  - added `scripts/smoke-authenticated-pages.mjs` plus `npm.cmd run smoke:pages` to automatically log in and verify the affected data-heavy pages return `200` without Next.js server-error markers
  - rebuilt and restarted the live pilot service so the running process matches the new `.next` output
- Verification:
  - `npm.cmd run db:migrate:approval-roles`
  - `npx.cmd prisma db push --accept-data-loss`
  - `npm.cmd run db:seed:approval-defaults`
  - `npm.cmd run db:seed:approval-pilot`
  - `npm.cmd run smoke:pages`
  - `npm.cmd run db:generate`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - live service restarted and `npm.cmd run smoke:pages` passed again against `http://127.0.0.1:3000`
- Result:
  - all six reported pages now return `200`: users, data management, people, archive students, approvals, and exports
  - root cause was schema drift after syncing code with the newer V1.5 permission/approval schema, with an additional seed-script assumption that made approval pilot repair brittle

- User asked for a project tidy-up pass.
- Cleanup:
  - tightened `README.md` so the main handoff surface stays short and points readers to `docs/README.md` and `docs/pilot-accounts-and-usage-guide.md`
  - kept the current live values centralized in the operator guide instead of repeating them across the README
  - left runtime code unchanged; this was a docs and project-memory cleanup pass only
- Verification:
  - re-read the required memory-bank files and the `neat-freak` skill before editing
  - checked the current doc map and active handoff surface for stale or duplicated guidance
  - no build or typecheck was needed because the change stayed in markdown and memory records

- User asked for a `$neat-freak` project cleanup pass after the Step 8 approval work and the schema-drift recovery.
- Documentation cleanup:
  - reconciled README, deployment smoke guide, final delivery checklist, PostgreSQL acceptance runbook, security/deployment plan, pilot account guide, and lessons with the current approval pilot seed and 2026-05-11 schema-drift recovery
  - added `db:seed:approval-pilot` to first-use and acceptance paths where the standard pilot approval configuration is expected
  - expanded server-error troubleshooting from the earlier four data-heavy pages to include `/dashboard/users`, `/dashboard/data-management`, and `/dashboard/people`
  - recorded the operational smoke surface after schema-affecting role or approval changes in `memory-bank/architecture.md`
- Verification:
  - read the required memory-bank files and neat-freak instructions before editing
  - enumerated high-value project docs and checked for stale role, approval seed, and schema-drift wording with `rg`
  - docs-only change; no runtime build or typecheck was needed for this cleanup pass

- User reported `/dashboard/users`, `/dashboard/data-management`, and `/dashboard/people` all showed `This page couldn't load`.
- Recovery:
  - authenticated route probes confirmed all three pages were returning server-side `500` with `__next_error__`, while referenced `/_next/static/chunks/*.js` assets returned `200`, so this was not a stale chunk failure
  - `npm.cmd run db:validate` confirmed the Prisma schema was valid
  - `npx.cmd prisma db push` synchronized the live PostgreSQL schema with the current Prisma schema
  - rechecked `/dashboard/users`, `/dashboard/data-management`, and `/dashboard/people` with an authenticated admin session and confirmed all now return `200` without `__next_error__`
  - checked `/dashboard/people` script dependencies and found no failed chunk requests
- Verification:
  - `npm.cmd run db:validate`
  - `npx.cmd prisma db push`
  - authenticated HTTP smoke for `/dashboard/users`, `/dashboard/data-management`, and `/dashboard/people`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
- Result:
  - the three broken pages are reachable again on the local pilot service
  - root cause was live database schema drift after recent Step 8 schema changes, not missing frontend chunks

- User asked to resume the interrupted "学校日常岗位与审批权限配置方案 plan and continue from the current execution point.
- Continued Step 8 application approval verification and pilot configuration:
  - added `scripts/seed-approval-pilot-config.mjs` plus `npm.cmd run db:seed:approval-pilot` and dry-run command
  - seeded the live PostgreSQL pilot database with `teacher.wangming` bound to teacher profile `王明`, plus `logistics.office` and `admin.office`
  - seeded standard active approval responsibilities for repair, teaching-use printing, `2024级` grade-administrative printing, school-administrative printing for `校务办公室`, and other daily requests
  - tightened approval decision authorization so school leaders no longer have blanket approval power; outside system-admin fallback, an account must match an active approval responsibility
  - updated README, deployment smoke docs, pilot account guide, implementation plan, architecture notes, and task tracking for the executable pilot approval configuration
- Verification:
  - `npm.cmd run db:seed:approval-pilot:dry-run`
  - `npm.cmd run db:seed:approval-defaults`
  - `npm.cmd run db:seed:approval-pilot`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - authenticated HTTP access to `http://127.0.0.1:3000/dashboard/approvals` for `teacher.wangming`, `logistics.office`, `admin.office`, `grade11.manager1`, `leader1`, and `admin`
  - transaction-rolled-back database assertions confirmed repair routes to `logistics.office`, teaching printing to `data.manager`, grade-admin printing to `grade11.manager1`, school-admin printing to `admin.office`, and other requests to `leader1`; `teacher.wangming` cannot approve requests, `leader1` cannot approve unrelated repair or print requests, and `admin` retains system-admin fallback approval
- Risks or blockers:
  - the in-app browser plugin timed out during connection, so screenshot-level visual smoke for `/dashboard/approvals` remains a follow-up even though authenticated route and business-rule smoke passed
  - the currently running `3000` process was started earlier in the day; after code updates, operators should restart the school-pilot service before relying on the tightened approval permission behavior in the browser

- User asked to implement the V1.5 application and approval module for daily repair, daily material printing, and other configured application types, then added that printing applications must track print quantity.
- Changes made:
  - expanded the Prisma role model to the new school job roles and added teacher-profile binding on user accounts
  - added approval request models, approval type configuration, approval responsibility configuration, approval logs, print material type, print mode, paper size, and print quantity
  - added `/dashboard/approvals` with teacher request submission, visible request tracking, approval/rejection actions, and system-admin configuration forms
  - implemented routing by approval responsibility, including logistics repair routing and material-print routing by teaching, grade administrative, or school administrative use
  - updated user management so one-line teacher accounts can be bound to teacher profile records
  - added `scripts/seed-approval-defaults.mjs` and `npm.cmd run db:seed:approval-defaults` for default repair, printing, and other request types
  - updated the dashboard shell and homepage to expose application approval as a first-class module
  - updated `memory-bank/prd.md`, `memory-bank/implementation-plan.md`, and `memory-bank/architecture.md` for the new V1.5 module
- Verification so far:
  - `npm.cmd run db:generate`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd run test:demo-db`
  - `npm.cmd run db:validate`
  - `npm.cmd run db:migrate:approval-roles`
  - `npx.cmd prisma db push --accept-data-loss` after confirming old `DATA_MANAGER` and `INSPECTION_STAFF` values had already been remapped
  - `npm.cmd run db:seed:approval-defaults`
- Risks or blockers:
  - live browser smoke has not yet been run for `/dashboard/approvals`
  - existing teacher self-service accounts still need to be created or bound to teacher profile records before teachers can submit requests themselves

- User then asked for a `neat-freak` project tidy-up after the V1.5 application approval implementation.
- Changes made for that cleanup pass:
  - reconciled `README.md`, deployment smoke docs, delivery checklist, security notes, roadmap docs, and the V1.5 executable plan with the current seven-module app shape
  - updated operator-facing account and acceptance docs from the old data-manager / inspection-staff wording to the current school job-role model
  - added application-approval acceptance coverage, including approval default seeding, teacher profile binding, repair requests, printing requests, print material type, print mode, paper size, print quantity, approval comments, and audit checks
  - rewrote `docs/final-delivery-checklist.md` into a clean current handoff checklist after finding it was no longer reliable for the new module and role model
  - updated `tasks/todo.md` and `tasks/lessons.md` so the remaining approval smoke follow-ups and role-doc drift lesson are visible
- Verification:
  - re-read the required memory-bank files and the named `neat-freak` skill before editing
  - enumerated current Markdown documentation and checked high-signal stale terms with `rg`
  - left historical archived references in place where they describe the state at that earlier milestone
- Risks or blockers:
  - this cleanup pass changed docs and project-memory files only; it did not rerun runtime build tooling
  - `/dashboard/approvals` still needs a live browser smoke after teacher self-service accounts and real approval responsibilities are configured

## 2026-05-10

- User then asked to implement the V1.5 / V2 / deferred roadmap plan and produce a leadership-facing PPTX for school reporting.
- Changes made for that planning and reporting pass:
  - added `docs/product-roadmap-v1-5-v2.md` as a V1.5 / V2 / deferred roadmap based on the current single-school V1 system and mature SIS capability patterns
  - added `docs/v1-5-executable-plan.md` as a two-week V1.5 execution plan focused on data quality, import preflight, reusable filters/export templates, student 360, and a lightweight attendance or leave-design gate
  - generated `docs/roadmap-leadership-brief-v1-5-v2.pptx` as a 10-slide leadership decision deck
  - updated `docs/README.md` so the new roadmap, execution plan, and PPTX are discoverable from the document index
  - kept this as planning material only and did not change code, schema, dependencies, or the approved V1 product scope
- Verification:
  - re-read the required `memory-bank` files before editing
  - rendered all 10 PPTX source slides to PNG previews and inspected the preview montage
  - re-imported the saved PPTX through the presentation runtime, rendered all 10 imported slides, and inspected the imported-preview montage
  - inspected the PPTX package with Python `zipfile`, confirming 10 slide XML parts, no media payload issues, and no visible slide hits for sensitive placeholders such as passwords or database connection values
- Risks or blockers:
  - the bundled presentation quality script could not complete because its `unzip` command dependency is unavailable in the current Windows shell, so package inspection was performed with a custom Python zip check instead
  - V1.5 remains a recommendation until the school explicitly approves the next implementation scope and the PRD is updated

- User then asked for a `neat-freak` tidy-up pass after the recent quick-student search refinements.
- Changes made for that cleanup pass:
  - reviewed `README.md`, the operator docs index, and the live pilot guide against the latest quick-student-search behavior instead of appending more scattered notes
  - updated `docs/pilot-accounts-and-usage-guide.md` so operators now have an explicit `/dashboard/quick/students` usage note covering dormitory-number lookup, case-insensitive dorm matching, and the grade-first class-selection rule
  - kept the cleanup intentionally narrow and did not rewrite unrelated deployment or acceptance docs because those files do not currently explain quick-student usage details
- Verification:
  - re-read `README.md`
  - enumerated current `docs/*.md`
  - searched docs and task files for quick-search references with `rg`
- Risks or blockers:
  - this cleanup pass did not include another runtime build because it only aligned operator-facing documentation with already-verified code behavior

- User then asked to tighten the Step 7 student quick-search grade/class filters so class lookup must be driven by the chosen grade instead of showing mixed classes from every grade.
- Changes made for that quick-search scope refinement:
  - added `src/app/dashboard/quick/students/quick-student-scope-fields.tsx` as a small client-side linked selector for the quick-student page
  - updated `src/app/dashboard/quick/students/page.tsx` to use the linked selector, so operators must select a grade before choosing a class
  - limited quick-search class options to the currently selected grade only, while still inferring the grade automatically when an existing class query parameter is opened directly
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Risks or blockers:
  - this pass did not include a fresh in-browser click-through on `/dashboard/quick/students`; verification stayed at static checks and production build coverage

- User then clarified that school dormitory numbers are alphanumeric and should be treated case-insensitively, so `C123` and `c123` must behave as the same dormitory in quick search.
- Changes made for that dormitory-case refinement:
  - updated `src/modules/people/helpers.ts` so student profile values for fields whose names contain `宿舍` are normalized to uppercase during manual form saves and spreadsheet imports
  - updated `src/modules/people/queries.ts` so student quick search now performs dormitory matching in a case-insensitive way by normalizing the keyword and comparing against the student profile dormitory values in memory after the normal grade/class scope filter
  - kept this refinement scoped to student dormitory fields and did not change unrelated profile-field normalization rules
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Risks or blockers:
  - old dormitory values that were already saved in mixed case still remain stored as-is until edited or re-imported, but the quick-search match path now treats them case-insensitively

- User asked to extend the Step 7 student quick-search flow so dormitory numbers can be used as a keyword and return all linked students.
- Changes made for that quick-search refinement:
  - updated `src/modules/people/queries.ts` so `/dashboard/quick/students` augments the normal student keyword query with JSON `profileData` matches against active student profile fields whose names contain `宿舍`
  - updated `src/app/dashboard/quick/students/page.tsx` so the quick-search title, input placeholder, and empty-state helper copy now explicitly mention `宿舍号`
  - kept the dormitory-number search scope limited to the quick-search route and did not change the broader people-management page behavior in this pass
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Risks or blockers:
  - dormitory-number matching currently depends on the student profile field name containing `宿舍`; if the school later renames that field to unrelated wording, quick-search dorm matching will need the same naming rule updated

- User provided a Step 7 login-page cleanup pass to remove trial-only explanatory copy from `/login`.
- Changes made for that Step 7 cleanup:
  - removed the left-side explanatory paragraph under the login hero from `src/components/auth/login-form.tsx`
  - removed the `3 / 6+1 / 1` statistics strip from the login hero
  - removed the helper paragraph under `账号登录`
  - removed the bootstrap-admin hint panel at the bottom of the login card while leaving the actual login fields and fallback placeholder behavior unchanged
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Risks or blockers:
  - this pass did not include an in-browser visual refresh after build; verification stayed at static and production-build checks

- User provided a focused Step 4 people-module UI refinement: split teacher and student status options by business meaning instead of reusing the old shared `正常 / 停用` pair.
- Changes made for that Step 4 refinement:
  - added `src/modules/people/status-options.ts` as the shared source of truth for teacher statuses (`正常 / 备孕 / 产假 / 长病假`) and student statuses (`正常 / 休学 / 长期请假`)
  - updated people and alumni-archive validation, form dropdowns, filter dropdowns, export labels, and quick-student status rendering to use the shared status definitions
  - expanded import normalization so spreadsheet values such as `休学`, `长期请假`, `备孕`, `产假`, and `长病假` map into the new stored status values
  - adjusted the quick status action so active students default to `长期请假` and active teachers default to `长病假` when switching away from `正常`, while still supporting direct restore to `正常`
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Risks or blockers:
  - this pass did not include a fresh browser smoke on `/dashboard/people` or `/dashboard/archive/students`; verification stayed at static checks and code-path consistency

- User asked for a `neat-freak` cleanup pass focused on鏁寸悊椤圭洰鍐呭 rather than another feature slice.
- Re-read the required memory-bank files and the named `neat-freak` skill, then treated the work as documentation, handoff, and project-memory cleanup only.
- Changes made in the first cleanup pass:
  - updated `README.md` and `docs/deployment-and-smoke-test.md` so the public-pilot launcher now correctly points to `scripts/start-school-pilot.ps1` instead of claiming it directly runs raw `npm.cmd run start`
  - tightened `memory-bank/architecture.md` so the dashboard shell is described as desktop-sticky but mobile-non-sticky, matching the implemented topbar behavior
  - updated `tasks/todo.md` and `tasks/lessons.md` so the launcher-doc drift is recorded as completed cleanup work plus a reusable lesson
- Changes made in the deeper cleanup pass:
  - added `docs/README.md` as a categorized document index for daily pilot use, deployment and acceptance, and migration or collaboration
  - linked that new doc index and the live pilot operator guide from the root `README.md`
  - rewrote the reader-facing current-workstation addenda in the deployment guide, the historical Windows transfer notes, and the PostgreSQL acceptance runbook so they no longer presented the historical `C:\Program Files\PostgreSQL\17` migrated machine as the current live default
  - clarified in those docs that `school_password` examples are initialization defaults, not the current live workstation password
  - compressed this file into an active log and moved older milestone history into `memory-bank/progress-archive.md`
- Verification:
  - re-read `README.md`, `docs/README.md`, `docs/deployment-and-smoke-test.md`, the historical Windows transfer notes, `docs/postgresql-install-and-acceptance-runbook.md`, `memory-bank/architecture.md`, `tasks/todo.md`, and `tasks/lessons.md`
  - confirmed the main reader-facing docs no longer claim the public launcher runs raw `npm.cmd run start`
  - confirmed the current-workstation notes now point back to `docs/pilot-accounts-and-usage-guide.md` instead of repeating stale live-password assumptions
- Risks or blockers:
  - this cleanup stayed entirely in docs and project-memory files; it did not alter runtime behavior or rerun build tooling

## 2026-05-09

- User provided a Step 7 operator-feedback pass across homepage, inspection entry, people maintenance, and mobile topbar behavior.
- Changes made:
  - moved successful inspection-save feedback down into the record-entry section and anchored full-page inspection saves back to `#record-entry`
  - removed the `检查人` wording from inspection remarks placeholders and later fixed the mobile quick-entry remarks placeholder to `澶囨敞锛屽鏈夊疄闄呴渶瑕佸彲浠ュ～鍐欙紝濡傚叿浣撴儏鍐点€佹暣鏀硅姹傜瓑`
  - added linked student grade/class selector behavior through `src/modules/people/student-scope-fields.tsx`
  - removed duplicate `系统管理员 · 系统管理员` wording from the topbar
  - made the mobile topbar non-sticky
  - removed low-value quick-task helper sentences and aligned quick-task hover behavior with the lower module cards
  - removed the global RBAC explainer, the `私有部署` badge, and the homepage `下一阶段任务` card
  - unified top-right actions and made `退出登录` always visibly rendered as a secondary action
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - authenticated route and role-boundary smoke for `admin`, `leader1`, `grade11.manager1`, `data.manager`, and `inspector`
- Follow-up:
  - screenshot-level browser visual comparison is still a nice-to-have future pass when convenient, but the Step 7 operator-facing slice is already statically and behaviorally verified

## 2026-05-12

- User asked for a `$neat-freak` documentation cleanup after the project deployment and development workflow changed substantially.
- Documentation cleanup:
  - rewrote `README.md` around the current Tencent Cloud Lighthouse deployment, local development -> GitHub -> server deploy workflow, and cloud PostgreSQL data boundary
  - rewrote `docs/README.md`, `docs/deployment-and-smoke-test.md`, `docs/pilot-accounts-and-usage-guide.md`, `docs/final-delivery-checklist.md`, `docs/security-and-deployment-plan.md`, and `docs/postgresql-install-and-acceptance-runbook.md` so the cloud deployment is the main path
  - deleted obsolete Windows workstation approval, transfer, and server-pilot checklist docs from the active docs set
  - removed old Windows workstation, LAN URL, public tunnel, local PostgreSQL password, and default demo-account guidance from the active handoff surface
  - updated `memory-bank/prd.md`, `memory-bank/tech-stack.md`, and `memory-bank/implementation-plan.md` so the product, stack, and plan agree that Tencent Cloud server-local PostgreSQL is the current deployment shape
  - clarified that the cloud PostgreSQL database does not carry old demo/test data and that demo seeding/PGlite simulation are local development helpers only
- Verification:
  - reread the required memory-bank files and the named `neat-freak` skill before editing
  - inspected the server bootstrap/deploy/backup scripts to anchor docs to the real update sequence
  - searched active docs and memory records for stale workstation, tunnel, LAN, demo-data, and cloud-deployment terms
  - docs-only change; no runtime build or typecheck was needed

- User asked to implement the Tencent Cloud Lighthouse deployment plan for server-side app plus PostgreSQL hosting and future one-command updates.
- Changes made:
  - added Linux server scripts under `scripts/server/` for first-time Ubuntu bootstrap, one-command deployment updates, and PostgreSQL custom-format backups with retention
  - added `scripts/deploy-tencent-lighthouse.ps1` as a local SSH entrypoint for triggering the server update script with the provided Lighthouse host and key path
  - added `docs/tencent-lighthouse-deployment.md` and linked it from the README
  - recorded the new Lighthouse deployment shape in `memory-bank/architecture.md`
- Intended deployment shape:
  - app path `/opt/xiaowuxitong/app`
  - backup path `/opt/xiaowuxitong/backups`
  - log path `/opt/xiaowuxitong/logs`
  - local PostgreSQL database `school_affairs` owned by `school_admin`
  - Nginx public `:80` proxy to `127.0.0.1:3000`
  - `xiaowuxitong.service` managed by systemd
- Deployment refinement:
  - the Ubuntu bootstrap now defaults to the Ubuntu repository PostgreSQL packages because the external PostgreSQL 17 apt repository repeatedly hung during Tencent Cloud first-run installation; PostgreSQL 17 can still be requested later by setting `POSTGRES_VERSION=17`
- Deployment result:
  - Tencent Cloud Lighthouse `124.222.136.121` is now running the app on Ubuntu 22.04 with local PostgreSQL, Nginx reverse proxy, and systemd service `xiaowuxitong`
  - first-time bootstrap completed successfully, the live server passed the built-in authenticated smoke test, and `http://124.222.136.121/login` now returns `200`
  - the stable update path is now `scripts/deploy-tencent-lighthouse.ps1` from the Windows workstation, which SSHes into the server and runs `scripts/server/deploy.sh`
  - the server-side deployment script now backs up PostgreSQL before pulling GitHub code, syncing Prisma schema, rebuilding, restarting, and smoking the data-heavy pages
- Verification pending:
  - local `typecheck`, `lint`, and `build`
  - remote SSH bootstrap and authenticated smoke on the new server

- User asked to verify why many modules were showing "This page couldn't load" after syncing the latest code to this machine and to confirm whether the database matched the current code.
- Findings:
  - the local Git branch was already aligned with `origin/main`, so the checked-out source matched the latest remote commit on this machine
  - the live PostgreSQL database was behind the current Prisma schema before repair, missing the newer account and department-position columns that the code expects
  - authenticated smoke initially returned `500` for `/dashboard/users`, `/dashboard/data-management`, `/dashboard/people`, and `/dashboard/exports`
- Recovery:
  - ran `npx.cmd prisma db push --accept-data-loss` against the local PostgreSQL database
  - re-ran authenticated smoke and confirmed `/dashboard/users`, `/dashboard/data-management`, `/dashboard/people`, `/dashboard/archive/students`, `/dashboard/approvals`, and `/dashboard/exports` all returned `200`
- Verification:
  - `npm.cmd run db:validate`
  - `npm.cmd run smoke:pages` before repair
  - `npx.cmd prisma db push --accept-data-loss`
  - `npm.cmd run smoke:pages` after repair
  - `npm.cmd run typecheck`
- Result:
  - the page-load failures were caused by database/schema drift, not by stale source files or a bad code sync
  - the local database is now aligned with the current Prisma schema again

- User reported that each department should support adding and deleting department positions directly, and that teacher department ownership should allow multiple positions inside the same department.
- Changes made:
  - expanded `TeacherDepartmentAssignment` to use a generated `id` and a uniqueness constraint that allows the same teacher and department to carry multiple positions or identity variants
  - updated people validation and save/import helpers so teacher department assignments now accept multiple identity values per department
  - changed the teacher maintenance form so each department renders a multi-select position group instead of a single identity dropdown
  - kept the school-structure department position controls in the same page surface so operators can still add, rename, enable/disable, and delete unreferenced positions
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Result:
  - teacher records can now retain multiple department positions inside the same department
  - the department-position configuration UI and the teacher-归属部门 UI now line up with the requested multi-position behavior

- 2026-05-12 project cleanup pass:
  - reconciled the memory-bank notes with the current teacher multi-position department model
  - removed stale or garbled wording from the project memory so the handoff text matches the live behavior more closely
- Verification:
  - reread `memory-bank/prd.md`, `memory-bank/tech-stack.md`, `memory-bank/implementation-plan.md`, `memory-bank/progress.md`, and `memory-bank/architecture.md`
  - searched for stale single-select wording and corrected the remaining mismatch in the memory-bank notes
- Result:
  - the project memory now reflects the current department-position behavior without the old single-dropdown phrasing

- User reported another batch of pages showing "This page couldn't load".
- Findings:
  - `npm.cmd run smoke:pages` initially returned `500` for `/dashboard/users`, `/dashboard/data-management`, `/dashboard/people`, `/dashboard/approvals`, and `/dashboard/exports`, while `/dashboard/archive/students` still returned `200`
  - a separate dev server on `127.0.0.1:3002` reproduced the same failures, proving this was not just a stale production process on port `3000`
  - the dev-server error log showed Prisma `P2022 ColumnNotFound` on `User`, `Teacher`, `TeacherDepartmentAssignment`, and `InspectionRecord` queries
  - `prisma db push --accept-data-loss` first refused to run because `TeacherDepartmentAssignment.id` had been added as a required primary key while 16 existing assignment rows still lacked ids
- Recovery:
  - added `TeacherDepartmentAssignment.id` to the live PostgreSQL table in a transaction, backfilled ids for the 16 existing rows, changed the primary key from `(teacherId, departmentId)` to `id`, and added the new multi-position uniqueness constraint
  - reran `npx.cmd prisma db push --accept-data-loss`, which then reported the database was in sync with the current Prisma schema
- Verification:
  - `npm.cmd run db:validate`
  - `npm.cmd run smoke:pages` before repair
  - manual PostgreSQL schema inspection for `TeacherDepartmentAssignment`
  - transactional data-preserving backfill for `TeacherDepartmentAssignment.id`
  - `npx.cmd prisma db push --accept-data-loss`
  - `npm.cmd run smoke:pages` against `http://127.0.0.1:3000`
  - `npm.cmd run smoke:pages -- --base-url=http://127.0.0.1:3002`
- Result:
  - all six authenticated smoke pages now return `200` on both the live local service and the temporary dev server
  - the root cause was schema drift plus a required-column migration that needed a data-preserving prefill step, not a frontend route or chunk-loading issue

## 2026-05-12 Local Commit Push Helper

- User asked for a one-click local file to commit and push GitHub changes before running the Tencent Cloud deployment update.
- Changes made:
  - added `commit-and-push.cmd` at the project root
  - added `scripts/commit-and-push.ps1`, which checks for changes, runs `typecheck`, `lint`, and `build` by default, asks for a commit message, stages all changes, commits, rebases on the upstream branch, and pushes to GitHub
  - the script prints the next deployment command for `scripts/deploy-tencent-lighthouse.ps1` after a successful push

## 2026-05-13

- User asked to make manual teacher and student creation create accounts like imports, add a repair path for missing identity-card accounts, and provide a one-click local-to-GitHub-to-server publish flow.
- Changes made:
  - updated manual teacher creation so it creates the teacher profile and identity-card-number login account in one transaction
  - updated manual active-student creation so it creates the student profile and identity-card-number login account in one transaction, while archived-student creation still does not create a login account
  - added `scripts/repair-missing-identity-accounts.mjs` plus `npm.cmd run db:repair:identity-accounts:dry-run` and `npm.cmd run db:repair:identity-accounts` to preview and repair existing teacher or active-student profiles that are missing bound login accounts
  - added `publish-and-deploy.cmd` and `scripts/publish-and-deploy.ps1` so local verification, commit, push, Tencent Cloud deployment, and local/GitHub/server commit comparison can run from one launcher
  - enhanced `scripts/server/deploy.sh` to print deployment commit information, confirm schema sync, and run the missing identity-account dry-run during deployment
  - updated README, deployment docs, pilot account guidance, implementation plan, and architecture notes for the new account and publishing workflow
- Verification:
  - `npm.cmd run db:generate`
  - `npm.cmd run db:validate`
  - `npm.cmd run db:repair:identity-accounts:dry-run`
  - `node --check scripts/repair-missing-identity-accounts.mjs`
  - PowerShell parser checks for `scripts/publish-and-deploy.ps1` and `scripts/deploy-tencent-lighthouse.ps1`
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Result:
  - future manual teacher and active-student creation now follows the same identity-card account rule as imports
  - the local repair dry-run found 11 teacher profiles and 96 active student profiles in the local database that could receive accounts, with 18 archived students skipped and no conflicts reported
  - the preferred update path is now `publish-and-deploy.cmd`; `commit-and-push.cmd` and `scripts/deploy-tencent-lighthouse.ps1` remain available as separate lower-level steps

- User asked to implement automatic login-account creation for newly imported teacher and student records, and to make teacher compatibility roles derive from department plus position assignments.
- Changes made:
  - kept the identity-card-number account rule in the people import helpers so new teacher and active-student rows still auto-create login accounts with the last 8 characters of the identity card as the initial password
  - added teacher-role derivation helpers that treat department positions as the source of truth for compatibility role display and permission grouping
  - made teacher save flows re-sync the matching login account role after teacher profile updates, and re-sync all teachers attached to a department position after that position changes
  - changed the user-management page so teacher compatibility roles are shown as automatically derived rather than manually editable
- Verification:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Result:
  - new teacher and active-student imports continue to auto-create identity-card-number login accounts
  - teacher compatibility roles now stay aligned with the teacher's current department and position assignments instead of relying on a manually edited user role field
