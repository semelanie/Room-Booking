import { supabase } from './auth-client.js';

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

/* ---------------- gallery lightbox ---------------- */
const lightboxTriggers = [...document.querySelectorAll('[data-lightbox]')];
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxDesc = document.getElementById('lightboxDesc');
let lightboxIndex = 0;

function openLightbox(index) {
  lightboxIndex = (index + lightboxTriggers.length) % lightboxTriggers.length;
  const trigger = lightboxTriggers[lightboxIndex];
  lightboxImg.src = trigger.dataset.src;
  lightboxImg.alt = trigger.dataset.title;
  lightboxTitle.textContent = trigger.dataset.title;
  lightboxDesc.textContent = trigger.dataset.desc;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

lightboxTriggers.forEach((trigger, i) => {
  trigger.addEventListener('click', () => openLightbox(i));
});
document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
document.getElementById('lightboxNext')?.addEventListener('click', () => openLightbox(lightboxIndex + 1));
document.getElementById('lightboxPrev')?.addEventListener('click', () => openLightbox(lightboxIndex - 1));
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (!lightbox?.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') openLightbox(lightboxIndex + 1);
  if (e.key === 'ArrowLeft') openLightbox(lightboxIndex - 1);
});

/* ---------------- modals ---------------- */
const overlays = document.querySelectorAll('.modal-overlay');

function openModal(id, presetRoom) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'bookModal' && presetRoom) {
    const box = document.querySelector(`#resourceGrid input[value="${presetRoom}"]`);
    if (box) box.checked = true;
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

/* ---------------- resources: shared list for the booking form and filters ---------------- */
const RESOURCES = [
  'Classroom: 10 pers max',
  'Classroom: 30 pers max',
  'Classroom: 20 pers max',
  'Classroom: 25 pers max',
  'Meeting Room: 20 pers max',
  'Computer Room: 20 pers max',
  'Pantry',
];

/* ---------------- optional additional time slot ---------------- */
const slotToggle = document.getElementById('slotToggle');
const extraSlot = document.getElementById('extraSlot');
slotToggle?.addEventListener('click', () => {
  const willShow = extraSlot.hidden;
  extraSlot.hidden = !willShow;
  slotToggle.classList.toggle('open', willShow);
});

/* ---------------- booking form ---------------- */
const bookForm = document.getElementById('bookForm');
const bookMsg = document.getElementById('bookMsg');

bookForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  bookMsg.className = 'form-msg';

  const resources = [...document.querySelectorAll('#resourceGrid input:checked')].map(i => i.value);
  if (!resources.length) {
    bookMsg.textContent = 'Please select at least one room or space under Resources Requesting.';
    bookMsg.classList.add('show', 'err');
    return;
  }

  if (!supabase) {
    bookMsg.textContent = 'Booking storage is not connected yet. Add your Supabase URL and anon key in js/supabase-config.js.';
    bookMsg.classList.add('show', 'err');
    return;
  }

  const extraDate = document.getElementById('extraDate').value;
  const extraFrom = document.getElementById('extraFrom').value;
  const extraTo = document.getElementById('extraTo').value;

  const payload = {
    booking_date: document.getElementById('bookDate').value,
    organisation_name: document.getElementById('orgName').value.trim(),
    activity_name: document.getElementById('activityName').value.trim(),
    contact_person_name: document.getElementById('contactName').value.trim(),
    office_phone: document.getElementById('officePhone').value.trim() || null,
    mobile: document.getElementById('mobile').value.trim(),
    email: document.getElementById('email').value.trim(),
    activity_date: document.getElementById('activityDate').value,
    start_time: document.getElementById('fromTime').value,
    end_time: document.getElementById('toTime').value,
    extra_date: extraDate || null,
    extra_start_time: extraFrom || null,
    extra_end_time: extraTo || null,
    expected_attendance: Number(document.getElementById('attendance').value),
    resources_requested: resources,
    additional_information: document.getElementById('additionalInfo').value.trim() || null,
  };

  const submitBtn = bookForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const { error } = await supabase.from('bookings').insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Booking Request';

  if (error) {
    bookMsg.textContent = `Something went wrong: ${error.message}`;
    bookMsg.classList.add('show', 'err');
  } else {
    bookMsg.textContent = 'Request submitted! You will receive an email once it is reviewed.';
    bookMsg.classList.add('show', 'ok');
    bookForm.reset();
    extraSlot.hidden = true;
    slotToggle.classList.remove('open');
  }
});

