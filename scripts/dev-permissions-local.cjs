/* eslint-disable @typescript-eslint/no-require-imports */
// Starts a disposable local preview. Never reads live database credentials.
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
const db = spawn(process.execPath, [path.join(__dirname, 'permissions-local-db.cjs')], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
children.push(db);
db.on('error', err => { console.error(err.message); stop(1); });
db.on('exit', code => stop(code || 0));
db.stdout.once('data', chunk => {
  process.stdout.write(chunk);
  const app = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '3100'], {
    cwd: root, stdio: 'inherit', env: { ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'local-service-key', SESSION_SECRET: 'local-permissions-preview-key',
      PUBLIC_DOMAIN: 'http://localhost:3100', LINE_CHANNEL_ACCESS_TOKEN: '', LINE_CHANNEL_SECRET: '',
    },
  });
  children.push(app);
  app.on('error', err => { console.error(err.message); stop(1); });
  app.on('exit', code => stop(code || 0));
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
