// Runs as the Vercel "build" step for this static site.
// Writes js/env.js so the browser can read your Supabase credentials
// without them being hardcoded into source control.
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const out = `// Auto-generated at build time — do not edit directly.
window.__NIHSS_ENV__ = {
  SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)},
  SUPABASE_ANON_KEY: ${JSON.stringify(SUPABASE_ANON_KEY)}
};
`;

fs.writeFileSync(path.join(__dirname, '..', 'js', 'env.js'), out);
console.log('[build] wrote js/env.js', SUPABASE_URL ? '(Supabase URL set)' : '(no SUPABASE_URL found — check Vercel env vars)');