/* ---------------- check availability: calendar ---------------- */
const filterRoomType = document.getElementById('filterRoomType');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const filterCapacity = document.getElementById('filterCapacity');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const calPrev = document.getElementById('calPrev');
const calNext = document.getElementById('calNext');
const calMonthLabel = document.getElementById('calMonthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const slotsSubtext = document.getElementById('slotsSubtext');
const slotsEmpty = document.getElementById('slotsEmpty');
const slotsList = document.getElementById('slotsList');

if (filterRoomType) {
  filterRoomType.innerHTML =
    '<option value="">All Room Types</option>' +
    RESOURCES.map(r => `<option value="${r}">${r}</option>`).join('');
}

// Pull the "N pers max" number out of a resource label, e.g. "Classroom: 20 pers max" -> 20.
function capacityOf(label) {
  const m = label.match(/(\d+)\s*pers/);
  return m ? Number(m[1]) : null;
}

function roomsMatchingFilters() {
  const type = filterRoomType.value;
  const minCap = filterCapacity.value ? Number(filterCapacity.value) : null;
  return RESOURCES.filter(r => {
    if (type && r !== type) return false;
    if (minCap) {
      const cap = capacityOf(r);
      if (cap !== null && cap < minCap) return false;
    }
    return true;
  });
}

const today = new Date();
today.setHours(0, 0, 0, 0);
let calYear = today.getFullYear();
let calMonth = today.getMonth(); // 0-11
let selectedDate = null;
let monthBookings = []; // bookings touching the visible month, refetched on nav/filter

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toISODate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function fetchMonthBookings() {
  if (!supabase) { monthBookings = []; return; }
  const rangeStart = toISODate(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const rangeEnd = toISODate(calYear, calMonth, daysInMonth);

  const { data, error } = await supabase
    .from('bookings')
    .select('activity_date, start_time, end_time, extra_date, extra_start_time, extra_end_time, status, resources_requested')
    .in('status', ['pending', 'approved'])
    .or(`and(activity_date.gte.${rangeStart},activity_date.lte.${rangeEnd}),and(extra_date.gte.${rangeStart},extra_date.lte.${rangeEnd})`);

  monthBookings = error ? [] : data;
}

function bookingsOnDate(dateStr) {
  const rooms = roomsMatchingFilters();
  const out = [];
  monthBookings.forEach(b => {
    const requested = b.resources_requested || [];
    const overlaps = requested.some(r => rooms.includes(r));
    if (!overlaps) return;
    if (b.activity_date === dateStr) out.push({ start: b.start_time, end: b.end_time, status: b.status });
    if (b.extra_date === dateStr) out.push({ start: b.extra_start_time, end: b.extra_end_time, status: b.status });
  });
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

async function renderCalendar() {
  calMonthLabel.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  await fetchMonthBookings();

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = '';
  for (let i = 0; i < firstDow; i++) html += '<div class="cal-cell"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toISODate(calYear, calMonth, d);
    const cellDate = new Date(calYear, calMonth, d);
    const isPast = cellDate < today;
    const hasBooking = bookingsOnDate(dateStr).length > 0;
    const isSelected = selectedDate === dateStr;

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    else cls += hasBooking ? ' booked' : ' avail';
    if (isSelected) cls += ' selected';

    html += `<div class="cal-cell"><button type="button" class="${cls}" data-date="${dateStr}" ${isPast ? 'disabled' : ''}>${d}</button></div>`;
  }

  calendarGrid.innerHTML = html;

  calendarGrid.querySelectorAll('.cal-day:not(.past)').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDate = btn.dataset.date;
      renderCalendar();
      renderSlots();
    });
  });
}

function renderSlots() {
  if (!selectedDate) {
    slotsSubtext.textContent = 'Select a date from the calendar to view available time slots.';
    slotsEmpty.hidden = false;
    slotsList.hidden = true;
    return;
  }

  const slots = bookingsOnDate(selectedDate);
  slotsSubtext.textContent = `Existing bookings on ${selectedDate}, filtered by the room type selected on the left.`;

  if (!supabase) {
    slotsEmpty.hidden = false;
    slotsList.hidden = true;
    slotsEmpty.querySelector('p').textContent = 'Connect Supabase to check live availability.';
    return;
  }

  if (!slots.length) {
    slotsEmpty.hidden = false;
    slotsList.hidden = true;
    slotsEmpty.querySelector('p').textContent = 'No bookings yet — this date looks open.';
    return;
  }

  slotsEmpty.hidden = true;
  slotsList.hidden = false;
  slotsList.innerHTML = slots.map(s => `
    <div class="booking-row">
      <div class="top">
        <span>${s.start.slice(0,5)} – ${s.end.slice(0,5)}</span>
        <span class="status-pill status-${s.status}">${s.status}</span>
      </div>
    </div>
  `).join('');
}

calPrev?.addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
calNext?.addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});
applyFiltersBtn?.addEventListener('click', () => {
  if (filterFrom.value) {
    const d = new Date(filterFrom.value);
    calYear = d.getFullYear();
    calMonth = d.getMonth();
  }
  renderCalendar();
  renderSlots();
});

if (calendarGrid) renderCalendar();

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
    .select('id, activity_name, activity_date, start_time, end_time, resources_requested, status')
    .eq('email', email)
    .order('activity_date', { ascending: false });

  if (error) {
    myBookingsResults.innerHTML = `<p style="font-size:13.5px;color:var(--bad);">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    myBookingsResults.innerHTML = '<p style="font-size:13.5px;color:var(--ink-soft);">No bookings found for that email.</p>';
    return;
  }
  myBookingsResults.innerHTML = data.map(b => `
    <div class="booking-row">
      <div class="top">
        <span>${b.activity_name}</span>
        <span class="status-pill status-${b.status}">${b.status}</span>
      </div>
      <div class="meta">${(b.resources_requested || []).join(', ')}</div>
      <div class="meta">${b.activity_date} · ${b.start_time.slice(0,5)}–${b.end_time.slice(0,5)}</div>
    </div>
  `).join('');
});
