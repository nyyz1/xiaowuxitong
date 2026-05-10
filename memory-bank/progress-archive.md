# Progress Archive

This file keeps a compressed milestone history for older work that no longer needs to stay in the active `progress.md` log.

## 2026-05-08

- Continued Step 7 UI-delivery and handoff cleanup.
- Added the final delivery checklist to the main README handoff entry path.
- Verified that several apparent Chinese-text issues were PowerShell decoding noise rather than fresh source corruption.

## 2026-05-07

- Added multi-workstation Codex development helpers: `setup-dev-workstation.cmd`, `start-work.cmd`, and `save-work.cmd`.
- Prepared GitHub-based collaboration around the public repository.
- Hardened fresh-clone startup by creating `.env.local` from `.env.example` and teaching Prisma config to load `.env.local`.
- Hardened the public-pilot launcher by auto-downloading `plink.exe` and routing local startup through `scripts/start-school-pilot.ps1`.
- Verified both local `127.0.0.1:3000/login` and public `http://119.45.252.190:62000/login` for the public tunnel path.

## 2026-05-02

- Corrected cohort-rollover department synchronization so teacher-facing grade departments reconcile against the final active cohort set.
- Repaired the live database so grade-department names match the active enrollment-year cohorts.

## 2026-05-01

- Recovered the live workstation after service and schema-drift failures.
- Fixed launcher behavior so IP detection no longer collapses to `http://1:3000`.
- Re-synced live PostgreSQL schema after Prisma `P2022 ColumnNotFound` failures and re-smoked the data-heavy pages.
- Verified that browser-close login persistence now requires a fresh browser session.
- Added current-user Windows auto-start for the pilot site after login.

## 2026-04-30

- Added delete controls for teacher and student profile categories.
- Normalized teacher-facing grade-department wording to enrollment-year labels such as `2025级年级`.

## 2026-04-29

- Extended people records with teacher multi-department affiliations.
- Made teacher and student information statistics categories configurable through `ProfileFieldDefinition`.
- Refactored templates, imports, and exports so active categories drive visible columns.

## 2026-04-28

- Split routine inspection into student quantification and teacher quantification.
- Updated entry, filtering, reporting, export, and seed flows so teacher quantification binds to teachers rather than classes.
- Added backfill support for obvious legacy teacher-like inspection categories.

## 2026-04-27

- Removed showcase and local-demo surfaces and re-scoped the live app to six business modules only.
- Kept `src/app/dashboard/**` as thin route entries and moved module-specific logic under the owning module folders.
- Completed the low-risk de-academic-year compatibility pass while preserving `AcademicYear` as a hidden compatibility layer.

## 2026-04-26

- Refactored lifecycle logic from `高一/高二/高三` stage labels to enrollment-year cohorts such as `2023级 / 2024级 / 2025级`.
- Added automatic archive labels such as `2022级入学 / 2025届毕业`.
- Updated archive imports, exports, templates, and demo data to the new cohort model.

## 2026-04-25

- Diagnosed the live workstation mismatch between rebuilt `.next` output and an older still-running `next start` process.
- Documented that a fresh build alone does not update the running live site until the launcher restarts the service.
- Clarified that Auth.js default session persistence is longer than some operators expected and then enforced browser-session logout semantics for the pilot.

## 2026-04-24

- Expanded product scope around rollover, alumni archive, class-count adjustment, teacher multi-duty support, and live pilot approval constraints.
- Installed and verified native PostgreSQL on the pilot workstation.
- Seeded and smoke-checked the approved Grade 11 pilot role pack.
- Added database backup and restore guidance for live trial operations.

## 2026-04-23

- Established the initial private school affairs system direction.
- Chose the version-1 stack around Next.js, TypeScript, Prisma, Auth.js, PostgreSQL, Zod, and xlsx.
- Confirmed that school structure, people records, routine inspection, and exports would be the core early modules.
