import { supabase } from './auth-client.js';

/* ---------------- auth + role gate ---------------- */
if (!supabase) {
  document.querySelector('.dash-section .container').innerHTML =
    '<p style="text-align:center;color:var(--ink-soft);">Supabase is not configured yet — add your project URL and anon key in js/supabase-config.js.</p>';
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'admin-login.html';
  } else {
    const { data: role } = await supabase.from('staff_roles').select('role').eq('user_id', session.user.id).single();
    if (role?.role !== 'administrator') {
      window.location.href = 'admin-login.html';
    }
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase?.auth.signOut();
  window.location.href = 'admin-login.html';
});

/* ---------------- tabs ---------------- */
document.querySelectorAll('#tabPills .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#tabPills .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const tab = pill.dataset.tab;
    document.getElementById('tabActivity').hidden = tab !== 'activity';
    document.getElementById('tabStaff').hidden = tab !== 'staff';
    document.getElementById('tabRecipients').hidden = tab !== 'recipients';
    if (tab === 'staff') loadStaff();
    if (tab === 'recipients') loadRecipients();
  });
});

/* ---------------- activity log ---------------- */
let activityRows = [];
let activityFilter = 'all';
let activityPage = 1;
const ACTIVITY_PAGE_SIZE = 8;

async function loadActivity() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const tbody = document.getElementById('activityTableBody');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="dash-loading">${error.message}</td></tr>`;
    return;
  }
  activityRows = data;
  renderActivity();
}

function matchesFilter(eventType) {
  if (activityFilter === 'all') return true;
  if (activityFilter === 'login') return eventType.startsWith('login');
  if (activityFilter === 'booking') return eventType.startsWith('booking');
  if (activityFilter === 'staff') return eventType.startsWith('staff');
  return true;
}

function eventBadgeClass(eventType) {
  if (eventType === 'login_failed') return 'status-rejected';
  if (eventType.startsWith('login')) return 'status-approved';
  if (eventType === 'booking_created') return 'status-pending';
  if (eventType === 'booking_approved') return 'status-approved';
  if (eventType === 'booking_rejected' || eventType === 'booking_cancelled') return 'status-rejected';
  return 'status-pending';
}

function renderActivity() {
  const rows = activityRows.filter(r => matchesFilter(r.event_type));
  const totalPages = Math.max(1, Math.ceil(rows.length / ACTIVITY_PAGE_SIZE));
  activityPage = Math.min(activityPage, totalPages);
  const start = (activityPage - 1) * ACTIVITY_PAGE_SIZE;
  const pageRows = rows.slice(start, start + ACTIVITY_PAGE_SIZE);

  const tbody = document.getElementById('activityTableBody');
  tbody.innerHTML = pageRows.length
    ? pageRows.map(r => `
      <tr>
        <td><span class="status-pill ${eventBadgeClass(r.event_type)}">${r.event_type.replace(/_/g, ' ')}</span></td>
        <td>${r.description}</td>
        <td>${r.actor_email || '—'}</td>
        <td class="dash-sub">${new Date(r.created_at).toLocaleString()}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="dash-loading">No activity in this category yet.</td></tr>';

  document.getElementById('activityPageSummary').textContent = rows.length
    ? `Showing ${start + 1}-${Math.min(start + ACTIVITY_PAGE_SIZE, rows.length)} of ${rows.length} events`
    : 'Showing 0 of 0 events';

  const pageButtons = document.getElementById('activityPageButtons');
  let html = `<button type="button" class="page-btn" data-page="prev" ${activityPage === 1 ? 'disabled' : ''}>&lsaquo;</button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button type="button" class="page-btn ${p === activityPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }
  html += `<button type="button" class="page-btn" data-page="next" ${activityPage === totalPages ? 'disabled' : ''}>&rsaquo;</button>`;
  pageButtons.innerHTML = html;
  pageButtons.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.page;
      if (p === 'prev') activityPage--;
      else if (p === 'next') activityPage++;
      else activityPage = Number(p);
      renderActivity();
    });
  });
}

document.querySelectorAll('#eventPills .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#eventPills .pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activityFilter = pill.dataset.event;
    activityPage = 1;
    renderActivity();
  });
});

/* ---------------- manage staff ---------------- */
let staffLoaded = false;

async function loadStaff() {
  if (!supabase || staffLoaded) return;
  staffLoaded = true;

  const { data, error } = await supabase.rpc('get_staff_directory');
  const tbody = document.getElementById('staffTableBody');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="dash-loading">${error.message}</td></tr>`;
    return;
  }
  renderStaff(data);
}

