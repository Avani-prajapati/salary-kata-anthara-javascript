# Plan: 001-employee-salary-management

> Spec: `docs/specs/001-employee-salary-management-spec.md` · Context: `docs/specs/001-employee-salary-management-context.md` · Authored: 2026-09-29
> Risk: MODERATE (internal HR tool holding compensation PII; no payment, no production deployment, no live-data migration) · Hard floors: none · Fabric standards: reachable

---

# Part 1 — Review this

*Everything a reviewer needs to approve or redirect the approach. If you only read one part, read this one.*

## What we're doing

Building a browser-based salary-management tool for ACME's HR Manager: a React SPA talking to an Express + SQLite API, seeded with 10,000 realistic employee records. The core approach is a **modular monolith with domain-based module folders** — `employees`, `compensation-reports`, `lookups` on the server; `employee-directory`, `employee-detail`, `employee-form`, `compensation-reports`, `headcount-reports` on the client — because this is a single deployable built by a single developer, and the org's folder-structure standard forces domain grouping over technical-layer grouping ([Decision 1](#decisions-made)).

The constraint that forces the slice order is data dependency: nothing else is testable end-to-end without seeded data, so the seed script (and the schema it creates) is slice 1, and every UI slice depends on the directory slice's app shell, routing, and API-client plumbing ([Decision 2](#decisions-made)).

One deliberate exception: [slice 5.2](#slice-52--view-and-search-the-employee-directory) also builds three small `lookups` endpoints (departments, countries, job levels) that the spec's slice table doesn't list as their own row — they're read-only reference data with no independent user-facing behavior, needed only to populate the directory's filter dropdowns and the Add/Edit form's selects ([Decision 3](#decisions-made)).

## How it breaks down

Slice order matches the spec's [§5](../specs/001-employee-salary-management-spec.md#5-slices) surface-DAG exactly: seed → directory → detail → add → edit → delete → compensation stats → headcount/distribution → CSV export. Slices 5.3–5.6 all extend the app shell and API conventions slice 5.2 establishes; nothing after 5.2 introduces new architectural shape, only new domain behavior.

| # | Slice | Delivers | Why this tier | Tier |
|---|-------|----------|---------------|------|
| 5.1 | Seed the database | Schema + deterministic 10,000-row seed | Design (schema, salary-band math, seeded RNG) is fully resolved below; execution is mechanical | `excellent` |
| 5.2 | Employee directory | Paginated/searchable/filterable/sortable table + app shell + lookups | Establishes API-client, routing, and query conventions every later slice reuses; fully specified below | `excellent` |
| 5.3 | Employee detail | Side-panel detail view | Follows 5.2's established read-endpoint pattern | `excellent` |
| 5.4 | Add employee | Create form + validation | Follows 5.2's pattern; new validation logic only | `excellent` |
| 5.5 | Edit employee | Update form + country-change guard | Follows 5.4's form; one new guard clause | `excellent` |
| 5.6 | Delete employee | Delete + confirm dialog | Single obvious CRUD operation, no new pattern | `fast` |
| 5.7 | Compensation stats | Avg/median/min/max by dimension | SQL median technique resolved below; otherwise standard aggregation | `excellent` |
| 5.8 | Headcount & distribution | Headcount + salary-band histogram | Bucketing algorithm resolved below; otherwise standard aggregation | `excellent` |
| 5.9 | CSV export | Streamed CSV for all three views | Streaming approach resolved below; otherwise mechanical | `excellent` |

Slices 5.3–5.6 are near-identical in shape (one endpoint, one UI surface, one test file extension) — 5.4 and 5.5 in particular share the same form component, built once in 5.4 and extended (not duplicated) in 5.5.

## Decisions made

**1. Domain-based module folders, each internally layered (routes → service → repository).** The org's Incubyte Engineering Standards pack forbids top-level `controllers/` / `services/` grouping; Express itself imposes no structure, so this plan supplies it explicitly. Every slice's file changes land under `employees/`, `compensation-reports/`, or `lookups/` (server) and the matching `features/<name>/` (client). *Rejected: layer-based folders (`routes/`, `services/`, `models/` at top level) — the standard forbids it, and it would scatter one feature's files across three top-level directories.*

**2. Slice 5.2 builds the app shell, routing, and API-client conventions once; later slices extend, never re-invent.** Sidebar navigation, the `httpClient` wrapper, TanStack Query setup, and the MUI theme are all built in 5.2 because the directory is the landing page (`root`-reached) and every other UI slice hangs off its shell. *Rejected: giving each slice its own bootstrap — would duplicate the Express app assembly and the React query-client setup nine times.*

**3. Lookups (`GET /api/departments`, `/api/countries`, `/api/job-levels`) are built inside slice 5.2, not as a separate slice.** They are read-only reference data with no ACs of their own in the spec — they exist purely so the directory's filter dropdowns and the Add/Edit form's selects have options to render. Building them as their own slice would give them a spec-less AC-free entry with nothing to verify independently. *Rejected: hardcoding department/country/job-level lists directly in client code — would duplicate the seed script's canonical lists and drift the moment either changes.*

**4. Salaries stored and computed in integer minor units; API responses convert to major units at the edge.** All six in-scope currencies (USD, GBP, EUR, INR, CAD, AUD) use two decimal places, so every conversion is a flat `/100` or `×100` at the repository/service boundary — never inside SQL aggregates, which stay in minor units for precision. *Rejected: storing major-unit floats — reintroduces the rounding error [invariant 4.2](../specs/001-employee-salary-management-spec.md#4-invariants) exists to prevent.*

**5. Median is computed in SQL via a row-number/count window-function technique, not in application code.** `better-sqlite3` bundles a modern SQLite build (window functions have shipped since SQLite 3.25, 2018; `better-sqlite3`'s bundled amalgamation is far newer) `[verified]`. Computing median in SQL keeps [slice 5.7](#slice-57--view-compensation-statistics-by-dimension)'s repository method a single query instead of pulling every row into Node to sort. *Rejected: fetching all matching rows and sorting in JavaScript — works, but does real work in the wrong layer and doesn't scale if the dataset grows past what fits comfortably in memory.*

**6. Salary-band histograms use 10 equal-width buckets computed per request, not a fixed absolute band width.** Because [invariant 4.3](../specs/001-employee-salary-management-spec.md#4-invariants) scopes every distribution query to one currency, and the six currencies differ in numeric scale by roughly 80x (INR vs. the others), no single fixed absolute width (e.g. "$10,000 bands") works across all of them. Ten equal-width buckets spanning that currency's own `[min, max]` range is currency-agnostic by construction. *Rejected: a fixed absolute band width — would need a different constant per currency, which is exactly the kind of hidden per-currency special-casing this design avoids.*

## Where this could go wrong

- **Median SQL correctness** — the window-function technique in [slice 5.7](#slice-57--view-compensation-statistics-by-dimension) is the single trickiest query in the plan; guarded by that slice's Quality checks and a dedicated even/odd-count test pair.
- **Country-change guard silently regresses into a relocation feature** — [slice 5.5](#slice-55--edit-an-employees-details-and-salary)'s guard is the only thing standing between "edit" and the deliberately-deferred relocation flow ([spec §9.3](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); guarded by that slice's Quality checks.
- **CSV export buffering the full result set in memory** — [AC 5.9.5](../specs/001-employee-salary-management-spec.md#59-export-the-current-view-to-csv) requires streaming; the plan resolves the exact `better-sqlite3` API (`.iterate()`) to use, guarded by that slice's Quality checks.
- **Scope creep into deferred items** — a builder touching salary edits ([5.5](#slice-55--edit-an-employees-details-and-salary)) or delete ([5.6](#slice-56--remove-an-employee-record)) could plausibly "helpfully" add a status/history field ([spec §9.2](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)); a builder touching export ([5.9](#slice-59--export-the-current-view-to-csv)) could plausibly add an import counterpart ([spec §9.4](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). Both are named explicitly in the relevant slices' Quality checks below.
- **Seed data too uniform to make the reporting slices interesting** — [AC 5.1.2](../specs/001-employee-salary-management-spec.md#51-seed-the-database-with-10000-employees) requires realistic salary variation by level; the exact band/scale/modifier constants are locked in [slice 5.1](#slice-51--seed-the-database-with-10000-employees)'s Structure so this isn't left to chance.

## What's out of scope

Everything in the spec's [§1 Deliberately out of scope](../specs/001-employee-salary-management-spec.md#1-overview--business-context) and [§9 Deferred follow-ups](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits): no authentication/RBAC ([§9.1](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), adjacent to 5.2), no salary-history or termination lifecycle ([§9.2](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), adjacent to 5.5 and 5.6), no cross-currency aggregation or country/relocation change ([§9.3](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), adjacent to 5.5, 5.7, 5.8), no CSV/Excel *import* ([§9.4](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), adjacent to 5.9), no org-chart/manager field ([§9.5](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits), adjacent to 5.4 and 5.5).

---

# Part 2 — Build detail

*Prescriptive detail for the build agent. Reviewers can skim or skip.*

**Confidence markers used below:** `[verified]` = the planner read the code or docs and confirmed it. `[inferred]` = pattern-matched from a sibling implementation, not confirmed — the build agent should check before assuming.

## Shared conventions (all slices)

- **Architecture:** modular monolith, domain-based modules, each internally layered `routes → service → repository` ([spec §7.2](../specs/001-employee-salary-management-spec.md#72-architectural-style)). Dependency direction: routes depend on services; services depend on repositories; repositories depend on the DB connection. `compensation-reports`' service depends on `employees`' repository (the owning module's repository) for read access — it never opens a second, private query path against the `employees` table.
- **Dependency direction:** outer (routes/UI) → services → repositories → SQLite. One-way; nothing in `employees/` or `compensation-reports/` imports from `routes` files of another module.
- **Module map** (all paths new; this is a greenfield repo):
  - `server/src/app.js` · Express app assembly (middleware, route mounting) · depends on every module's routes file.
  - `server/src/server.js` · HTTP listen entrypoint · depends on `app.js`.
  - `server/src/db/connection.js` · `better-sqlite3` connection factory · depends on nothing.
  - `server/src/db/schema.js` · idempotent `CREATE TABLE IF NOT EXISTS` + index creation · depends on `connection.js`.
  - `server/src/lookups/` · departments/countries/job-levels read endpoints · depends on `db/connection.js`.
  - `server/src/employees/` · employee CRUD + directory query + aggregation reads · depends on `db/connection.js`.
  - `server/src/compensation-reports/` · stats/headcount/distribution formatting + CSV export for reports · depends on `employees/employees.repository.js`.
  - `server/src/shared/` · `csv.js` (row-encoding helper), `errors.js` (`NotFoundError`, `ValidationError`) · depends on nothing.
  - `server/src/seed/` · `seed.js` (CLI script), `salaryGenerator.js`, `seededRandom.js` · depends on `db/schema.js`, `employees/employees.repository.js`.
  - `client/src/App.jsx` · root layout, sidebar nav, route outlet · depends on every feature's page component.
  - `client/src/api/` · `httpClient.js`, `employees.api.js`, `reports.api.js`, `lookups.api.js` · depends on nothing else in the client.
  - `client/src/features/employee-directory/`, `employee-detail/`, `employee-form/`, `compensation-reports/`, `headcount-reports/` · one folder per user-facing feature · each depends on `api/` and `shared/`.
  - `client/src/shared/` · `theme.js`, `EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx`, `ExportCsvButton.jsx` · depends on nothing else.
- **Lexicon (do not rename):** `Employee`, `Department`, `Country`, `JobLevel` (types, per [spec §3.2](../specs/001-employee-salary-management-spec.md#3-type-ontology)); `salaryMinorUnits` / `salaryMajorUnits` (never "amount" or "salary" alone — the unit must always be in the name); `departmentId` / `countryId` / `jobLevelId` (foreign-key params, always the `Id`-suffixed form, never bare `department`/`country`/`level` for IDs); `groupBy` (query param name across both report endpoints, values `department` | `country` | `jobLevel`).
- **Tests:** Vitest across both `server/` and `client/` — one runner for the whole repo keeps tooling minimal (YAGNI). Server tests use `better-sqlite3`'s `:memory:` mode, re-created fresh per test file via `db/schema.js`'s `createSchema()`, for determinism and speed (no disk I/O). Client tests use React Testing Library + Vitest, mocking the `api/` layer's HTTP calls (never a real network call — `test-craft`'s determinism rule). Route-level server tests use `supertest` against `createApp(db)`. Co-located `*.test.js` / `*.test.jsx` files next to the code they test.
- **Language: plain JavaScript, not TypeScript.** The kata brief frames this as a build for "the JavaScript role" specifically; the spec's §7.1 tech stack never committed to TypeScript, so every file in this plan is `.js`/`.jsx`, never `.ts`/`.tsx`. (The context file's §6 recommendation of `.test.ts` predates this resolution — read it as `.test.js` throughout; nothing else in its lexicon depends on the language choice.)

---

## Slice 5.1 — Seed the database with 10,000 employees

**Key decision:** Builds the schema (four tables: `departments`, `countries`, `job_levels`, `employees`) and a deterministic seed script in one slice, per [Decision 1](#decisions-made). Salary realism ([AC 5.1.2](../specs/001-employee-salary-management-spec.md#51-seed-the-database-with-10000-employees)) comes from layering three factors — a per-level base range, a per-country scale, a per-department modifier — plus small seeded random variance, all specified below so the builder transcribes rather than invents them.

**Structure**

- `server/src/db/connection.js` (new) — `function createConnection(path: string): Database` — wraps `better-sqlite3`'s constructor; `path` is a file path or `':memory:'`.
- `server/src/db/schema.js` (new) — `function createSchema(db: Database): void` — runs the DDL below; `function resetSchema(db: Database): void` — drops and recreates all four tables (used by seed's idempotent truncate-and-reseed and by tests).
  - DDL, exact column set:
    - `departments(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)`
    - `countries(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, iso_code TEXT NOT NULL UNIQUE, default_currency_code TEXT NOT NULL)`
    - `job_levels(id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT NOT NULL, rank INTEGER NOT NULL UNIQUE)`
    - `employees(id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, department_id INTEGER NOT NULL REFERENCES departments(id), country_id INTEGER NOT NULL REFERENCES countries(id), job_level_id INTEGER NOT NULL REFERENCES job_levels(id), currency_code TEXT NOT NULL, salary_minor_units INTEGER NOT NULL CHECK (salary_minor_units >= 0), hire_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`
    - Indices: `idx_employees_department_id`, `idx_employees_country_id`, `idx_employees_job_level_id`, `idx_employees_last_name`, `idx_employees_salary_minor_units`.
  - `AUTOINCREMENT` on `employees.id` is what satisfies [invariant 4.6](../specs/001-employee-salary-management-spec.md#4-invariants): SQLite's `sqlite_sequence` bookkeeping guarantees a new row's ID is always higher than any ID ever used in that table, even after deletion — plain `INTEGER PRIMARY KEY` without the keyword does not give this guarantee (a deleted max-ID row's ID can be reused). `[verified]`
- `server/src/seed/seededRandom.js` (new) — `function createSeededRandom(seed: number): () => number` — returns a function producing floats in `[0, 1)`. Implementation: the `mulberry32` algorithm (public-domain 32-bit generator: one multiply + three xor-shifts per call) — small enough to write inline, no dependency needed.
- `server/src/seed/salaryGenerator.js` (new) — `function generateSalaryMinorUnits(params: { jobLevelRank: number, countryIsoCode: string, departmentName: string, random: () => number }): number` — computes a salary using the constants below, returns an integer in minor units.
- `server/src/seed/seed.js` (new) — `async function runSeed(db: Database): Promise<void>` — orchestrates schema reset + reference-data insert + 10,000 employee inserts inside one transaction (`db.transaction(...)` from `better-sqlite3`, for speed); a thin CLI wrapper (`if (require.main === module)`) calls it against a file-based connection and logs progress per the spec's sample output.
- `server/package.json` (new) — `scripts.seed` runs `node src/seed/seed.js`.

**Reference data (exact, used by both seed and lookups):**

| Departments (8) | Countries (6): name, ISO, currency | Job levels (6): code, label, rank |
|---|---|---|
| Engineering, Sales, Marketing, Finance, HR, Operations, Legal, Customer Support | United States/US/USD, United Kingdom/GB/GBP, Germany/DE/EUR, India/IN/INR, Canada/CA/CAD, Australia/AU/AUD | L1 Associate (1), L2 Professional (2), L3 Senior (3), L4 Staff (4), L5 Principal (5), L6 Executive (6) |

**Salary constants (major-unit ranges, illustrative — this is seed-data generation, not a live conversion feature, so it does not touch [invariant 4.3/4.4](../specs/001-employee-salary-management-spec.md#4-invariants)):**

| Level rank | Base range (USD-shape) | Country scale factor | Department modifier |
|---|---|---|---|
| 1 | 40,000–65,000 | US 1.0, CA 1.35, GB 0.8, DE 0.9, AU 1.5, IN 83 | Engineering 1.1, Legal 1.1, Finance 1.05, Marketing 0.95, Sales 0.95, Operations 0.9, HR 0.9, Customer Support 0.85 |
| 2 | 60,000–90,000 | (same table) | (same table) |
| 3 | 85,000–130,000 | (same table) | (same table) |
| 4 | 120,000–170,000 | (same table) | (same table) |
| 5 | 160,000–230,000 | (same table) | (same table) |
| 6 | 220,000–350,000 | (same table) | (same table) |

**Control flow**

1. `runSeed`: reset schema; insert 8 departments, 6 countries, 6 job levels (fixed order, fixed IDs 1..N by insertion order); create one `createSeededRandom(42)` instance shared across all 10,000 generations (fixed seed literal `42` — the exact value doesn't matter, only that it's fixed, per [AC 5.1.4](../specs/001-employee-salary-management-spec.md#51-seed-the-database-with-10000-employees)).
2. For each of 10,000 employees: pick department/country/job-level uniformly via the shared random function; generate first/last name and a unique email (e.g. `first.last<n>@acme.example` where `n` disambiguates collisions); call `generateSalaryMinorUnits`; set `currencyCode` to the chosen country's `default_currency_code`; pick a `hireDate` uniformly within the last 8 years; insert.
3. `generateSalaryMinorUnits`: look up the level's base range, sample uniformly within it via `random()`, multiply by the country's scale factor and the department's modifier, then apply ±10% variance via `random()`, round to the nearest whole major unit, multiply by 100 for minor units.
4. Wrap steps 1–3 in a single `better-sqlite3` transaction for the stated 30-second performance floor ([AC 5.1.5](../specs/001-employee-salary-management-spec.md#51-seed-the-database-with-10000-employees)).

**Tests:** New file `server/src/seed/salaryGenerator.test.js` — unit tests, no DB needed (pure function, injected `random`): an L1 salary is always less than an L6 salary in the same country/department when both are generated at the RNG's midpoint (covers 5.1.2); every generated value is a positive integer (covers 5.1.3's precondition). New file `server/src/seed/seed.test.js` — integration test against an in-memory DB: running `runSeed` produces exactly 8/6/6/10,000 rows (5.1.1); every employee's `currency_code` matches its country's `default_currency_code` (5.1.3); running it twice produces byte-identical row counts and an identical `SUM(salary_minor_units)` (5.1.4, cheap proxy for "identical distribution" — a full row-by-row diff is unnecessary given the deterministic-RNG guarantee).

**Standards that bite here:** SonarJS `sql-queries` (all inserts parameterized, never string-built); SonarJS `pseudo-random` does not block `Math.random`-style use here since nothing security-sensitive is generated, but determinism ([AC 5.1.4](../specs/001-employee-salary-management-spec.md#51-seed-the-database-with-10000-employees)) is a functional requirement `Math.random` cannot satisfy (not seedable in Node), which is why a hand-rolled seeded generator is used instead; Clean Code YAGNI (no configurable seed CLI flag — the fixed literal is enough for this spec's determinism requirement).

**Quality checks**

- **Idempotency (4.6, 5.1.4): re-running `runSeed` never produces duplicate or reused `employees.id` values** — `resetSchema` truncates before every reseed.
- Every seeded employee's `currency_code` equals its `country.default_currency_code` (4.4).
- No department/country/job-level table is left empty or with fewer/more than its fixed count.

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **Migrations.** `createSchema` / `resetSchema` apply against a fresh SQLite file with no error.

---

## Slice 5.2 — View and search the employee directory

**Key decision:** Builds the Express app assembly, the three `lookups` endpoints, the `employees` list endpoint, and the full React app shell (sidebar nav, routing, TanStack Query provider, MUI theme) together, per [Decisions 1–3](#decisions-made) — every later UI slice depends on this shell existing.

**Structure**

- `server/src/db/connection.js`, `db/schema.js` — reused from 5.1, no changes.
- `server/src/shared/errors.js` (new) — `class NotFoundError extends Error` (constructor takes `resourceName: string, id: number | string`); `class ValidationError extends Error` (constructor takes `fields: Array<{ field: string, message: string }>`).
- `server/src/shared/errorMiddleware.js` (new) — `function errorMiddleware(err, req, res, next): void` — maps `NotFoundError` → `404 { code: "..._NOT_FOUND", message }`, `ValidationError` → `422 { code: "VALIDATION_ERROR", fields }`, anything else → `500` with no leaked internals.
- `server/src/lookups/lookups.repository.js` (new) — `function listDepartments(db): Department[]`, `function listCountries(db): Country[]`, `function listJobLevels(db): JobLevel[]` — plain `SELECT * ORDER BY id`.
- `server/src/lookups/lookups.routes.js` (new) — `GET /api/departments`, `GET /api/countries`, `GET /api/job-levels`.
- `server/src/employees/employees.repository.js` (new) — `function findMany(db, params: { page: number, pageSize: number, search?: string, departmentId?: number, countryId?: number, jobLevelId?: number, sortBy: string, sortDir: 'asc'|'desc' }): { items: EmployeeRow[], total: number }` — builds a parameterized `SELECT` joining `departments`/`countries`/`job_levels`, with `WHERE` clauses added conditionally per provided filter, `LIKE` for `search` against `first_name || ' ' || last_name`, and `LIMIT`/`OFFSET` for pagination.
- `server/src/employees/employees.service.js` (new) — `function listEmployees(db, queryParams: object): { items: EmployeeDto[], total: number, page: number, pageSize: number }` — validates/coerces query params (page ≥ 1 default 1; pageSize 1–100 default 20; sortBy in the allowed enum default `lastName`; sortDir default `asc`), calls the repository, maps `salary_minor_units` → `salaryMajorUnits` (`/100`) in each row.
- `server/src/employees/employees.routes.js` (new) — `GET /api/employees`.
- `server/src/app.js` (new) — `function createApp(db): Express` — `express.json({ limit: '100kb' })`, mounts `lookups`, `employees` routers, mounts `errorMiddleware` last; denies dot-file static paths (no static middleware is added in this spec, so nothing to configure — noted so a builder doesn't add one speculatively).
- `server/src/server.js` (new) — thin listener using `createApp` + a file-based `connection.js` instance.
- `client/src/api/httpClient.js` (new) — `async function request(path: string, options?: RequestInit): Promise<unknown>` — wraps `fetch`, throws a typed `ApiError` (with `status`, `code`, `fields`) on non-2xx.
- `client/src/api/lookups.api.js` (new) — `getDepartments()`, `getCountries()`, `getJobLevels()`.
- `client/src/api/employees.api.js` (new) — `getEmployees(params)`.
- `client/src/shared/theme.js` (new) — MUI theme: light mode only, neutral palette (MUI's default `grey` scale as the neutral anchor, one accent color), motion kept to MUI's default transition durations (no custom expressive animation added).
- `client/src/shared/EmptyState.jsx`, `LoadingState.jsx`, `ErrorState.jsx` (new) — minimal treatment per [spec's design direction](../specs/001-employee-salary-management-spec.md#1-overview--business-context): centered text + icon, MUI `Skeleton`/`CircularProgress`, inline MUI `Alert`.
- `client/src/App.jsx` (new) — MUI `Drawer`-based sidebar nav (Directory, Compensation Reports, Headcount) + React Router `Outlet`.
- `client/src/features/employee-directory/DirectoryPage.jsx`, `DirectoryFilters.jsx`, `DirectoryTable.jsx`, `useEmployeesQuery.js` (new) — `DirectoryTable` wraps MUI `DataGrid` in server-mode (`paginationMode="server"`, `sortingMode="server"`, `filterMode` left client-off since filters are custom dropdowns, not the grid's built-in filter UI); `useEmployeesQuery` is a TanStack Query hook keyed on `['employees', params]`.

**Collaborators:** `employees.routes.js` constructs nothing; it receives `db` via `createApp`'s closure and passes it to `employees.service.js` functions, which take `db` as their first argument and construct nothing themselves (per `code-craft`'s "construct with collaborators, call with work" — here the "collaborator" is the DB connection, passed down from `server.js`/test setup, never constructed mid-call-chain).

**Control flow**

- `employees.service.listEmployees`: reads the HTTP query keys `department`, `country`, `jobLevel` (per [spec AC 5.2.1](../specs/001-employee-salary-management-spec.md#52-view-and-search-the-employee-directory)'s exact query shape) and coerces each present value to a number, passed to the repository as `departmentId`/`countryId`/`jobLevelId` — the `Id` suffix is this plan's internal-parameter convention (see Lexicon above), not the wire-format query key; validate/coerce other query params (out-of-enum `sortBy`/`sortDir` fall back to defaults rather than erroring — this endpoint has no ACs requiring a validation error for bad sort params); call repository; map rows; return.
- `employees.repository.findMany`: start from a base `SELECT ... FROM employees JOIN departments JOIN countries JOIN job_levels`; append a `WHERE` fragment per present filter (`search`, `departmentId`, `countryId`, `jobLevelId`), joined with `AND`; append `ORDER BY <mapped column> <sortDir>`; run a `COUNT(*)` variant of the same `WHERE` clause for `total`; run the paginated `SELECT` for `items`; an out-of-range `page` naturally yields an empty `items` array with a correct `total` (5.2.6) since `LIMIT`/`OFFSET` on SQLite never errors past the end.
- `DirectoryTable`: on filter/search/sort/page change, `useEmployeesQuery`'s key changes, TanStack Query refetches; `items.length === 0` renders `EmptyState` instead of the grid body (5.2.5).

**Tests:** New file `server/src/employees/employees.repository.test.js` — integration, in-memory DB seeded with a small fixed fixture set (not the full 10k): search matches case-insensitively (5.2.2); combined department+country filters narrow correctly (5.2.3); sorting by salary changes row order (5.2.4); a page beyond the last page returns empty items + correct total (5.2.6). New file `client/src/features/employee-directory/DirectoryTable.test.jsx` — component test with a mocked `useEmployeesQuery`: renders rows for a populated result; renders `EmptyState` for zero rows (5.2.5).

**Standards that bite here:** SonarJS `sql-queries` (every filter fragment parameterized — never string-concatenated even though filters are conditional); SonarJS `content-length` (100kb JSON body limit set in `createApp`); SonarJS `no-uniq-key` (`DataGrid` rows keyed by `id`, never index); SonarJS `hidden-files` (no static-file middleware added, so nothing to misconfigure — verified absent); Accessibility Checklist (filter inputs have associated labels; `DataGrid` ships accessible roles by default — no custom ARIA needed on top); Clean Code separation of concerns (`employees.service.js` has no `req`/`res` references — testable without an HTTP server, as the repository test above demonstrates).

**Quality checks**

- **No authentication/authorization middleware or login UI introduced anywhere in `app.js` or `App.jsx`** (spec §9.1 accepted-limit stays out of this slice, even though it is the first slice to stand up the server and would be the natural place to "helpfully" add a login gate).
- Every SQL fragment in `employees.repository.js` uses `?` placeholders — zero string interpolation of filter values into SQL text.
- `DataGrid` rows key off `row.id`, never the array index.

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **Migrations.** N/A — schema unchanged from 5.1.
3. **User-facing flow.** Load the Directory page; confirm the seeded rows render, paginate, sort by each column, and that search/department/country/level filters narrow the result set individually and combined.
4. **Accessibility.** Tab through the filter bar and grid; confirm every control is keyboard-reachable and carries a visible focus indicator; confirm the empty state (search for a nonsense name) is announced sensibly to a screen reader (via the `DataGrid`'s built-in "no rows" region, not a bare empty `<div>`).

---

## Slice 5.3 — View an employee's detail

**Key decision:** Adds one read-by-id endpoint and a side panel, reusing 5.2's service/repository layering pattern and the app shell's routing.

**Structure**

- `server/src/employees/employees.repository.js` (modify) — add `function findById(db, id: number): EmployeeRow | undefined`.
- `server/src/employees/employees.service.js` (modify) — add `function getEmployee(db, id: number): EmployeeDto` — calls `findById`; throws `NotFoundError('Employee', id)` when `undefined`.
- `server/src/employees/employees.routes.js` (modify) — add `GET /api/employees/:id`.
- `client/src/api/employees.api.js` (modify) — add `getEmployee(id)`.
- `client/src/features/employee-detail/EmployeeDetailPanel.jsx`, `useEmployeeQuery.js` (new) — panel opens as a MUI `Drawer` (`anchor="right"`) driven by a `selectedEmployeeId` piece of state in `DirectoryPage`; closing it (via close button or `Escape`, MUI `Drawer`'s built-in `onClose`) restores focus to the triggering row (`DataGrid` row ref captured on click, `.focus()` called in the `onClose` handler).

**Collaborators:** `EmployeeDetailPanel` receives `employeeId` as a prop from `DirectoryPage` (which owns the selection state) rather than reading route params — the panel is a peer overlay to the table, not a separate route, matching the spec's "without navigating away" framing.

**Control flow:** `getEmployee` — guard: not found → throw; found → map to DTO (same shape as a directory row, no additional fields — the detail view reuses the list item's full shape). `EmployeeDetailPanel` — guard: no `employeeId` selected → render nothing (`Drawer` closed).

**Tests:** New file `server/src/employees/employees.service.test.js` — unit, injected fake repository (not the real DB — `getEmployee`'s logic is the not-found branch, which doesn't need a real query): existing ID returns the mapped DTO; missing ID throws `NotFoundError` (5.3.1). Extend `client/src/features/employee-directory/DirectoryTable.test.jsx` (or a new `EmployeeDetailPanel.test.jsx` if the setup diverges materially) — clicking a row opens the panel with that row's data (5.3.2); closing it returns focus to the row (5.3.3).

**Standards that bite here:** Accessibility Checklist focus-management rule (5.3.3 is exactly this rule, not a generic nicety — cite it in the commit); SonarJS `sql-queries` (parameterized `WHERE id = ?`).

**Quality checks**

- A `404` for a missing employee ID carries the same `{ code, message }` shape defined in [AC 5.3.1](../specs/001-employee-salary-management-spec.md#53-view-an-employees-detail) — no ad-hoc error shape introduced for this one endpoint.
- Closing the detail panel is verified to move focus back to the trigger, not merely to close visually (5.3.3 is a focus-management assertion, not a visual one).

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Click several directory rows; confirm the panel opens with correct data each time and the directory's scroll position and filters are undisturbed.
3. **Accessibility.** Confirm keyboard-only operation: open a row with `Enter`, close with `Escape`, confirm focus lands back on the row.

---

## Slice 5.4 — Add a new employee

**Key decision:** Builds the employee form (used again, extended, by 5.5) with `react-hook-form`, and the `POST` endpoint with the validation rules the spec's ACs spell out exactly.

**Structure**

- `server/src/employees/employees.service.js` (modify) — add `function createEmployee(db, input: CreateEmployeeInput): EmployeeDto` — validates (see Control flow), resolves the country's `default_currency_code`, converts `salaryMajorUnits` → minor units, calls repository, returns mapped DTO.
- `server/src/employees/employees.repository.js` (modify) — add `function create(db, row: EmployeeInsertRow): number` (returns new `id`).
- `server/src/employees/employees.routes.js` (modify) — add `POST /api/employees`.
- `client/src/features/employee-form/EmployeeForm.jsx` (new) — `react-hook-form`-driven form with fields for every editable column; department/country/job-level rendered as MUI `Select`s populated from the lookups queries; used in "create" mode here (an `onSubmit` prop makes it reusable for 5.5's "edit" mode without duplication).
- `client/src/features/employee-form/useCreateEmployeeMutation.js` (new) — TanStack Query mutation; on success, invalidates the `['employees']` query key so the directory refetches (5.4.4).
- `client/src/api/employees.api.js` (modify) — add `createEmployee(payload)`.

**Collaborators:** `EmployeeForm` is constructed once with the lookups data (departments/countries/job-levels) passed as props from the page that renders it, not fetched internally — keeps the form a pure presentation + validation component.

**Control flow**

- Client-side (react-hook-form rules, blocks submission before any request — 5.4.2): `firstName`/`lastName`/`email` required; `email` matches a standard email pattern; `departmentId`/`countryId`/`jobLevelId` required (select a value); `salaryMajorUnits` required and `> 0`; `hireDate` required.
- Server-side `createEmployee` (5.4.3 — re-validates independently of the client, never trusts it): missing required field → collect into a `ValidationError.fields` array (do not stop at the first failure — collect all, per the AC's "listing every invalid field"); malformed email (simple `@`-and-domain regex, not a network check) → field error; `salaryMajorUnits <= 0` → field error; if any field errors collected, throw `ValidationError(fields)` before any DB write.
- Currency resolution: look up the chosen `countryId`'s `default_currency_code` via `lookups.repository.listCountries` (or a new `findCountryById`); set as `currencyCode` — this is the concrete mechanism behind [invariant 4.4](../specs/001-employee-salary-management-spec.md#4-invariants).

**Tests:** New file `server/src/employees/employees.service.test.js` (extend from 5.3) — `createEmployee` with a valid input returns a DTO with the correct minor-units conversion (5.4.1, 5.4.5); missing each required field one at a time throws `ValidationError` naming that field (5.4.3); a valid `countryId` results in the correct `currencyCode` (4.4). New file `client/src/features/employee-form/EmployeeForm.test.jsx` — submitting with an empty required field shows an inline error and fires no request (5.4.2, asserted via the mocked API client receiving zero calls).

**Standards that bite here:** SonarJS `sql-queries` (parameterized `INSERT`); Accessibility Checklist form-labels-and-autocomplete rule (name/email fields carry `autocomplete="given-name"` / `"family-name"` / `"email"`); Clean Code fail-fast-at-boundaries (server validation is the boundary check; nothing downstream re-checks salary positivity).

**Quality checks**

- **No manager/reporting-line field added to `EmployeeForm` or the `employees` table** (spec §9.5 accepted-limit stays out — this is the first slice that could plausibly add one "while we're building the form").
- A `422` response's `fields` array names every invalid field in one response, not just the first (5.4.3's "listing every invalid field").
- The stored `salary_minor_units` for a submitted `95000.00` major-unit input is exactly `9500000`, not off by a rounding step.

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Add a new employee via the form; confirm it appears in the directory without a manual refresh; confirm submitting with a missing field is blocked client-side, and confirm the server independently rejects a malformed payload sent without going through the form (e.g. via the repository test).
3. **Accessibility.** Confirm every form field has a visible, programmatically-associated label and appropriate `autocomplete`.

---

## Slice 5.5 — Edit an employee's details and salary

**Key decision:** Extends 5.4's `EmployeeForm` into "edit" mode (pre-filled, `PATCH` instead of `POST`) and adds the country-change guard that is this slice's one genuinely new piece of logic ([Decision](#decisions-made) reference: this is the guard called out in [Where this could go wrong](#where-this-could-go-wrong)).

**Structure**

- `server/src/employees/employees.service.js` (modify) — add `function updateEmployee(db, id: number, patch: Partial<EmployeeInput>): EmployeeDto` — guard on `countryId` first (see Control flow), then reuses the same field-level validation as `createEmployee` for whichever fields are present in `patch`.
- `server/src/employees/employees.repository.js` (modify) — add `function update(db, id: number, patch: Partial<EmployeeUpdateRow>): void` — dynamic `SET` clause built from the patch's own keys (each still bound as a `?` parameter — "dynamic" refers to which columns appear, never to string-interpolating values).
- `server/src/employees/employees.routes.js` (modify) — add `PATCH /api/employees/:id`.
- `client/src/features/employee-form/EmployeeForm.jsx` (modify) — accept an optional `initialValues` prop; when present, renders in edit mode (submit label "Save changes" vs. "Add employee" — a presentational difference only, not a second component).
- `client/src/features/employee-form/useUpdateEmployeeMutation.js` (new) — on success, invalidates both `['employees']` and `['employee', id]` query keys.
- `client/src/api/employees.api.js` (modify) — add `updateEmployee(id, payload)`.

**Collaborators:** `updateEmployee` (service) depends on `findById` (added in 5.3) to load the current row before diffing `countryId`, and on `update` (repository) to persist — no new collaborator types introduced.

**Control flow**

1. Guard: if `patch.countryId` is present and differs from the current employee's `country_id` (loaded via `findById`), throw `ValidationError([{ field: 'countryId', message: 'Country cannot be changed on this endpoint' }])` with `code` `COUNTRY_CHANGE_NOT_SUPPORTED` — before touching any other field (5.5.2). This is a hard stop, not a "changed alone" special case: any presence of a differing `countryId` in the patch rejects the whole request.
2. If the guard passes, run the same per-field validation rules as `createEmployee` (5.5.4) against whichever fields are present.
3. Not-found: `findById` returning `undefined` throws `NotFoundError` with the same shape as [5.3.1](../specs/001-employee-salary-management-spec.md#53-view-an-employees-detail) (5.5.3).
4. On success, `update` sets `updated_at = datetime('now')` alongside the patched columns.

**Tests:** Extend `server/src/employees/employees.service.test.js` — patching `salaryMajorUnits` alone succeeds and the new value round-trips correctly (5.5.1); patching `countryId` to a different value throws with `COUNTRY_CHANGE_NOT_SUPPORTED` (5.5.2); patching a non-existent ID throws `NotFoundError` (5.5.3); patching with an invalid email throws the same field-shaped error as create (5.5.4). Extend `client/src/features/employee-form/EmployeeForm.test.jsx` — rendering with `initialValues` pre-fills every field.

**Standards that bite here:** Clean Code guard clauses (the country-change check is written as an early guard, not nested inside the main validation branch — readability and testability both benefit); SonarJS `sql-queries` (dynamic `SET` clause still fully parameterized).

**Quality checks**

- **No salary-history table, `status` column, or termination field is added anywhere in this slice** (spec §9.2 accepted-limit stays out — editing salary is the single most natural place a builder would "helpfully" start tracking history).
- **No FX conversion, and no path that allows `countryId` to change while leaving `currencyCode` unchanged** (spec §9.3 — the guard is what enforces [invariant 4.4](../specs/001-employee-salary-management-spec.md#4-invariants) staying true after edits, not just after creation).
- A `PATCH` with only `salaryMajorUnits` in the body does not require any other field to be present (true partial update).

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Edit an existing employee's salary; confirm the detail panel and directory row both update without a manual refresh; attempt to change country and confirm it is rejected with a visible error, not a silent no-op or a crash.
3. **Accessibility.** Confirm the pre-filled form's fields remain properly labeled and that the rejected-country-change error is announced (e.g. via an MUI `Alert` with `role="alert"`), not only shown as a color change.

---

## Slice 5.6 — Remove an employee record

**Key decision:** The simplest slice in the plan — one endpoint, one confirm dialog, no new architectural shape. Explicitly framed (per the spec) as data correction, not an offboarding workflow.

**Structure**

- `server/src/employees/employees.repository.js` (modify) — add `function remove(db, id: number): void` — `DELETE FROM employees WHERE id = ?`.
- `server/src/employees/employees.service.js` (modify) — add `function deleteEmployee(db, id: number): void` — `findById` guard (throws `NotFoundError` if missing, matching 5.3's shape) then `remove`.
- `server/src/employees/employees.routes.js` (modify) — add `DELETE /api/employees/:id` → `204` on success.
- `client/src/features/employee-form/useDeleteEmployeeMutation.js` (new) — invalidates `['employees']` on success.
- `client/src/features/employee-detail/EmployeeDetailPanel.jsx` (modify) — add a "Delete" button opening an MUI `Dialog` confirmation before calling the mutation.

**Collaborators:** `deleteEmployee` reuses `findById` from 5.3 — no new read path.

**Control flow:** Guard (not found → throw, same shape as 5.3/5.5) → delete → return. Client: button click opens `Dialog`; `Dialog`'s cancel action fires no request (5.6.3); confirm action fires the mutation, then closes both the dialog and the detail panel.

**Tests:** Extend `server/src/employees/employees.service.test.js` — deleting an existing ID succeeds and a subsequent `findById` for that ID returns `undefined` (5.6.1, 5.6.4); deleting a non-existent ID throws `NotFoundError` (5.6.2). Extend the detail-panel component test — clicking "Delete" then "Cancel" in the confirmation dialog results in zero mutation calls (5.6.3).

**Standards that bite here:** SonarJS `sql-queries` (parameterized `DELETE`); Accessibility Checklist (the confirmation `Dialog` traps focus while open and returns it to the "Delete" button on cancel — MUI `Dialog` does this by default, verify it isn't overridden away).

**Quality checks**

- Deleting an employee never reassigns its `id` to a subsequently created employee (4.6 — this is the same `AUTOINCREMENT` guarantee from 5.1, verify it still holds after a delete-then-create sequence).
- The confirmation dialog's cancel path is a true no-op — zero network calls, not just a UI that "looks" cancelled.

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Delete a record via the confirm dialog; confirm it disappears from the directory; confirm cancel leaves the record untouched.
3. **Accessibility.** Confirm the confirmation dialog is keyboard-operable (`Tab` cycles within it, `Escape` cancels) and focus returns sensibly after either path.

---

## Slice 5.7 — View compensation statistics by dimension

**Key decision:** The first reporting slice; introduces the `compensation-reports` module and the SQL median technique from [Decision 5](#decisions-made). `ReportService` depends on `employees.repository.js`'s new aggregation methods rather than opening a second query path against `employees`, per this plan's architecture rule.

**Structure**

- `server/src/employees/employees.repository.js` (modify) — add `function getCompensationStats(db, groupBy: 'department'|'country'|'jobLevel'): Array<{ groupId: number, groupLabel: string, currencyCode: string, count: number, avgMinor: number, medianMinor: number, minMinor: number, maxMinor: number }>` — the grouping column and its join table are selected via a small internal lookup keyed by `groupBy` (e.g. `{ department: { column: 'department_id', table: 'departments', labelColumn: 'name' }, ... }`), not a chain of `if/else` per call site.
- `server/src/compensation-reports/reports.service.js` (new) — `function getCompensationStats(db, groupBy: string): CompensationStatDto[]` — validates `groupBy` against the enum (throws `ValidationError` otherwise, 5.7.4), calls the repository method, maps every `*Minor` field to its `*MajorUnits` counterpart (`/100`).
- `server/src/compensation-reports/reports.routes.js` (new) — `GET /api/reports/compensation-stats`.
- `client/src/api/reports.api.js` (new) — `getCompensationStats(groupBy)`.
- `client/src/features/compensation-reports/CompensationReportsPage.jsx`, `useCompensationStatsQuery.js` (new) — a `RadioGroup` for the `groupBy` choice, an MUI `Table` (not `DataGrid` — this result set is small, one row per group×currency, no pagination needed) rendering the stats.

**Collaborators:** `reports.service.js` calls `employees.repository.js` directly (the owning module's repository, per this plan's dependency rule) — it has no repository file of its own for this data.

**Control flow**

- Repository `getCompensationStats`: build a CTE — `ordered AS (SELECT <group_col> AS group_id, currency_code, salary_minor_units, ROW_NUMBER() OVER (PARTITION BY <group_col>, currency_code ORDER BY salary_minor_units) AS rn, COUNT(*) OVER (PARTITION BY <group_col>, currency_code) AS cnt FROM employees)`; median per group is `AVG(salary_minor_units)` over rows where `rn IN ((cnt + 1) / 2, (cnt + 2) / 2)` (integer division — for odd `cnt` both values are the same middle row so the average is just that value; for even `cnt` it's the average of the two middle rows) — this is the exact, standard SQL median technique, computed alongside plain `AVG`/`MIN`/`MAX`/`COUNT` in the same grouped query.
- Service: `groupBy` not in `{'department','country','jobLevel'}` → throw `ValidationError` (5.7.4) before calling the repository. A group with zero employees never appears in `GROUP BY` output by construction — no post-filtering needed (5.7.5).

**Tests:** New file `server/src/employees/employees.repository.test.js` (extend from 5.2) — an odd-count group's median equals its literal middle value; an even-count group's median equals the average of its two middle values (this is the single trickiest piece of SQL in the plan — cover both parities explicitly); a department present in two countries with two currencies produces two separate rows, never one blended row (4.3, 5.7.2). New file `server/src/compensation-reports/reports.service.test.js` — an invalid `groupBy` throws `ValidationError` (5.7.4).

**Standards that bite here:** Clean Code separation of concerns (aggregation SQL lives in the repository, unit selection/mapping in the service — the service has zero raw SQL); SonarJS `expression-complexity` (the `groupBy`-to-column lookup is a plain object map, not a chained boolean expression).

**Quality checks**

- **No group ever averages salaries across two different `currency_code` values** — this is [invariant 4.3](../specs/001-employee-salary-management-spec.md#4-invariants) and the single highest-risk assertion in this slice, guarded by the two-currency-department test above.
- The median calculation is verified correct for both an odd- and an even-sized group in the same test file, not just one parity.
- No FX conversion constant appears anywhere in `reports.service.js` or `employees.repository.js`'s aggregation methods (spec §9.3 stays out).

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Open Compensation Reports; switch the "Group by" control between department/country/job level; confirm each grouping renders plausible, non-uniform figures (a visible product of [slice 5.1](#slice-51--seed-the-database-with-10000-employees)'s realistic seed data).
3. **Accessibility.** Confirm the `RadioGroup` is keyboard-operable and the results table has proper header cells (`<th scope="col">`, which MUI `Table` components provide by default when used with `TableHead`/`TableCell` correctly).

---

## Slice 5.8 — View headcount and salary distribution

**Key decision:** Adds two more read-only aggregation endpoints to the same `compensation-reports` module; the distribution endpoint uses the currency-agnostic 10-bucket algorithm from [Decision 6](#decisions-made).

**Structure**

- `server/src/employees/employees.repository.js` (modify) — add `function getHeadcount(db, groupBy: 'department'|'country'|'jobLevel'): Array<{ groupId: number, groupLabel: string, count: number }>` (reuses the same `groupBy`-to-column lookup from 5.7); add `function getSalaryDistribution(db, currencyCode: string): Array<{ bucketIndex: number, bucketMinMajor: number, bucketMaxMajor: number, count: number }>`; add `function getDefaultDistributionCurrency(db): string` — `SELECT currency_code FROM employees GROUP BY currency_code ORDER BY COUNT(*) DESC LIMIT 1`.
- `server/src/compensation-reports/reports.service.js` (modify) — add `function getHeadcount(db, groupBy: string): HeadcountDto[]`; add `function getSalaryDistribution(db, currencyCode: string | undefined): { currencyCode: string, buckets: SalaryBucketDto[] }` — when `currencyCode` is absent, calls `getDefaultDistributionCurrency` first and includes the resolved code in the response (5.8.3).
- `server/src/compensation-reports/reports.routes.js` (modify) — add `GET /api/reports/headcount`, `GET /api/reports/salary-distribution`.
- `client/src/api/reports.api.js` (modify) — add `getHeadcount(groupBy)`, `getSalaryDistribution(currencyCode?)`.
- `client/src/features/headcount-reports/HeadcountReportsPage.jsx`, `useHeadcountQuery.js`, `useSalaryDistributionQuery.js` (new) — headcount rendered as a simple bar chart or table (bar chart via MUI's plain `Box` width-percentage bars — no new charting dependency needed for eight-or-fewer categories, per the code-craft ladder's "one line" step); distribution rendered as a histogram of ten bars.

**Collaborators:** Same as 5.7 — `reports.service.js` depends on `employees.repository.js`, no new repository.

**Control flow**

- `getHeadcount`: `SELECT <group_col>, COUNT(*) FROM employees GROUP BY <group_col>` — no currency dimension here (headcount is currency-independent), sums to the total employee count by construction (5.8.1).
- `getSalaryDistribution`: `SELECT MIN(salary_minor_units), MAX(salary_minor_units) FROM employees WHERE currency_code = ?` first; guard: if `MIN = MAX` (degenerate single-value case), return one bucket spanning that value with the full count; otherwise compute `bucketWidth = (max - min) / 10` and a second query bucketing via `CAST((salary_minor_units - min) / bucketWidth AS INTEGER)` (clamping a salary exactly at `max` into bucket 9, not a stray bucket 10, via `MIN(bucketIndex, 9)`), grouped and counted per bucket index.
- Service: no `currencyCode` param → resolve via `getDefaultDistributionCurrency`, include it in the response envelope (5.8.3).

**Tests:** Extend `server/src/employees/employees.repository.test.js` — headcount rows sum to the total employee count (5.8.1); a distribution request with an explicit `currencyCode` only counts that currency's employees (5.8.2); a distribution request with no `currencyCode` resolves to the highest-headcount currency and states it (5.8.3); the degenerate all-equal-salary case returns one bucket, not a divide-by-zero. Extend `server/src/compensation-reports/reports.service.test.js` for the currency-resolution branch.

**Standards that bite here:** Clean Code guard clauses (the `MIN = MAX` degenerate case is an explicit early guard, not an implicit divide-by-zero risk buried in the main path); SonarJS `sql-queries` (bucket-index computation stays parameterized on `min`/`bucketWidth` values bound as `?`, never interpolated).

**Quality checks**

- The degenerate single-salary-value distribution case is covered by a test, not left as an unguarded division.
- Headcount rows sum to exactly the total employee count for every `groupBy` value — a group can't silently drop or double-count rows.
- Both endpoints respond in under 500 ms against the full 10,000-row seeded dataset ([AC 5.8.4](../specs/001-employee-salary-management-spec.md#58-view-headcount-and-salary-distribution) performance floor), verified by a test that seeds the full dataset once and asserts on wall-clock time.

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Open Headcount; switch grouping; open the salary-distribution histogram; confirm it renders a sensible spread for the resolved default currency and updates when a different currency is chosen.
3. **Accessibility.** Confirm the bar/histogram visualizations pair color with a numeric label on each bar (never color alone, per `design-craft`'s color-blind-safety rule) and that the currency selector is keyboard-operable.

---

## Slice 5.9 — Export the current view to CSV

**Key decision:** Adds three export endpoints (directory, compensation stats, headcount) using the streaming technique from [Decision 6 in the risk list](#where-this-could-go-wrong) — `better-sqlite3`'s `.iterate()` yields rows one at a time without materializing the full result set, which is what makes the 10,000-row unfiltered export safe (5.9.5).

**Structure**

- `server/src/shared/csv.js` (new) — `function toCsvRow(fields: Array<string | number>): string` — RFC4180-style: wraps a field in double quotes if it contains a comma, quote, or newline, doubling any embedded quotes; joins fields with commas and appends `\r\n`. `function writeCsvStream(res: Response, headerFields: string[], rows: Iterable<Array<string|number>>): void` — writes the header row, then one row at a time from the iterable, setting `Content-Type: text/csv` and `Content-Disposition: attachment; filename="..."` before the first write.
- `server/src/employees/employees.repository.js` (modify) — add `function iterateMatching(db, filters: { search?, departmentId?, countryId?, jobLevelId? }): IterableIterator<EmployeeRow>` — same `WHERE`-building logic as `findMany` (5.2), factored into a shared internal helper so the two don't duplicate filter-clause construction, but no `LIMIT`/`OFFSET` — returns `stmt.iterate(...params)` directly. `[verified]` `better-sqlite3`'s `Statement#iterate()` is a documented, stable core API that pulls rows lazily from SQLite rather than buffering the full result set in a JS array — this is what satisfies 5.9.5.
- `server/src/employees/employees.routes.js` (modify) — add `GET /api/employees/export`.
- `server/src/compensation-reports/reports.routes.js` (modify) — add `GET /api/reports/compensation-stats/export`, `GET /api/reports/headcount/export` (these two reuse 5.7/5.8's existing repository methods, which already return small, fully-materialized arrays — no streaming concern for report exports, only for the potentially-10,000-row employee export).
- `client/src/shared/ExportCsvButton.jsx` (new) — a plain `<a>`-styled MUI `Button` whose `href` is the export URL with the current filters/groupBy serialized as query params (a real navigation download, not a fetch-then-blob dance — simpler and handles large responses without buffering client-side either).
- `client/src/features/employee-directory/DirectoryPage.jsx`, `compensation-reports/CompensationReportsPage.jsx`, `headcount-reports/HeadcountReportsPage.jsx` (modify) — each renders one `ExportCsvButton` wired to its own export URL.

**Collaborators:** The employee-export route handler constructs no service-layer object of its own beyond calling `employees.repository.iterateMatching` directly and streaming through `writeCsvStream` — this one read path is thin enough that an intermediate service function would add a layer with nothing to decide (per the code-craft ladder, this is the "does this need to exist?" step resolving to no).

**Control flow**

- Employee export: parse the same filter query params as `GET /api/employees` (no `page`/`pageSize` — 5.9.1); convert each yielded row's `salary_minor_units` to major units and its currency into a separate column *inline in the row-mapping step*, not by reusing the directory's DTO mapper (which is shaped for JSON, not CSV rows) (5.9.3); stream via `writeCsvStream`.
- Report exports: call the existing `getCompensationStats` / `getHeadcount` service functions (already small, in-memory arrays — no iterator needed), map each to a CSV row, write all at once via `writeCsvStream` (still using the same header-then-rows shape for consistency, just backed by an array instead of an iterator).
- `writeCsvStream` sets headers before the first `res.write()` call and never buffers rows in an array — each row is encoded and written as it's produced (5.9.5).

**Tests:** New file `server/src/shared/csv.test.js` — a field containing a comma, a quote, and a newline is quoted and escaped correctly (pure function, trivially unit-testable). New file `server/src/employees/employees.repository.test.js` (extend) — `iterateMatching` with the same filters as an equivalent `findMany` call yields the same rows, confirming the shared filter-building helper stays consistent between the two paths (this is the regression guard for 5.9.1 mirroring [invariant 4.5](../specs/001-employee-salary-management-spec.md#4-invariants)). New file `server/src/employees/employees.routes.test.js` (or extend an existing route-level test) — the export response's `Content-Disposition` header is present (5.9.4); monetary columns in the exported CSV are in major units with a separate currency column (5.9.3).

**Standards that bite here:** Clean Code DRY (filter-clause construction shared between `findMany` and `iterateMatching`, not duplicated); SonarJS `sql-queries` (the iterator's underlying statement is parameterized identically to `findMany`'s).

**Quality checks**

- **No CSV/Excel import endpoint or upload UI is added anywhere in this slice** (spec §9.4 accepted-limit stays out — export and import are the most naturally-paired feature in this entire plan, and this is exactly where a builder would be tempted to "complete the pair").
- The employee export never holds the full matching result set in a JS array at once — verified by the `iterateMatching` test confirming it returns an iterator, not an array, and by code review confirming `writeCsvStream` never calls `.toArray()` or spreads the iterable before writing (**this is the single highest-risk assertion in this slice**).
- Every exported CSV's monetary column is in major units (e.g. `950000.00`), never minor units — the inverse of the API's JSON convention, so this is an easy place to regress by copy-pasting the wrong mapper.

**Verification (slice complete when these pass)**

1. **Tests.** Full test suite green.
2. **User-facing flow.** Export the unfiltered directory (10,000 rows) and confirm the download completes and opens correctly in a spreadsheet tool; export a filtered subset and confirm the CSV contains exactly the filtered rows, not the full set; export both report views.

---

## Hard floors

None. No slice touches authentication, authorization/guard logic, payment, or security-sensitive crypto/secrets (v1 has no auth by explicit, reasoned scope cut — [spec §9.1](../specs/001-employee-salary-management-spec.md#9-deferred-follow-ups-and-accepted-limits)). Slice 5.1's `CREATE TABLE` is the *initial* schema definition in a greenfield database with no pre-existing production data — categorically different from a migration against a live schema, so the "migrations" floor category does not apply here.

## Escalation log

<empty — /anthara:plan-implementer appends entries here as they occur>
