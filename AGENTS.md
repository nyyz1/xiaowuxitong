# AGENTS.md

## Working Agreement

Before writing or editing code, always read these files in order:

1. `memory-bank/prd.md`
2. `memory-bank/tech-stack.md`
3. `memory-bank/implementation-plan.md`
4. `memory-bank/progress.md`
5. `memory-bank/architecture.md`

If one of these files is missing, stale, or clearly incomplete:

- say what is missing
- propose the smallest update needed
- do not guess core product requirements

## Default Workflow

For every non-trivial task:

1. Restate the task in clear bullets.
2. Identify which step in `memory-bank/implementation-plan.md` the task belongs to.
3. Make a small plan before editing.
4. Change only the files required for the current step.
5. Verify the result with tests, lint, or explicit manual validation.
6. Update `memory-bank/progress.md` and `memory-bank/architecture.md` after each meaningful change.

Do not start the next implementation-plan step until the current step has been verified.

## Engineering Rules

- Prefer the simplest robust stack.
- Prefer mature libraries and hosted services over custom infrastructure.
- Build the smallest useful vertical slice first.
- Keep modules small and single-purpose.
- Avoid giant files, hidden global state, and implicit coupling.
- Do not edit unrelated files.
- When requirements are unclear, stop and ask concise clarifying questions.
- When adding a dependency, explain why existing dependencies are insufficient.
- For bug fixes, find the root cause before patching symptoms.
- For refactors, preserve behavior unless the task explicitly changes behavior.

## Document Maintenance Rules

- `memory-bank/prd.md`: update when product scope, users, or acceptance criteria change.
- `memory-bank/tech-stack.md`: update when a tooling or dependency decision is made.
- `memory-bank/implementation-plan.md`: mark completed steps and refine future steps when reality changes.
- `memory-bank/progress.md`: append what changed, how it was validated, and what comes next.
- `memory-bank/architecture.md`: record module responsibilities, data flow, and system boundaries.

## Bootstrap Rule

If the repository is still empty or only contains planning files:

1. complete `memory-bank/prd.md`
2. choose the simplest viable stack in `memory-bank/tech-stack.md`
3. scaffold only the minimum project skeleton needed for the first implementation step

## Output Style

When reporting progress:

- be concrete about what changed
- call out what was verified and what was not
- list blockers and open questions separately
