// Shared Supabase client used by login.html, dashboard.html, and index.html.
//
// Centralizing this means "Remember me" on the login page can control
// whether the session is written to localStorage (persists after the
// browser closes) or sessionStorage (cleared when the tab/browser closes),
// and every page reads from the same place consistently.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const MODE_KEY = 'nihss-remember-mode'; // 'local' | 'session' — this tiny flag always lives in localStorage

function activeStorage() {
  const mode = window.localStorage.getItem(MODE_KEY) || 'local';
  return mode === 'session' ? window.sessionStorage : window.localStorage;
}

const rememberAwareStorage = {
  getItem: (key) => activeStorage().getItem(key),
  setItem: (key, value) => activeStorage().setItem(key, value),
  removeItem: (key) => activeStorage().removeItem(key),
};

export const supabase = SUPABASE_URL.startsWith('http')
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: rememberAwareStorage, persistSession: true },
    })
  : null;

// Call this right before signing in, based on the Remember Me checkbox.
export function setRememberMode(remember) {
  window.localStorage.setItem(MODE_KEY, remember ? 'local' : 'session');
}
