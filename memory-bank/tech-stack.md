# Tech Stack

## Status

Selected for version 1 and updated for the Tencent Cloud server deployment on 2026-05-12.

## Selection Rule

Choose the simplest stack that can deliver a secure internal web system quickly, with strong form handling, filtering, and export support.

Product-specific priorities:

- one primary language end-to-end
- strong support for admin tables and forms
- relational database with clear schema evolution
- private deployment suitable for sensitive teacher and student data
- minimal infrastructure complexity for a single school

## Selected Profile

Use `Profile A: Web App`, but deploy it privately instead of using a public managed frontend platform.

## Recommended Stack

| Area | Decision | Why | Status |
| --- | --- | --- | --- |
| Product type | Internal desktop-first web app | School staff will mainly use browsers on office PCs | Selected |
| Primary language | `TypeScript` | One language for UI, server logic, validation, and tooling | Selected |
| Runtime version | `Node.js LTS` | Stable, mainstream, works well with the selected stack | Selected |
| Frontend | `Next.js` + `React` + `Ant Design` | Fast full-stack setup plus strong admin forms and tables | Selected |
| Backend | `Next.js` route handlers and server actions | Avoid a second backend service until scale requires it | Selected |
| Database | `PostgreSQL` | Reliable relational model for people, classes, inspection, approvals, and audit data; the current deployment keeps PostgreSQL local to the Tencent Cloud server | Selected |
| ORM | `Prisma` + `@prisma/adapter-pg` | Clear schema management and productive CRUD development with Prisma 7 PostgreSQL adapter support | Selected |
| Authentication | `Auth.js` with credentials login | Enough for internal role-based login in version 1 | Selected |
| Authorization | Database-backed RBAC | Export and data maintenance permissions must be explicit | Selected |
| Validation | `Zod` | Shared validation rules for forms, API input, and imports | Selected |
| Import and export | `xlsx` | Covers spreadsheet import templates, spreadsheet parsing, filtered Excel export, and report workbooks | Implemented for Step 4 and Step 6 |
| Package manager | `npm` | The scaffold currently uses `package-lock.json`; keep one package manager to avoid lockfile drift | Selected |
| Testing | `Vitest` + `Playwright` | Fast unit tests plus browser smoke coverage for critical flows | Selected |
| Local database simulation | `@electric-sql/pglite` | Allows a Postgres-compatible fake database run for local development-only simulation when PostgreSQL is unavailable | Development helper only |
| Deployment | Tencent Cloud Lighthouse Ubuntu server running native `Node.js`, local `PostgreSQL`, Nginx reverse proxy, and systemd service `xiaowuxitong` | Gives the school one stable private server path while keeping PostgreSQL off the public internet; updates are handled by backup, Git pull, schema sync, build, restart, and smoke scripts | Selected |

## Why This Stack

### Why `Next.js`

- one repository can handle UI, server logic, and auth
- quick path to build forms, tables, filters, and exports
- lower coordination cost than splitting frontend and backend on day one

### Why `Ant Design`

- school affairs systems are mostly form, table, filter, and dashboard workflows
- admin-style UI can be built quickly with less custom component work

### Why `PostgreSQL`

- school structure, people, permissions, and inspection records are strongly relational
- filtering and aggregation requirements fit SQL very well

### Why Private Deployment

- teacher and student data is sensitive
- a school affairs system is safer as a private deployment than a public internet-first app
- the current deployment keeps the database on the same Tencent Cloud server as the app and exposes only the web entry point

## Initial Module Strategy

- keep a single application until real scaling pressure appears
- keep server logic close to the product modules
- use shared schemas and permission helpers instead of ad hoc checks in each page

## Data And Security Baseline

- role-based login is required in version 1
- one highest-privilege system administrator account is the baseline for the initial trial
- grade-scoped manager permissions must be enforced server-side through database-backed role context
- PostgreSQL should stay local to the Tencent Cloud server and should not expose port `5432` publicly
- academic-year rollover and alumni visibility rules should be stored as explicit database state, not inferred only from page labels
- graduated cohorts should stay in the same relational system of record so archive-center edit, import, and export flows can reuse the existing people pipeline
- teacher multiple duties can be stored as structured multi-value data on the teacher record instead of a separate permission system
- exports must be permission-gated
- import and export actions should be auditable
- personal data should not be exposed in public routes
- prefer status flags or controlled archival over casual hard deletes for teacher and student records

## Dependency Policy

- Add dependencies only when they remove meaningful work.
- Prefer well-maintained libraries with clear documentation.
- Avoid introducing duplicate admin UI, validation, or export libraries.
- Keep version 1 boring, explicit, and easy to debug.

## Deferred Decisions

These can wait until after the first working slice:

- whether to add object storage for attachments
- whether to add message notifications
- whether to split reporting into a separate service
- whether to introduce background jobs for large exports

## Open Questions

- When the domain is approved and备案完成, what final HTTPS host should replace the current IP entry?
- Does the school need import templates for existing Excel sheets, or can we define fresh standard templates?
- Do we need password reset by admin only, or broader user self-service reset after the trial phase?
