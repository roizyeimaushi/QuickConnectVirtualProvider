# Deep-Dive Audit: Attendance Sheet System
## System, API, Backend, Database, Frontend (Next.js/React)

**Audit Date:** February 3, 2026  
**Scope:** End-to-end — API layer, backend (Laravel/PHP), database, frontend (Next.js 16 / React 19), data loading, error handling, security.

---

## Executive Summary

This audit goes beyond the existing QA report to surface **data-loading bugs**, **API/backend inconsistencies**, **database/settings key mismatches**, and **frontend UX/error-handling gaps**. Several issues cause broken UX (e.g. pagination never enabled, settings not applied) or deployment failures on non-MySQL databases.

---

## CRITICAL BUGS

### 1. **Employees Page: Pagination Permanently Disabled**

**Location:** `src/app/employees/page.jsx`

**Issue:** `loading` is initialized to `true` but **never set to `false`**. `fetchEmployees()` has no `setLoading(false)` in `try` or `finally`. As a result:

- Pagination buttons use `disabled={currentPage === 1 || loading}` and `disabled={currentPage === totalPages || loading}` → they stay **disabled forever**.
- Any UI that keys off `loading` (e.g. skeletons) would never clear.

**Fix:** In `fetchEmployees`, in both success and error paths, set loading to false (e.g. in `finally`):

```javascript
} finally {
    if (!isPolling) setLoading(false);
    if (isFirstLoad) setIsFirstLoad(false);
}
```

And set `setLoading(true)` at the start of the first fetch (or when search/page changes for non-polling).

---

### 2. **Backend: Setting Key Mismatch — Duplicate Check-In Never Applied**

**Location:**  
- `backend/quickcon-api/app/Http/Controllers/AttendanceRecordController.php` (line ~132)  
- `backend/quickcon-api/app/Http/Controllers/SettingsController.php` (allowed keys)  
- `backend/quickcon-api/database/seeders/SettingsSeeder.php`

**Issue:** The confirm (time-in) logic reads:

```php
$settings = Setting::whereIn('key', ['allow_multi_checkin', 'grace_period', 'prevent_duplicate'])
$preventDuplicate = filter_var($settings->get('prevent_duplicate', true), FILTER_VALIDATE_BOOLEAN);
```

But the **database and settings whitelist** use the key **`prevent_duplicate_checkin`** (e.g. in SettingsSeeder and getAllowedSettingKeys). So:

- The key `prevent_duplicate` is never stored; the controller always gets `null` and defaults to `true`.
- Admin cannot turn off “prevent duplicate” via settings UI, because the UI would update `prevent_duplicate_checkin`, which the controller never reads.

**Fix:** Use a single key everywhere. Either:

- In `AttendanceRecordController::confirm()`, change to `prevent_duplicate_checkin` and read that key, or  
- Add `prevent_duplicate` to the seeder and allowed keys and keep the controller as-is.

Recommended: use **`prevent_duplicate_checkin`** in the controller so it matches the rest of the app.

---

### 3. **Backend: Restore Uses MySQL-Only Syntax (PostgreSQL/SQLite Fail)**

**Location:** `backend/quickcon-api/app/Http/Controllers/SettingsController.php` — `restore()` method

**Issue:** The restore uses:

```php
\Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
// ... restore ...
\Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');
```

This is **MySQL-specific**. On PostgreSQL or SQLite (default in `config/database.php` is `sqlite`), this will throw and **restore will fail**.

**Fix:** Use the Laravel driver to branch:

```php
$driver = \Illuminate\Support\Facades\DB::getDriverName();
if ($driver === 'mysql') {
    DB::statement('SET FOREIGN_KEY_CHECKS=0;');
}
// ... restore ...
if ($driver === 'mysql') {
    DB::statement('SET FOREIGN_KEY_CHECKS=1;');
}
```

(PostgreSQL can defer constraints in a transaction; SQLite ignores FK during the transaction when not explicitly enabled.)

---

## HIGH / DATA LOAD & API ISSUES

