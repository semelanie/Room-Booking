import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase =
  SUPABASE_URL.startsWith('http')
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabase) {
  console.warn('[NIHSS] Supabase is not configured yet — fill in js/supabase-config.js (or the Vercel env vars) to enable live bookings.');
}

/* ---------------- mobile nav ---------------- */
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle?.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
});
mainNav?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => mainNav.classList.remove('open'))
);

/* ---------------- reveal on scroll ---------------- */
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(
  (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('in')),
  { threshold: 0.12 }
);
revealEls.forEach(el => io.observe(el));

/* ---------------- gallery ---------------- */
const track = document.getElementById('galleryTrack');
document.getElementById('galleryNext')?.addEventListener('click', () => {
  track.scrollBy({ left: 360, behavior: 'smooth' });
});
document.getElementById('galleryPrev')?.addEventListener('click', () => {
  track.scrollBy({ left: -360, behavior: 'smooth' });
});

/* ---------------- modals ---------------- */
const overlays = document.querySelectorAll('.modal-overlay');

function openModal(id, presetRoom) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'bookModal' && presetRoom) {
    const sel = document.getElementById('roomSelect');
    const opt = [...sel.options].find(o => o.textContent === presetRoom);
    if (opt) sel.value = opt.value;
  }
}
function closeModal(el) {
  el.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-open]').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(trigger.dataset.open, trigger.dataset.room);
  });
});
overlays.forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
  overlay.querySelector('[data-close]')?.addEventListener('click', () => closeModal(overlay));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') overlays.forEach(o => o.classList.contains('open') && closeModal(o));
});

/* ---------------- rooms: populate selects ---------------- */
let roomsCache = [];

async function loadRooms() {
  const roomSelect = document.getElementById('roomSelect');
  const checkRoom = document.getElementById('checkRoom');

  if (!supabase) {
    // Fallback list so the form is still usable before Supabase is wired up.
    roomsCache = [
      { id: 'classroom-a', name: 'Classroom A' },
      { id: 'classroom-b', name: 'Classroom B' },
      { id: 'boardroom', name: 'Boardroom' },
      { id: 'computer-lab', name: 'Computer Lab' },
      { id: 'pantry', name: 'Pantry' },
    ];
  } else {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order');
    if (error) {
      console.error(error);
    } else {
      roomsCache = data;
    }
  }

  [roomSelect, checkRoom].forEach(sel => {
    if (!sel) return;
    sel.innerHTML = roomsCache
      .map(r => `<option value="${r.id}">${r.name}</option>`)
      .join('');
  });
}
loadRooms();

/* ---------------- booking form ---------------- */
const bookForm = document.getElementById('bookForm');
const bookMsg = document.getElementById('bookMsg');

bookForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  bookMsg.className = 'form-msg';

  if (!supabase) {
    bookMsg.textContent = 'Booking storage is not connected yet. Add your Supabase URL and anon key in js/supabase-config.js.';
    bookMsg.classList.add('show', 'err');
    return;
  }

  const payload = {
    room_id: document.getElementById('roomSelect').value,
    booking_date: document.getElementById('bookDate').value,
    start_time: document.getElementById('startTime').value,
    end_time: document.getElementById('endTime').value,
    requester_name: document.getElementById('fullName').value.trim(),
    requester_email: document.getElementById('email').value.trim(),
    requester_phone: document.getElementById('phone').value.trim() || null,
    purpose: document.getElementById('purpose').value.trim() || null,
  };

  const submitBtn = bookForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const { error } = await supabase.from('bookings').insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Request';

  if (error) {
    bookMsg.textContent = `Something went wrong: ${error.message}`;
    bookMsg.classList.add('show', 'err');
  } else {
    bookMsg.textContent = 'Request submitted! You will receive an email once it is reviewed.';
    bookMsg.classList.add('show', 'ok');
    bookForm.reset();
  }
});

/* ---------------- check availability ---------------- */
const checkForm = document.getElementById('checkForm');
const checkResults = document.getElementById('checkResults');

checkForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  checkResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">Checking…</p>';

  if (!supabase) {
    checkResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">Connect Supabase to check live availability.</p>';
    return;
  }

  const roomId = document.getElementById('checkRoom').value;
  const date = document.getElementById('checkDate').value;

  const { data, error } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('room_id', roomId)
    .eq('booking_date', date)
    .in('status', ['pending', 'approved'])
    .order('start_time');

  if (error) {
    checkResults.innerHTML = `<p style="font-size:13.5px;color:var(--coral);">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    checkResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">No bookings yet — this slot looks open.</p>';
    return;
  }
  checkResults.innerHTML = data.map(b => `
    <div class="booking-row">
      <div class="top">
        <span>${b.start_time.slice(0,5)} – ${b.end_time.slice(0,5)}</span>
        <span class="status-pill status-${b.status}">${b.status}</span>
      </div>
    </div>
  `).join('');
});

/* ---------------- my bookings ---------------- */
const myBookingsForm = document.getElementById('myBookingsForm');
const myBookingsResults = document.getElementById('myBookingsResults');

myBookingsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  myBookingsResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">Looking up your bookings…</p>';

  if (!supabase) {
    myBookingsResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">Connect Supabase to look up bookings.</p>';
    return;
  }

  const email = document.getElementById('lookupEmail').value.trim();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_date, start_time, end_time, status, rooms(name)')
    .eq('requester_email', email)
    .order('booking_date', { ascending: false });

  if (error) {
    myBookingsResults.innerHTML = `<p style="font-size:13.5px;color:var(--coral);">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    myBookingsResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">No bookings found for that email.</p>';
    return;
  }
  myBookingsResults.innerHTML = data.map(b => `
    <div class="booking-row">
      <div class="top">
        <span>${b.rooms?.name ?? 'Room'}</span>
        <span class="status-pill status-${b.status}">${b.status}</span>
      </div>
      <div class="meta">${b.booking_date} · ${b.start_time.slice(0,5)}–${b.end_time.slice(0,5)}</div>
    </div>
  `).join('');
});
