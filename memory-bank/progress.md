# Progress

## How To Read This File

- This file now keeps a short active log plus the current verified project state.
- Older milestone history has been compressed into `memory-bank/progress-archive.md`.
- For the live pilot's current operator passwords, login URLs, and daily usage rules, use `docs/pilot-accounts-and-usage-guide.md` as the source of truth.

## Current Verified State

- The app is scoped to six live business modules: school structure, user permissions, people records, alumni archive, routine inspection, and statistics export.
- The live pilot workstation currently uses native PostgreSQL 17 under `D:\PostgreSQL\17` with data under `D:\PostgreSQL\data` and service `postgresql-xiaowuxitong`.
- The current live pilot's operator passwords, database passwords, and login URLs are maintained in `docs/pilot-accounts-and-usage-guide.md`, not duplicated across every handoff document.
- The dashboard shell now uses a desktop sidebar, mobile drawer navigation, and a mobile-non-sticky topbar so narrow screens keep more usable height.
- Homepage cleanup has removed process-facing status clutter such as the old RBAC explainer, the `私有部署` badge, and the `下一阶段任务` card.
- Inspection save feedback now returns to the record-entry area, and student grade/class selectors now use linked dependent selection in people maintenance.
- The school-pilot and public-pilot launchers are both hardened around real workstation use: duplicate-start protection, current-LAN-IP refresh, relative callback safety, and public-tunnel startup through `scripts/start-school-pilot.ps1`.
- Historical milestone detail before 2026-05-09 is summarized in `memory-bank/progress-archive.md`.

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

- User asked for a `neat-freak` cleanup pass focused on整理项目内容 rather than another feature slice.
- Re-read the required memory-bank files and the named `neat-freak` skill, then treated the work as documentation, handoff, and project-memory cleanup only.
- Changes made in the first cleanup pass:
  - updated `README.md` and `docs/deployment-and-smoke-test.md` so the public-pilot launcher now correctly points to `scripts/start-school-pilot.ps1` instead of claiming it directly runs raw `npm.cmd run start`
  - tightened `memory-bank/architecture.md` so the dashboard shell is described as desktop-sticky but mobile-non-sticky, matching the implemented topbar behavior
  - updated `tasks/todo.md` and `tasks/lessons.md` so the launcher-doc drift is recorded as completed cleanup work plus a reusable lesson
- Changes made in the deeper cleanup pass:
  - added `docs/README.md` as a categorized document index for daily pilot use, deployment and acceptance, and migration or collaboration
  - linked that new doc index and the live pilot operator guide from the root `README.md`
  - rewrote the reader-facing “current workstation” addenda in `docs/deployment-and-smoke-test.md`, `docs/school-transfer-one-click.md`, and `docs/postgresql-install-and-acceptance-runbook.md` so they no longer present the historical `C:\Program Files\PostgreSQL\17` migrated machine as the current live default
  - clarified in those docs that `school_password` examples are initialization defaults, not the current live workstation password
  - compressed this file into an active log and moved older milestone history into `memory-bank/progress-archive.md`
- Verification:
  - re-read `README.md`, `docs/README.md`, `docs/deployment-and-smoke-test.md`, `docs/school-transfer-one-click.md`, `docs/postgresql-install-and-acceptance-runbook.md`, `memory-bank/architecture.md`, `tasks/todo.md`, and `tasks/lessons.md`
  - confirmed the main reader-facing docs no longer claim the public launcher runs raw `npm.cmd run start`
  - confirmed the current-workstation notes now point back to `docs/pilot-accounts-and-usage-guide.md` instead of repeating stale live-password assumptions
- Risks or blockers:
  - this cleanup stayed entirely in docs and project-memory files; it did not alter runtime behavior or rerun build tooling

## 2026-05-09

- User provided a Step 7 operator-feedback pass across homepage, inspection entry, people maintenance, and mobile topbar behavior.
- Changes made:
  - moved successful inspection-save feedback down into the record-entry section and anchored full-page inspection saves back to `#record-entry`
  - removed the `检查人` wording from inspection remarks placeholders and later fixed the mobile quick-entry remarks placeholder to `备注，如有实际需要可以填写，如具体情况、整改要求等`
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
