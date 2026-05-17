# Project Agent Instructions

These instructions apply to the whole project. Keep them in mind for every task.

---

## Read This First

Before making structural or architectural decisions, consult:

- docs/ARCHITECTURE.md
- docs/COMPONENT_GUIDELINES.md
- docs/DATA_GUIDELINES.md
- docs/SUPABASE_PATTERNS.md
- docs/ANTI_PATTERNS.md
- docs/PR_CHECKLIST.md

These files define the preferred way of building in this repository.

If guidance conflicts, follow:

ARCHITECTURE.md → DATA_GUIDELINES.md → COMPONENT_GUIDELINES.md

---

## Workflow

- Prefer small, safe changes that can be reviewed quickly.
- Use `rg` for searching and `rg --files` for file discovery.
- Avoid rewriting files unless necessary; target the smallest edit.
- If you can’t complete a task, explain why and propose the next best step.

---

## Architecture Awareness

- Default to **Server Components**.
- Keep data fetching close to the domain (feature-based structure).
- Prefer Server Actions over API routes unless clearly inappropriate.
- Avoid introducing client state when server state is sufficient.

When creating a new domain, use:

docs/templates/feature-template/

---

## Code Style

- Match existing formatting and patterns in the file you edit.
- Keep components focused and small.
- Favor typed data flows. Avoid `any` unless unavoidable and documented.
- Avoid hidden side effects. Keep data fetching explicit.

If a component grows large or hard to read — split it.

---

## Component Rules

UI components should:

- Be presentation-focused
- Receive data via props
- Avoid direct data fetching
- Avoid business logic

Container components may connect data to UI but should remain readable.

Refer to:

docs/COMPONENT_GUIDELINES.md

---

## Data & Supabase

- Keep reusable queries in `utils/data.ts`.
- Place domain-specific queries inside feature folders.
- Server components must use server clients.
- Client components must use browser clients.

Every schema change must include:

- RLS policies  
- grants  
- a migration/backfill plan  

Validate inputs at system boundaries.

See:

docs/DATA_GUIDELINES.md  
docs/SUPABASE_PATTERNS.md  

---

## Database Changes

- Prefer additive migrations.
- Avoid destructive operations unless requested.
- Document reasoning when altering production data paths.

---

## Testing

- If no test suite exists, describe how you validated changes.
- If tests are not run, say so explicitly.

---

## Git

- Avoid touching unrelated files.
- Do not change `.gitignore` unless asked.
- When committing, include only relevant files.

Use docs/PR_CHECKLIST.md before merging major work.

---

## Documentation

When behavior affects:

- data flow  
- rendering strategy  
- component structure  
- database access  

→ update the relevant file in `/docs`.

Do not allow architecture knowledge to live only in code.

---

## Anti-Patterns (Strict)

Avoid:

- Fetching inside UI components  
- Massive utils folders  
- Smart UI components  
- Global state by default  
- Copy-pasted queries  

See:

docs/ANTI_PATTERNS.md