### 4. **API Response Shape Inconsistency (Auth /me)**

**Location:** `src/components/providers/auth-provider.jsx` (line ~76)

**Issue:** Backend `AuthController::me()` returns `response()->json($request->user())` — i.e. the **raw user object** as the JSON body. The frontend does:

```javascript
const response = await authApi.me();
setUser(response.data || response.user || response);
```

So `response` *is* the user; `response.data` and `response.user` are undefined. This works only because of the fallback `|| response`. If any other code assumes `response.user` or `response.data`, it can break. Backend login returns `{ token, user }`, so the API is inconsistent (me = raw user, login = wrapped).

**Recommendation:** Either have the backend return `{ user: $request->user() }` for `/auth/me`, or document that the client must treat the body as the user object and avoid relying on `.data`/`.user` elsewhere.

---

### 5. **SSR / Build-Time API Base URL**

**Location:** `src/lib/constants.js` — `API_BASE_URL`

**Issue:** When `NEXT_PUBLIC_API_URL` is empty or `/api`:

- **Client:** `API_BASE_URL` = `'/api'` (correct for monolith).
- **Server (SSR/build):** `typeof window === 'undefined'` → `API_BASE_URL` = `'http://localhost:8000/api'`.

So any **server-side** or **build-time** request (e.g. from a server component or getServerSideProps) would hit localhost:8000, which is wrong in production. Currently the app appears to call the API only from the client (e.g. auth-provider, pages with useEffect), so this may not be hit yet — but it’s a latent bug if you add SSR data fetching.

**Recommendation:** For monolith, ensure server-side code either does not call the API or uses a server-only env (e.g. `API_URL_INTERNAL`) that defaults to the same origin in production.

---

### 6. **No Global Error Boundary**

**Location:** `src/app/` — no `error.jsx` or React Error Boundary

**Issue:** Uncaught React errors in any component will bubble up and can **crash the whole app** (blank screen). There is no global error boundary to catch and display a fallback.

**Recommendation:** Add `src/app/error.jsx` (and optionally `global-error.jsx`) to catch errors and show a friendly message + retry, and use error boundaries around critical sections (e.g. dashboard, reports).

---

### 7. **Daily Report: Large `per_page` Request**

**Location:** `src/app/reports/daily/page.jsx` (line ~90)

**Issue:** The frontend requests `per_page: 5000` to “handle client-side pagination.” This:

- Can load thousands of records in one response (memory/CPU on backend and frontend).
- Increases risk of timeouts and slow TTI.

**Recommendation:** Use server-side pagination: request a reasonable `per_page` (e.g. 20–50), use `current_page` and `last_page` from the API, and implement “Load more” or page controls instead of fetching 5000 at once.

---

### 8. **Backend: N+1 and Missing Indexes (Already Noted in QA)**

**Location:** Various controllers and migrations

**Issue:** The QA report already recommends indexes for:

- `attendance_records(user_id, attendance_date)` — e.g. getTodayAttendance.
- `attendance_records(session_id, user_id)` — session lookups.
- `user_sessions(user_id, is_online)` — heartbeat/session logic.

Without these, heavy usage will slow down.

**Recommendation:** Add the suggested indexes and, where applicable, use `with()` to eager-load relations and avoid N+1 (e.g. in ReportController and AuditLogController).

---

## MEDIUM / FRONTEND & UX

### 9. **Inconsistent Loading and Error UI**

**Location:** Multiple pages (employees, schedules, sessions, audit-logs, reports)

**Issue:** Some pages use:

- Full-page spinner only on “first load” (e.g. employees use `isFirstLoad`), and never show a loading state for pagination or filters.
- Others (e.g. admin dashboard) correctly use `loading` and set it false in `finally`.
- Error handling is mostly toasts or console; few pages show an inline “Failed to load, retry” state.

**Recommendation:** Standardize: (1) set `loading` to false in all fetch paths (try/catch/finally); (2) use a small loading indicator for pagination/filter; (3) where appropriate, show an inline error state with a retry button instead of only a toast.

