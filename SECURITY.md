# Security Policy

Please **do not** open a public issue for security problems.

Report vulnerabilities privately through GitHub: **Security → Report a vulnerability** on this repository. You will get a reply within 7 days.

When you deploy this project:
- Use only the Supabase anon / publishable key in the frontend. Keep the `service_role` key out of the code and out of `VITE_` variables.
- Keep Row Level Security enabled on every table.
- Never commit `.env` files or real student data (names, phone numbers, Telegram usernames).
