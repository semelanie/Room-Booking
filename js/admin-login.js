import { supabase, setRememberMode } from './auth-client.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');
const btn = document.getElementById('loginBtn');
const btnLabel = () => btn.lastChild;

async function isAdministrator(userId) {
  const { data } = await supabase.from('staff_roles').select('role').eq('user_id', userId).single();
  return data?.role === 'administrator';
}

// Already signed in as an administrator? Skip straight to the dashboard.
if (supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && await isAdministrator(session.user.id)) {
    window.location.href = 'administrator-dashboard.html';
  }
}

const passwordInput = document.getElementById('loginPassword');
document.getElementById('togglePassword')?.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
});

document.getElementById('forgotPassword')?.addEventListener('click', async (e) => {
  e.preventDefault();
  msg.className = 'form-msg';
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) {
    msg.textContent = 'Enter your email above first, then click "Forgot password?" again.';
    msg.classList.add('show', 'err');
    return;
  }
  if (!supabase) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  msg.textContent = error ? error.message : `If an account exists for ${email}, a password reset email has been sent.`;
  msg.classList.add('show', error ? 'err' : 'ok');
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'form-msg';

  if (!supabase) {
    msg.textContent = 'Supabase is not configured yet — add your project URL and anon key in js/supabase-config.js.';
    msg.classList.add('show', 'err');
    return;
  }

  const email = document.getElementById('loginEmail').value.trim();
  const password = passwordInput.value;
  const remember = document.getElementById('rememberMe').checked;
  setRememberMode(remember);

  btn.disabled = true;
  btnLabel().textContent = ' Signing in…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await supabase.from('activity_log').insert({
      event_type: 'login_failed',
      description: `Failed administrator login attempt for ${email}`,
      actor_email: email,
    });
    btn.disabled = false;
    btnLabel().textContent = ' Login';
    msg.textContent = 'Incorrect email or password.';
    msg.classList.add('show', 'err');
    return;
  }

  const admin = await isAdministrator(data.user.id);
  if (!admin) {
    await supabase.from('activity_log').insert({
      event_type: 'login_failed',
      description: `${email} signed in but does not have administrator access`,
      actor_email: email,
    });
    await supabase.auth.signOut();
    btn.disabled = false;
    btnLabel().textContent = ' Login';
    msg.textContent = 'This account does not have administrator access.';
    msg.classList.add('show', 'err');
    return;
  }

  await supabase.from('activity_log').insert({
    event_type: 'login_success',
    description: `${email} signed in as administrator`,
    actor_email: email,
  });

  window.location.href = 'administrator-dashboard.html';
});