function renderStaff(rows) {
  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = rows.length
    ? rows.map(r => `
      <tr>
        <td>${r.email}</td>
        <td><span class="status-pill ${r.role === 'administrator' ? 'status-approved' : 'status-pending'}">${r.role}</span></td>
        <td class="dash-sub">${new Date(r.created_at).toLocaleDateString()}</td>
        <td class="dash-actions">
          <button type="button" class="row-action" data-action="reset" data-email="${r.email}" title="Reset password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 16v-4h4"/></svg>
          </button>
          <button type="button" class="row-action bad" data-action="remove" data-id="${r.user_id}" title="Remove account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="dash-loading">No staff accounts yet.</td></tr>';

  tbody.querySelectorAll('[data-action="reset"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(btn.dataset.email);
      alert(error ? error.message : `Password reset email sent to ${btn.dataset.email}.`);
    });
  });
  tbody.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this staff account? This cannot be undone.')) return;
      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'delete_user', user_id: btn.dataset.id },
      });
      if (error) { alert(error.message); return; }
      staffLoaded = false;
      loadStaff();
    });
  });
}

document.getElementById('createStaffForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('staffFormMsg');
  msg.className = 'form-msg';

  const email = document.getElementById('newStaffEmail').value.trim();
  const password = document.getElementById('newStaffPassword').value;
  const role = document.getElementById('newStaffRole').value;

  const btn = document.getElementById('createStaffBtn');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  const { data, error } = await supabase.functions.invoke('admin-manage-users', {
    body: { action: 'create_user', email, password, role },
  });

  btn.disabled = false;
  btn.textContent = 'Create Account';

  if (error || data?.error) {
    msg.textContent = data?.error || error.message;
    msg.classList.add('show', 'err');
    return;
  }

  msg.textContent = `${role === 'administrator' ? 'Administrator' : 'Management'} account created for ${email}.`;
  msg.classList.add('show', 'ok');
  e.target.reset();
  staffLoaded = false;
  loadStaff();
});

if (supabase) loadActivity();

/* ---------------- report recipients ---------------- */
let recipientsLoaded = false;

async function loadRecipients() {
  if (!supabase || recipientsLoaded) return;
  recipientsLoaded = true;

  const { data, error } = await supabase.from('report_recipients').select('*').order('created_at');
  const tbody = document.getElementById('recipientsTableBody');
  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" class="dash-loading">${error.message}</td></tr>`;
    return;
  }
  renderRecipients(data);
}

function renderRecipients(rows) {
  const tbody = document.getElementById('recipientsTableBody');
  tbody.innerHTML = rows.length
    ? rows.map(r => `
      <tr>
        <td>${r.email}</td>
        <td class="dash-sub">${new Date(r.created_at).toLocaleDateString()}</td>
        <td class="dash-actions">
          <button type="button" class="row-action bad" data-id="${r.id}" title="Remove">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="3" class="dash-loading">No report recipients yet.</td></tr>';

  tbody.querySelectorAll('.row-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await supabase.from('report_recipients').delete().eq('id', btn.dataset.id);
      if (error) { alert(error.message); return; }
      recipientsLoaded = false;
      loadRecipients();
    });
  });
}

document.getElementById('addRecipientForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('recipientFormMsg');
  msg.className = 'form-msg';

  const email = document.getElementById('newRecipientEmail').value.trim();
  const btn = document.getElementById('addRecipientBtn');
  btn.disabled = true;
  btn.textContent = 'Adding…';

  const { error } = await supabase.from('report_recipients').insert({ email });

  btn.disabled = false;
  btn.textContent = 'Add Recipient';

  if (error) {
    msg.textContent = error.message.includes('duplicate') ? 'That email is already on the list.' : error.message;
    msg.classList.add('show', 'err');
    return;
  }

  msg.textContent = `${email} will now receive the monthly report.`;
  msg.classList.add('show', 'ok');
  e.target.reset();
  recipientsLoaded = false;
  loadRecipients();
});
