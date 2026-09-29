# Task context: 001-employee-salary-management

> Generated for spec 547df071-01ae-4e3d-b877-1a971539a8a6 at HEAD 840ef50 · 2026-09-29
> Read first by every agent in /anthara:plan-implementer's slice loop.

**Repo state: greenfield.** Only `kata.md` and `docs/specs/001-employee-salary-management-spec.md` exist. There is no `package.json`, no `server/`, no `client/`, no test suite, no lexicon, no design system. Nothing below in §1-§5 is discovered from code — it is the concrete layout §5's slices should converge on, derived from [spec §6.4.1](001-employee-salary-management-spec.md#64-incubyte-engineering-standards) (domain-based folders), [§7.2](001-employee-salary-management-spec.md#72-architectural-style) (modular monolith, layered intra-module) and [§7.3](001-employee-salary-management-spec.md#73-module-decomposition) (module diagram). Slice 5.1 (or whichever lands first) establishes this structure for real; every later slice must conform to it rather than re-deciding it.

## 1. Affected modules (target layout — none exist yet)

| Module / file | Role | Notes |
|---|---|---|
| `server/src/employees/` | routes → service → repository for employee CRUD, directory query, export | Owns the `employees` table. Per [§7.2](001-employee-salary-management-spec.md#72-architectural-style), this is the *only* module allowed to touch the employees repository directly. |
| `server/src/compensation-reports/` | routes → service for `compensation-stats`, `headcount`, `salary-distribution` (+ their `/export` variants) | No own repository — per [§7.2](001-employee-salary-management-spec.md#72-architectural-style) it reads through `employees/employee.repository.ts`, never a private query path. Covers both 5.7 and 5.8 server-side (spec's server module list has only 3 modules; client splits reports into two nav items). |
| `server/src/seed/` | CLI seed script, RNG-seeded generators, fixed reference data (departments/countries/job levels) | Entry point for `npm run seed` (slice 5.1). |
| `server/src/db/` | SQLite connection singleton, schema/migration, a `createTestDb()`-style in-memory factory | Shared infra, not a domain module. |
| `client/src/employee-directory/` | Directory table, search/filter bar, detail panel, Add/Edit form | Slices 5.2-5.6. |
| `client/src/compensation-reports/` | Compensation Reports page (5.7) | |
| `client/src/headcount-reports/` | Headcount page (5.8) | |
| `client/src/shared/` (or `_shared/`) | Export-CSV control (used from three pages, 5.9), MUI theme, base API client | Cross-cutting; keep small — do not let unrelated helpers accumulate here (ai-ergonomics: cohesive `utils/`). |

## 2. Patterns to follow (mandated by spec, not yet instantiated)

- **Layered intra-module: routes → services → repositories.** No route executes raw SQL; no service reaches into another module's repository. Defined in [spec §7.2](001-employee-salary-management-spec.md#72-architectural-style). The first slice to add a route (5.1's seed script is a CLI, not a route — so 5.2 is likely the first real instance) sets the shape every later route/service/repository triple imitates.
- **Cross-module reads go through the owning repository.** `compensation-reports` service calls `employees/employee.repository.ts`, it does not open a second connection or duplicate a query path — per [§7.2](001-employee-salary-management-spec.md#72-architectural-style) and the module diagram in [§7.3](001-employee-salary-management-spec.md#73-module-decomposition) (`RepService --> EmpRepo`).
- **Parameterized SQL only** — every query, no string concatenation of request input, per [spec §6.2.1](001-employee-salary-management-spec.md#62-sonarjs-violations-javascript--typescript).
- **Service layer has no HTTP/SQL concerns** — compensation/headcount computation must be plain, unit-testable functions per [spec §6.3.1](001-employee-salary-management-spec.md#63-clean-code).
- **No speculative abstraction** — fixed field set, no plugin/config engine, per [spec §6.3.2](001-employee-salary-management-spec.md#63-clean-code) (YAGNI).

## 3. Reusable utilities

None exist yet. Flag anything built as shared infra as it's created (e.g. a money/minor-units converter used by both the Add/Edit form path and CSV export) so later slices reuse it instead of re-deriving it — the minor-unit ↔ major-unit conversion (invariant 4.2 / AC 5.4.5 / AC 5.9.3) is the clearest candidate for a single shared helper on both the server (storage) and read paths (export), not three separate implementations.

## 4. Adjacent code that must coordinate (per slice)

- **Slice 5.1 (seed):** `server/src/db/` (schema creation must run before insert); no other module depends on this at build time, but 5.2-5.9 all depend on the *data shapes* it commits to (department/country/job-level enums, currency-per-country mapping).
- **Slice 5.2 (directory):** `client/src/employee-directory/` table + filter bar; `server/src/employees/` routes/service/repository (this slice defines the query shape 5.9's export must mirror exactly, per invariant 4.5).
- **Slice 5.3 (detail):** detail panel component; reuses 5.2's row data; establishes the `{ code, message }` 404 error shape that 5.5 and 5.6 must reuse verbatim.
- **Slice 5.4 (add):** Add/Edit form (shared with 5.5); `employees` service create path; directory list (TanStack Query cache invalidation so the new row appears, AC 5.4.4).
- **Slice 5.5 (edit):** same form component as 5.4 (do not fork it); detail panel; directory row (both must reflect the update without refresh, AC 5.5.5).
- **Slice 5.6 (delete):** detail panel's Delete action; directory row removal; confirmation dialog.
- **Slice 5.7 (comp stats):** `compensation-reports` service reading through `employees/employee.repository.ts`; group-by control on the client.
- **Slice 5.8 (headcount):** same `compensation-reports` module as 5.7; separate client page `headcount-reports/`.
- **Slice 5.9 (CSV export):** three server export endpoints, each mirroring its sibling read endpoint's filter/group params exactly (5.2's query params, 5.7's `groupBy`, 5.8's `groupBy`/`currency`); one shared "Export CSV" client control invoked from three pages.

## 4a. Slice imitation targets

Greenfield — no adjacent code exists for any slice. The spec's own architecture (§7.2/§7.3) is the only precedent, and it names 5.2 (directory query) as the shape every subsequent `employees/` route/service/repository triple should imitate exactly (arg order: query params in → filter object → paginated rows + total). Slices 5.3-5.6 extend the same `employees` module and must reuse 5.2's repository conventions (parameter binding style, projection shape) rather than inventing new ones. Slices 5.7/5.8 are the first instance of the `compensation-reports` module — no imitation target beyond the dependency-direction rule in §7.2; establish shape carefully.

## 4b. Slice lexicon

- **5.1:** command=`npm run seed`; event=`DatabaseSeeded`; tables=`departments`, `countries`, `job_levels`, `employees`; behavior=idempotent (truncate-then-reinsert), fixed RNG seed.
- **5.2:** route=`GET /api/employees`; query params=`page`, `pageSize`, `search`, `department`, `country`, `jobLevel`, `sortBy`, `sortDir`; response shape=`{ items, total }`.
- **5.3:** route=`GET /api/employees/:id`; error=`{ code: "EMPLOYEE_NOT_FOUND", message }` (404) — this exact shape is reused by 5.5 and 5.6.
- **5.4:** route=`POST /api/employees`; event=`EmployeeCreated`; error=`{ code: "VALIDATION_ERROR", fields: [...] }` (422); field=`currencyCode` (server-derived, never client-supplied).
- **5.5:** route=`PATCH /api/employees/:id`; event=`EmployeeUpdated`; error=`{ code: "COUNTRY_CHANGE_NOT_SUPPORTED" }` (422).
- **5.6:** route=`DELETE /api/employees/:id`; event=`EmployeeDeleted`; success=`204`.
- **5.7:** route=`GET /api/reports/compensation-stats`; query param=`groupBy` (`department`|`country`|`jobLevel`); response fields=`count`, `avgMinor`, `medianMinor`, `minMinor`, `maxMinor`.
- **5.8:** routes=`GET /api/reports/headcount`, `GET /api/reports/salary-distribution`; query params=`groupBy`, `currency`; response=`{ groupValue, count }`.
- **5.9:** routes=`GET /api/employees/export`, `GET /api/reports/compensation-stats/export`, `GET /api/reports/headcount/export`; header=`Content-Disposition: attachment; filename="..."`.

## 4c. Slice traps

- **5.1:** (1) do NOT insert additively on re-run — must truncate then re-insert for byte-identical results (AC 5.1.4). (2) fixed RNG seed, not `Math.random()` — reproducibility is graded. (3) salary bands must be ordered by job level within a country (L1 never exceeds L6, AC 5.1.2), not drawn uniformly.
- **5.2:** (1) pagination/sort must be server-side SQL `LIMIT`/`OFFSET`/`ORDER BY` — do not fetch all rows and slice/sort in JS (perf + AC 5.2.1/5.2.4). (2) an out-of-range page returns empty `items` + correct `total`, not a 4xx (AC 5.2.6). (3) search is case-insensitive substring on first OR last name, not exact match.
- **5.3:** (1) reuse the exact `EMPLOYEE_NOT_FOUND` error shape — do not let 5.5/5.6 diverge. (2) closing the panel returns focus to the triggering row (Accessibility Checklist, AC 5.3.3) — do not drop this on the client-only slices.
- **5.4:** (1) `currencyCode` is derived server-side from the chosen country's default — never accept it from the client payload (invariant 4.4). (2) client-side required-field blocking does not replace server-side 422 validation; both must exist (AC 5.4.2 + 5.4.3). (3) salary is converted from major-unit form input to a stored minor-unit integer (invariant 4.2) — do not store the raw decimal.
- **5.5:** (1) do NOT "fix" the country-change rejection — a bare country change returning `422 COUNTRY_CHANGE_NOT_SUPPORTED` is intended behavior, not a gap (relocation is deliberately deferred, [§9.3](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). (2) reuse 5.3's 404 shape and 5.4's validation rules rather than re-implementing them.
- **5.6 (destructive):** (1) do NOT add a soft-delete/status field — no salary-history or termination lifecycle is a deliberate scope cut ([§9.2](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); a hard `DELETE` is correct here even though it looks unusual for HR data. (2) confirmation pattern: no prior convention exists in this codebase — establish it here per AC 5.6.3's exact copy shape ("Delete {name}'s record? This cannot be undone.") as a client-only modal gate; canceling must send no request. (3) impact-count / blast-radius query: not applicable — there are no dependent rows to count (no org-chart, no salary history per §9.2/§9.5), so no impact-count convention is needed for this slice. (4) never reset the SQLite autoincrement/rowid sequence — deleted IDs must never be reassigned (invariant 4.6).
- **5.7:** (1) never average/sum across currencies — group by (dimension × currency) so a department in two countries yields two rows (invariant 4.3, AC 5.7.2). (2) a group with zero employees is omitted entirely, not returned with null/zero stats (AC 5.7.5). (3) invalid `groupBy` returns `422 VALIDATION_ERROR` — validate the enum server-side, do not trust the client.
- **5.8:** (1) `salary-distribution` is always scoped to one currency; when `currency` is omitted, default to the currency with the largest headcount and state which one was used (AC 5.8.3) — never blend. (2) both endpoints must respond under 500ms against the full 10k rows (AC 5.8.4) — use SQL `GROUP BY`, not per-row JS aggregation.
- **5.9:** (1) export must reflect the full filtered/grouped set, not just the current page (invariant 4.5) — reuse 5.2/5.7/5.8's exact filter/group query params, don't re-derive them. (2) must stream row-by-row without buffering the whole result in memory (AC 5.9.5) — rules out building a full array then joining it. (3) monetary columns export in major units with currency as a separate column (AC 5.9.3), not raw minor-unit integers. (4) `Content-Disposition: attachment` header is required or the browser navigates instead of downloading (AC 5.9.4).

## 5. Known dragons

None — greenfield repo, nothing frozen, deprecated, or gated. Revisit this section once code exists.

## 6. Test conventions (recommended — none exist yet)

- **Runner:** Vitest for both `server/` and `client/` — a single tool across the stack (Vite is already the client bundler per [§7.1](001-employee-salary-management-spec.md#71-tech-stack)), fast and ESM-native. Use `supertest` for HTTP-level route tests against the Express app.
- **Location/naming:** co-located `*.test.ts` next to the file under test, inside each domain folder (e.g. `server/src/employees/employee.service.test.ts`), consistent with the domain-based folder standard in [§6.4.1](001-employee-salary-management-spec.md#64-incubyte-engineering-standards) — avoid a parallel top-level `test/` tree that would require mirroring the domain structure twice.
- **In-memory SQLite wiring:** per [§7.1](001-employee-salary-management-spec.md#71-tech-stack)'s stated rationale, each test file opens its own fresh `better-sqlite3(':memory:')` connection (e.g. via a `createTestDb()` helper in `server/src/db/`), runs the schema against it, and injects it into the repository under test — created fresh per test (or per `beforeEach`) for determinism and isolation, never shared across test files.
- **ZOMBIES coverage** is a spec commitment ([§6.4.2](001-employee-salary-management-spec.md#64-incubyte-engineering-standards)): each slice's suite should visibly cover Zero/One/Many/Boundaries/Interfaces/Exceptions — name tests after the case, not `test1`/`should work` (ai-ergonomics: test names as requirements).

## 7. Hot paths and performance landmines

- `npm run seed` — must complete under 30s for 10,000 rows (AC 5.1.5); batch inserts inside a single transaction, don't insert one row per statement/round-trip.
- `GET /api/reports/compensation-stats` and `GET /api/reports/headcount`/`salary-distribution` — under 500ms against the full 10k dataset (AC 5.8.4); push aggregation into SQL, index the columns used in `GROUP BY`/`WHERE`.
- `GET /api/employees/export` and the two report export endpoints — must stream, never materialize the full result set in memory (AC 5.9.5).
- `GET /api/employees` directory query — server-side `LIMIT`/`OFFSET` is a hard requirement at 10k rows (AC 5.2.1), not an optimization.

## 8. Open uncertainties resolved during orientation

None outstanding — the spec itself records 0 open questions ([§8](001-employee-salary-management-spec.md#8-open-questions)); all elicitation was closed via `AskUserQuestion` or converted to a scope cut in [§9](001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits). Orientation surfaced one structural clarification worth recording explicitly for slice-builder: the server has exactly 3 modules ([§6.4.1](001-employee-salary-management-spec.md#64-incubyte-engineering-standards): `employees/`, `compensation-reports/`, `seed/`), so slices 5.7 and 5.8 — despite being separate client pages/nav items — share one server module (`compensation-reports/`) with no separate repository of its own.

## 8a. Design system

- **Source of truth:** none detected — greenfield, no `design.md`, no token file, no existing component library instance. The spec fixes the component library choice (MUI, including `DataGrid`, per [§7.1](001-employee-salary-management-spec.md#71-tech-stack)) but no theme/token file exists yet.
- **Recommendation:** the first UI slice (5.2) should establish a single MUI theme module (e.g. `client/src/shared/theme.ts`) as the source of truth for subsequent slices — reuse MUI's `Button`, `Dialog`, `TextField`, `DataGrid` primitives rather than hand-rolling equivalents (design-craft: avoid inventing components a system already provides).
- **Conventions fixed by spec, not by discovery:** WCAG AA contrast (4.5:1) and non-color signaling for the salary-band histogram ([§6.1.2](001-employee-salary-management-spec.md#61-accessibility-checklist)); explicit `<label>` + `autocomplete` on the Add/Edit form's name/email fields ([§6.1.3](001-employee-salary-management-spec.md#61-accessibility-checklist)); full keyboard operability and focus-return on the detail panel ([§6.1.1](001-employee-salary-management-spec.md#61-accessibility-checklist)). Density and motion are not specified — no established convention to inherit; the first slice's choices become the convention for the rest.
- **Per-slice UI note:** **Slice 5.2 (directory):** no prior screen to imitate; this is the first screen and sets the MUI `DataGrid` server-mode pattern (pagination/sort/filter wired to query params) that 5.7/5.8's report tables should visually match.

---
## Changelog
- 2026-09-29 — generated by code-orienteer from spec 547df071-01ae-4e3d-b877-1a971539a8a6 at HEAD 840ef50.
