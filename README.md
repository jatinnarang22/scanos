# ScanOS — Scan Slot Scheduler

A day-view scheduling board for a diagnostic imaging center's machine
fleet (MRI / CT / Ultrasound), built for the ScanOS take-home. Backend
is Django + Django REST Framework; frontend is Next.js (App Router) +
TypeScript.

## Running it

### Option A — Docker (one command)

```bash
docker compose up --build
```

- Backend: http://localhost:8000/api/
- Frontend: http://localhost:3000

Each container start runs migrations and re-seeds 3 machines + ~10
appointments for the current day, so the board is never empty on first
load.

### Option B — running each half locally

**Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed           # 3 machines + ~10 appointments for today
python manage.py runserver 0.0.0.0:8000
```

**Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The frontend reads the API base URL from
`NEXT_PUBLIC_API_URL` (see `frontend/.env.local`, already set to
`http://localhost:8000/api` for local dev).

**Running backend tests**

```bash
cd backend
python manage.py test scheduling
```

11 tests cover the overlap rule and its boundaries specifically (see
"Key decisions" below for why that's the one place we invested test
effort).

## Key decisions and judgment calls

**Overlap detection is one isolated, tested function.** `scheduling/services.py::create_appointment`
is the single entry point for booking a slot. It runs shape validation
(duration, grid alignment, operating hours) and then the overlap check —
`existing.start < new.end AND existing.end > new.start` — inside one
database transaction. Strict inequalities on both sides are what let
back-to-back bookings succeed (one ends 10:00, the next starts 10:00)
while rejecting any true overlap, including a booking fully nested
inside an existing one. This logic has no dependency on DRF or HTTP, so
`scheduling/tests.py` exercises it directly with 11 cases against every
boundary the brief calls out.

**Concurrency: `select_for_update()`, with an honest caveat about
SQLite.** The create path wraps the overlap check and the insert in
`select_for_update()` inside a transaction — the standard way to make
two concurrent requests for the same machine queue up on a row lock
instead of racing past each other. SQLite (used here for zero-setup
local running, per the brief's own suggestion) has no row-level locking,
so on this database `select_for_update()` is a documented no-op — Django
silently ignores it rather than erroring. That's a real, named gap in
this environment rather than a hidden one: the same code becomes
race-safe against concurrent writers with no changes on Postgres or
MySQL, which is what a real deployment of this feature would use.

**Validation lives in a service layer, not the serializer.** DRF
serializers handle field parsing/typing only. The scheduling *rules*
live in `scheduling/services.py` so the overlap check can run inside the
same locking transaction as the insert, and so the rules are reusable
and testable independent of any HTTP framework.

**One error contract for the whole API.** Every rejection —
validation failure, overlap, not-found — returns
`{"error": {"code": "...", "message": "..."}}`. The frontend's
`ApiRequestError` class always carries both fields, so every place that
shows an error to the user is showing the server's specific reason, not
a generic failure. This was a specific ask in the brief ("conflict
handling is part of the UI ... not a silent failure, not a generic
error") and it's the reason `BookingModal` and the cancel confirm dialog
both render inline, code-specific messages instead of a toast.

**Naive local datetimes (`USE_TZ = False`), not UTC.** This is a
single-location facility, not a multi-timezone product. Storing and
comparing timezone-aware UTC datetimes would add a real class of bugs
(the "is this inside 08:00–20:00" check becomes a conversion problem)
for a requirement the brief never asks for. The frontend mirrors this by
never running these strings through `new Date()` for time-of-day math
(`lib/schedule.ts::timeStringToMinutes` slices `HH:MM` directly instead)
— `Date()` would silently reinterpret a timezone-less string in the
browser's own local timezone, which is exactly the bug this whole
decision is trying to avoid.

**The board's layout is 3 constants, not hardcoded pixels.**
`lib/schedule.ts` defines `DAY_START_MINUTES`, `DAY_END_MINUTES`,
`SLOT_MINUTES`, and `PIXELS_PER_SLOT`. Every block's position and height
(`computeBlockGeometry`) is derived from those plus the appointment's
own start/end time — nothing about row height, slot count, or block
placement is hardcoded anywhere else. Changing operating hours or slot
granularity is a one-line change, not a rewrite, which was an explicit
grading criterion in the brief.

**Cancel is a hard delete.** No cancellation/audit history is asked
for in the brief, and adding a soft-delete status field would be scope
beyond what's needed. Noted here as a deliberate choice rather than an
oversight.

**Modality filtering is client-side.** All of one day's appointments
across 3 machines is a tiny payload; filtering it in the browser is
instant and avoids a round trip per filter click. Re-fetching per
filter would be the right call at a much larger fleet size.

**One dependency-light lint suppression.** `hooks/useMachines.ts` and
`hooks/useAppointments.ts` reset `loading`/`error` state at the top of
a data-fetching effect — the standard "refetch when the key changes"
pattern. A newer, fairly opinionated ESLint rule
(`react-hooks/set-state-in-effect`) flags any synchronous `setState` in
an effect body on principle, nudging toward a data-fetching library like
TanStack Query. For this exercise's scope, hand-rolled `fetch` in
`useEffect` is simpler and dependency-free, so the rule is suppressed
for those two lines with a comment explaining why, rather than either
contorting working code or adding a library just to satisfy one rule.

## Stack

- Backend: Django 5.2 + Django REST Framework, SQLite
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- No auth — single-tenant front-desk tool, out of scope per the brief
