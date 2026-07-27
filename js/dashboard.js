import { supabase } from './auth-client.js';

if (!supabase) {
  document.getElementById('dashTableBody').innerHTML =
    '<tr><td colspan="6" class="dash-loading">Supabase is not configured yet — add your project URL and anon key in js/supabase-config.js.</td></tr>';
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) window.location.href = 'login.html';
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase?.auth.signOut();
  window.location.href = 'login.html';
});

/* ---------------- data + state ---------------- */
let allBookings = [];
let activeFilter = 'all';
let activeScope = 'all';
let currentPage = 1;
const PAGE_SIZE = 5;

async function loadBookings() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('dashTableBody').innerHTML =
      `<tr><td colspan="6" class="dash-loading">${error.message}</td></tr>`;
    return;
  }
  allBookings = data;
  renderStats();
  renderTable();
}

function renderStats() {
  document.getElementById('statTotal').textContent = allBookings.length;
  document.getElementById('statApproved').textContent = allBookings.filter(b => b.status === 'approved').length;
  document.getElementById('statPending').textContent = allBookings.filter(b => b.status === 'pending').length;
  document.getElementById('statRejected').textContent = allBookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length;
}

function bookingCode(b) {
  const year = new Date(b.created_at).getFullYear();
  return `#BK-${year}-${String(b.booking_no).padStart(3, '0')}`;
}

function actionsFor(b) {
  const eye = `<button type="button" class="row-action" data-action="view" data-id="${b.id}" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>`;

  if (b.status === 'pending') {
    return eye +
      `<button type="button" class="row-action ok" data-action="approve" data-id="${b.id}" title="Approve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></button>` +
      `<button type="button" class="row-action bad" data-action="reject" data-id="${b.id}" title="Reject"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  }
  if (b.status === 'approved') {
    return eye +
      `<button type="button" class="row-action bad" data-action="cancel" data-id="${b.id}" title="Cancel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  }
  return eye;
}

function filteredBookings() {
  let rows = allBookings;
  if (activeFilter === 'rejected') rows = rows.filter(b => b.status === 'rejected' || b.status === 'cancelled');
  else if (activeFilter !== 'all') rows = rows.filter(b => b.status === activeFilter);

  const todayStr = new Date().toISOString().slice(0, 10);
  if (activeScope === 'current') rows = rows.filter(b => b.activity_date >= todayStr);
  else if (activeScope === 'history') rows = rows.filter(b => b.activity_date < todayStr);

  return rows;
}

function renderTable() {
  const rows = filteredBookings();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById('dashTableBody');
  if (!pageRows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="dash-loading">No bookings in this category.</td></tr>';
  } else {
    tbody.innerHTML = pageRows.map(b => `
      <tr>
        <td>${bookingCode(b)}</td>
        <td><strong>${b.activity_name}</strong><br><span class="dash-sub">${(b.resources_requested || [])[0] || ''}</span></td>
        <td>${b.activity_date}<br><span class="dash-sub">${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}</span></td>
        <td>${(b.resources_requested || []).join(', ')}</td>
        <td><span class="status-pill status-${b.status}">${b.status}</span></td>
        <td class="dash-actions">${actionsFor(b)}</td>
      </tr>
    `).join('');
  }

  const summary = document.getElementById('pageSummary');
  summary.textContent = rows.length
    ? `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, rows.length)} of ${rows.length} bookings`
    : 'Showing 0 of 0 bookings';

  const pageButtons = document.getElementById('pageButtons');
  let html = `<button type="button" class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button type="button" class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }
  html += `<button type="button" class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>`;
  pageButtons.innerHTML = html;

  pageButtons.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.page;
      if (p === 'prev') currentPage--;
      else if (p === 'next') currentPage++;
      else currentPage = Number(p);
      renderTable();
    });
  });

  tbody.querySelectorAll('.row-action').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

/* ---------------- filters ---------------- */
document.querySelectorAll('#filterPills .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#filterPills .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.dataset.filter;
    currentPage = 1;
    renderTable();
  });
});

document.querySelectorAll('#scopePills .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#scopePills .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeScope = pill.dataset.scope;
    currentPage = 1;
    renderTable();
  });
});

/* ---------------- CSV export ---------------- */
function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

document.getElementById('downloadCsvBtn')?.addEventListener('click', () => {
  const rows = filteredBookings();
  const headers = [
    'Booking ID', 'Activity', 'Organisation', 'Contact Person', 'Email', 'Mobile',
    'Date', 'Start Time', 'End Time', 'Expected Attendance', 'Resources', 'Status', 'Submitted',
  ];
  const lines = [headers.join(',')];

  rows.forEach(b => {
    lines.push([
      bookingCode(b), b.activity_name, b.organisation_name, b.contact_person_name, b.email, b.mobile,
      b.activity_date, b.start_time, b.end_time, b.expected_attendance,
      (b.resources_requested || []).join('; '), b.status, b.created_at,
    ].map(csvEscape).join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nihss-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------------- row actions ---------------- */
async function handleAction(action, id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;

  if (action === 'view') {
    showDetail(booking);
    return;
  }

  const nextStatus = { approve: 'approved', reject: 'rejected', cancel: 'cancelled' }[action];
  if (!nextStatus) return;

  const { error } = await supabase.from('bookings').update({ status: nextStatus }).eq('id', id);
  if (error) {
    alert(`Could not update this booking: ${error.message}`);
    return;
  }
  booking.status = nextStatus;
  renderStats();
  renderTable();
}

function showDetail(b) {
  const body = document.getElementById('detailBody');
  body.innerHTML = `
    <div class="detail-grid">
      <div><span class="dash-sub">Organisation</span><p>${b.organisation_name}</p></div>
      <div><span class="dash-sub">Contact Person</span><p>${b.contact_person_name}</p></div>
      <div><span class="dash-sub">Email</span><p>${b.email}</p></div>
      <div><span class="dash-sub">Mobile</span><p>${b.mobile}${b.office_phone ? ' · ' + b.office_phone : ''}</p></div>
      <div><span class="dash-sub">Activity</span><p>${b.activity_name}</p></div>
      <div><span class="dash-sub">Expected Attendance</span><p>${b.expected_attendance}</p></div>
      <div><span class="dash-sub">Date &amp; Time</span><p>${b.activity_date}, ${b.start_time.slice(0,5)}–${b.end_time.slice(0,5)}</p></div>
      ${b.extra_date ? `<div><span class="dash-sub">Additional Slot</span><p>${b.extra_date}, ${b.extra_start_time?.slice(0,5)}–${b.extra_end_time?.slice(0,5)}</p></div>` : ''}
      <div><span class="dash-sub">Resources Requested</span><p>${(b.resources_requested || []).join(', ')}</p></div>
      <div><span class="dash-sub">Status</span><p><span class="status-pill status-${b.status}">${b.status}</span></p></div>
    </div>
    ${b.additional_information ? `<div class="detail-notes"><span class="dash-sub">Additional Information</span><p>${b.additional_information}</p></div>` : ''}
  `;
  document.getElementById('detailModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.getElementById('detailClose')?.addEventListener('click', closeDetail);
document.getElementById('detailModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'detailModal') closeDetail();
});
function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
  document.body.style.overflow = '';
}

if (supabase) loadBookings();