---

### 10. **Middleware vs Auth Route Lists**

**Location:** `src/middleware.js` vs `src/lib/auth.js` — `isRouteAllowed` / `adminRoutes` / `employeeRoutes`

**Issue:** Middleware only checks for a token and redirects to login or `/dashboard`; it does not enforce admin vs employee routes. Route allowlists live in `auth.js` (`isRouteAllowed`), used for client-side checks. So:

- An employee could manually open `/reports/daily`; the API would return 403, but the page might still render (loading then error), which is confusing.
- The sidebar correctly hides Reports for employees (permissions.js), so this is mainly a UX/consistency issue, not a security hole (API enforces 403).

**Recommendation:** Optionally, in middleware or in a layout, reject known admin paths when the user is an employee (e.g. by decoding JWT role or calling a small API) and redirect to employee dashboard to avoid a flash of the wrong UI.

---

### 11. **Token Storage: LocalStorage vs Cookie**

**Location:** `src/lib/api.js`, `src/components/providers/auth-provider.jsx`, `src/middleware.js`

**Issue:** API client reads token from `localStorage` first, then Cookies; auth-provider syncs localStorage → Cookie when cookie is missing; middleware reads **only** Cookies. If a code path ever wrote only to localStorage, the user would be “logged in” on the client but middleware would redirect to login. The QA report already flags this; the current sync in auth-provider mitigates it, but it’s fragile.

**Recommendation:** Ensure every login/setToken path writes to **both** localStorage and Cookies (and that api.js and auth-provider use the same keys and options). Consider a single “setAuthToken” helper used everywhere.

---

## BACKEND / DATABASE SUMMARY

| Item | Status / Note |
|------|----------------|
| AuthController::me() | Returns raw user; frontend handles with `\|\| response` but API shape is inconsistent. |
| Settings restore | MySQL-only FOREIGN_KEY_CHECKS; will fail on PostgreSQL/SQLite. |
| prevent_duplicate | Controller reads `prevent_duplicate`; DB/seeder use `prevent_duplicate_checkin` → setting has no effect. |
| Settings whitelist | Fixed in QA; allowed keys are whitelisted. |
| Backup restore (users) | Safe fields only; no role/password from backup. |
| Logo upload | SVG removed per QA. |
| Pagination (Laravel) | Controllers return `paginate()`; frontend generally uses `response.data`, `response.last_page`, `response.total`. |
| ReportController dailyReport | Returns `{ date, summary, records }` where `records` is a full paginator; frontend handles both `records.data` and array. |

---

## FRONTEND / NEXT.JS SUMMARY

| Item | Status / Note |
|------|----------------|
| Employees page loading | **Bug:** `loading` never set to false → pagination always disabled. |
| Admin dashboard loading | Correct: setLoading(false) in finally. |
| API_BASE_URL (SSR) | Server/build uses localhost:8000 when env is empty; latent issue if SSR calls API. |
| Error boundary | None; add app-level error.jsx. |
| Daily report per_page | 5000 requested; should use server-side pagination. |
| Auth /me response | Handled with fallback; backend shape should be documented or unified. |

---

## RECOMMENDED FIX ORDER

1. **Employees page:** Set `loading` to false in `fetchEmployees` (and optionally true at start of fetch) so pagination works.
2. **Backend:** Use `prevent_duplicate_checkin` in AttendanceRecordController (or align seeder/whitelist to `prevent_duplicate`) so the setting is applied.
3. **Backend:** Make Settings restore database-agnostic (MySQL-only FOREIGN_KEY_CHECKS).
4. Add **error.jsx** (and optionally global-error.jsx) for better failure UX.
5. **Daily report:** Switch to server-side pagination and remove per_page: 5000.
6. (Optional) Unify auth API response shape (e.g. `/auth/me` returns `{ user }`) and document it.
7. Add DB indexes and review N+1 as in the QA report.

---

*Deep-dive audit completed. Address critical and high items first for stability and correct behavior.*
