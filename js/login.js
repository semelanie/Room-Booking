import { supabase, setRememberMode } from './auth-client.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');
const btn = document.getElementById('loginBtn');
const btnLabel = () => btn.lastChild; // trailing text node after the icon svg

// Already signed in? Skip straight to the dashboard.
if (supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = 'dashboard.html';
}

/* ---------------- show/hide password ---------------- */
const passwordInput = document.getElementById('loginPassword');
const toggleBtn = document.getElementById('togglePassword');
toggleBtn?.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
});

/* ---------------- forgot password ---------------- */
document.getElementById('forgotPassword')?.addEventListener('click', async (e) => {
  e.preventDefault();
  msg.className = 'form-msg';

  const email = document.getElementById('loginEmail').value.trim();
  if (!email) {
    msg.textContent = 'Enter your email above first, then click "Forgot password?" again.';
    msg.classList.add('show', 'err');
    return;
  }
  if (!supabase) {
    msg.textContent = 'Supabase is not configured yet.';
    msg.classList.add('show', 'err');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    msg.textContent = error.message;
    msg.classList.add('show', 'err');
  } else {
    msg.textContent = `If an account exists for ${email}, a password reset email has been sent.`;
    msg.classList.add('show', 'ok');
  }
});

/* ---------------- sign in ---------------- */
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btnLabel().textContent = ' Login';

  if (error) {
    await supabase.from('activity_log').insert({
      event_type: 'login_failed',
      description: `Failed management login attempt for ${email}`,
      actor_email: email,
    });
    msg.textContent = 'Incorrect email or password.';
    msg.classList.add('show', 'err');
    return;
  }

  await supabase.from('activity_log').insert({
    event_type: 'login_success',
    description: `${email} signed in to the management dashboard`,
    actor_email: email,
  });

  window.location.href = 'dashboard.html';
});
