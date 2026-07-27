-- NIHSS Room Booking — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)

-- ─────────────────────────────────────────────
-- Rooms
-- ─────────────────────────────────────────────
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,               -- e.g. 'Classroom', 'Meeting Room', 'Computer Room', 'Pantry'
  capacity int,                          -- null for spaces like the pantry
  description text not null,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.rooms is 'Bookable facilities shown on the site (classrooms, meeting rooms, etc).';

-- ─────────────────────────────────────────────
-- Bookings
-- ─────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text,
  status text not null default 'pending'   -- 'pending' | 'approved' | 'rejected' | 'cancelled'
    check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now()
);

comment on table public.bookings is 'Room reservation requests submitted from the site.';

create index if not exists bookings_room_date_idx on public.bookings (room_id, booking_date);
create index if not exists bookings_email_idx on public.bookings (requester_email);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;

-- Anyone can view active rooms
create policy "Public can view active rooms"
  on public.rooms for select
  using (is_active = true);

-- Anyone can submit a booking request
create policy "Public can create bookings"
  on public.bookings for insert
  with check (true);

-- Anyone can view bookings to check availability (no personal fields exposed beyond what's needed)
-- If you'd rather not expose requester details publicly, swap this for a view that hides them.
create policy "Public can view bookings for availability checks"
  on public.bookings for select
  using (true);

-- ─────────────────────────────────────────────
-- Seed data — matches the rooms described on the homepage
-- ─────────────────────────────────────────────
insert into public.rooms (name, category, capacity, description, sort_order) values
  ('Classroom A', 'Classroom', 10, 'Perfect for small training sessions, interviews, and intimate meetings.', 1),
  ('Classroom B', 'Classroom', 20, 'Ideal for medium-sized workshops, seminars, and team meetings.', 2),
  ('Boardroom', 'Meeting Room', 20, 'Professional setting for board meetings, presentations, and conferences.', 3),
  ('Computer Lab', 'Computer Room', 20, 'Fully equipped with computers for training sessions and IT workshops.', 4),
  ('Pantry', 'Pantry', null, 'Kitchen facilities for catering, coffee breaks, and informal gatherings.', 5)
on conflict do nothing;
