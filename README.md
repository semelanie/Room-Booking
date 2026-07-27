# NIHSS Room Booking

A static site (HTML/CSS/vanilla JS) for the NIHSS room booking homepage,
wired up to Supabase for real room data and booking requests, ready to
deploy on Vercel. No build step, no framework, no server required.

## What's in here

```
index.html              homepage (hero, features, rooms, gallery, guidelines, footer)
css/styles.css           all styling
js/main.js                nav, modals, gallery, Supabase calls
js/supabase-config.js     your Supabase URL + anon key go here
supabase/schema.sql       tables + seed data for the 5 rooms shown on the page
assets/                   logo + hero photo
vercel.json               Vercel config (just cleanUrls, nothing fancy)
```

Booking-related buttons (Reserve Your Space, Book Now, Check Availability, My
Bookings) open modals that read/write directly to Supabase.

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

## Notes

- The anon key is safe to expose in the browser; access is governed by the
  row-level security policies in `schema.sql` (public can read active rooms
  and view/create bookings; nothing else is exposed).
- Room images are currently drawn as icon/gradient placeholder cards (the
  "ticket stub" look) apart from the hero photo — swap in real room photos
  by editing `.ticket-media` in `css/styles.css` and the inline SVGs in
  `index.html`.
- Admin approval, email notifications, and reporting (mentioned in the
  Features section) aren't built yet — this pass covers the public homepage
  and the booking/availability/lookup flows. Happy to build an admin
  dashboard next if useful.
