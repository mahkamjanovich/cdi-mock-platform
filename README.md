# CDI Mock Platform

An open-source platform for running **computer-delivered IELTS (CDI) mock exams** at small language schools and learning centres.

Built at an English learning centre in Namangan, Uzbekistan, where students preparing for the computer-delivered IELTS had no affordable way to practise in the real exam format. Paid mock services are expensive for small centres, so this platform lets a centre run its own full mock sessions on any computer lab or student laptops.

## Features

**Student panel**
- Login with a short ID code (no accounts or passwords for students)
- Sound check screen, then Listening → Reading → Writing in the official order
- Listening audio synced to the timer (cannot be paused; resumes at the right point after a page reload)
- Text highlighting, question flagging, and auto-save of every answer
- Offline-tolerant: answers are kept on the device and sent when the connection returns
- Sections submit automatically when time runs out

**Admin panel**
- Test library: build Listening, Reading and Writing tests with 7 IELTS question types (MCQ, True/False/Not Given, Yes/No/Not Given, matching headings, matching information, gap fill, short answer)
- Sessions: create a session, add students one by one or by CSV, print ID codes, open sections
- Automatic marking for Listening and Reading
- Grading for teachers: Writing (4 criteria per task, 0–9 in 0.5 steps) and Speaking band entry
- Role-based access: `admin`, `writing_teacher`, `speaking_teacher`
- Results table with Excel (.xlsx) and CSV export; Overall band calculated IELTS-style
- Uzbek / English interface for staff

## Tech stack

React 18 + Vite, Supabase (Postgres, Auth, Storage, RPC functions), deployable to Vercel or any static host.

## Getting started

> The Supabase SQL schema (tables, RLS policies and RPC functions) will be added to `supabase/` in the next release.

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL and anon (publishable) key
npm run dev
```

- Student panel: `http://localhost:5173/`
- Staff panel: `http://localhost:5173/admin`
- Demo mode with fake data (local dev only, nothing is written to the database): `/?demo` and `/admin?demo`

## Security model

- The browser only ever holds the Supabase **anon / publishable** key. Never put the `service_role` key in this app or in any `VITE_` variable.
- Students never read tables directly. All student actions (login, start, save answer, submit) go through Postgres RPC functions that check the ID code and session state on the server.
- Correct answers are stored in the database and marked on the server; the student panel never requests them.
- Row Level Security must be enabled on every table; staff access is limited by role.
- Wrong ID codes are rate-limited per IP (15 attempts per 5 minutes).

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Test content

This repository contains **no exam material**. Tests are created by each centre in the admin panel. Do not upload copyrighted Cambridge or IELTS materials unless you have the rights to use them.

## License

[MIT](LICENSE)
