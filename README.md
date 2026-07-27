# NIHSS Room Booking

A static site (HTML/CSS/vanilla JS) for the NIHSS room booking homepage,
wired up to Supabase for real room data and booking requests, ready to
deploy on Vercel. No build step, no framework required — the only
server-side piece is one small Supabase Edge Function used for secure staff
account creation (see "Administrator system" below).

## What's in here

```
index.html                     homepage (hero, features, rooms, gallery, guidelines, footer)
login.html                      management sign-in page
dashboard.html                  management dashboard (stats, filters, table, approve/reject)
admin-login.html                administrator sign-in page
administrator-dashboard.html    administrator dashboard (activity log, staff management)
css/styles.css                  all styling
js/main.js                       nav, modals, gallery, Supabase calls
js/auth-client.js                 shared Supabase client (Remember-Me-aware session storage)
js/login.js                       management sign-in logic
js/admin-login.js                 administrator sign-in logic (+ role check)
js/dashboard.js                   management dashboard data, filters, pagination, approve/reject
js/admin-dashboard.js             activity log + staff create/reset/remove
js/supabase-config.js            your Supabase URL + anon key go here
supabase/schema.sql              tables, roles, activity log, triggers, seed data
supabase/functions/admin-manage-users/index.ts   Edge Function for creating/removing staff logins
supabase/functions/monthly-report/index.ts       Edge Function that emails the monthly booking summary
assets/                          logo + hero photo
vercel.json                      Vercel config (just cleanUrls, nothing fancy)
```

Booking-related buttons (Reserve Your Space, Book Now, Check Availability, My
Bookings) open modals that read/write directly to Supabase.

## Management dashboard

`login.html` and `dashboard.html` give management a way to review, approve,
or reject booking requests.

There's no public sign-up page — management accounts are now created from
the Administrator dashboard (see below) rather than the Supabase dashboard —
though creating one manually via **Authentication → Users → Add user** still
works too, as long as you also give them a role (see "Administrator system").

The dashboard shows total/approved/pending/rejected counts, lets you filter
by status, and gives each pending request an Approve/Reject action (approved
requests can be cancelled). This relies on the "Management can update
bookings" policy in `schema.sql`, which restricts status changes to signed-in
users only — the public site can create bookings but can't approve them.

Two more things live here:
- **Current/Upcoming vs History** — a second filter row splits bookings by
  date (today onward vs. in the past), independent of the status filter, so
  you can see e.g. "pending + upcoming" or "approved + history".
- **Download CSV** — exports whatever's currently filtered/visible (not just
  the current page) as a `.csv` file, generated entirely in the browser.


## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `rooms` and `bookings`
   tables, sets up row-level security, and seeds the 5 rooms already on the
   homepage.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Connect the site to Supabase

Open `js/supabase-config.js` and replace the two placeholder strings with
your real values:

```js
export const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

You can do this directly on github.com: open the file → click the pencil
"Edit" icon → change the two values → commit directly to the main branch.
No terminal, no build step — Vercel will redeploy automatically.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo (GitHub Desktop is the easiest way —
   avoid the website's "Upload files" button for a project with folders in
   it, since it can drop nested files).
2. In Vercel, **Add New → Project**, import the repo.
3. Leave build settings as default (Framework Preset: **Other**) — there's
   nothing to build, Vercel just serves the files as-is.
4. Deploy.

## Administrator system (activity log + staff management)

Beyond the Management dashboard, there's a separate **Administrator** area:

- `admin-login.html` → `administrator-dashboard.html`
- Shows a live **Activity Log** (logins — successful and failed, booking
  submissions, approvals/rejections/cancellations, staff account changes)
- Lets an administrator **create new Management or Administrator accounts**,
  **reset anyone's password**, and **remove accounts** — all from the
  dashboard, no Supabase dashboard access needed after initial setup

### One-time setup (do this in order)

**1. Run the updated `schema.sql`** — it adds two new tables (`staff_roles`,
`activity_log`), a trigger that automatically logs booking activity, and a
`get_staff_directory()` function.

**2. Create your first Administrator account:**
```sql
-- a) Supabase dashboard → Authentication → Users → Add user
--    (creates the login itself)
-- b) Copy that user's UID from the same screen, then run:
insert into public.staff_roles (user_id, role)
values ('paste-the-user-uid-here', 'administrator');
```
Every account after this one can be created directly from the dashboard.

**3. Deploy the Edge Function** (this is the one piece that can't be a plain
static file — creating logins securely requires Supabase's service role key,
which must never be sent to the browser, so it lives in a small
server-side function instead):

```bash
# from the project root, with the Supabase CLI installed
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-manage-users
```
That's it — no secrets to set manually, the function already has access to
your project's service role key automatically once deployed.

**4. Sign in** at `/admin-login.html` with the account from step 2.

### How the pieces fit together

- **Activity log** — booking creation/approval/rejection/cancellation are
  logged automatically by a database trigger (can't be skipped or spoofed
  from the browser). Login attempts are logged from `login.js` /
  `admin-login.js` directly, including failed attempts.
- **Roles** — `staff_roles` marks each Supabase Auth user as `management` or
  `administrator`. The Management dashboard accepts either role; the
  Administrator dashboard requires `administrator` specifically.
- **Creating/removing accounts** goes through the `admin-manage-users` Edge
  Function, which re-checks the caller is really an administrator on every
  call. **Resetting a password** doesn't need the Edge Function at all — it
  just sends a normal Supabase password-reset email.

## Monthly report email

Under **Report Recipients** on the Administrator dashboard, you can add or
remove email addresses that receive an automatic monthly summary of that
month's bookings (totals, plus a table of every booking with its status).

This needs one more piece of setup, since actually sending email requires an
email provider — this uses [Resend](https://resend.com) (free tier is
plenty for a monthly email), but the code is easy to swap for SendGrid,
Postmark, etc. if you'd rather use one of those.

**Setup:**

1. Create a free account at resend.com, verify a sending domain (or use
   their test domain while trying this out), and grab an API key.
2. Deploy the second Edge Function and set its secrets:
   ```bash
   supabase functions deploy monthly-report
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   supabase secrets set REPORT_FROM_EMAIL="NIHSS Room Booking <bookings@yourdomain.com>"
   supabase secrets set CRON_SECRET=make-up-a-long-random-string
   ```
3. Schedule it to run monthly — run the `pg_cron`/`pg_net` block near the
   bottom of `schema.sql` in the Supabase SQL Editor, filling in your project
   ref and the same `CRON_SECRET` you set above.
4. Add at least one recipient under **Administrator dashboard → Report
   Recipients** — the function skips sending if that list is empty.

You can test it immediately without waiting for the schedule by calling the
function directly (e.g. with `curl`, including the `x-cron-secret` header)
from the Supabase Functions dashboard's built-in testing tool.

## Notes

- The anon key is safe to expose in the browser; access is governed by the
  row-level security policies in `schema.sql`.
- Room images are currently drawn as icon/gradient placeholder cards (the
  "ticket stub" look) apart from the hero photo — swap in real room photos
  by editing `.ticket-media` in `css/styles.css` and the inline SVGs in
  `index.html`.
- Email notifications (mentioned in the Features section) aren't built yet —
  approvals/rejections update instantly in the dashboard and activity log,
  but nothing emails the requester automatically yet. That would need
  either a Supabase Database Webhook calling an email API, or an extra Edge
  Function — happy to add it if useful.
