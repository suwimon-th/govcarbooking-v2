/* eslint-disable @typescript-eslint/no-require-imports */
// Local-only, in-memory fixtures for reviewing the permissions screen.
// No credentials or data from the live database are loaded.
const http = require('node:http');
const profiles = [
  { id: '10000000-0000-0000-0000-000000000001', role: 'ADMIN', full_name: 'ผู้ดูแลระบบ (ข้อมูลจำลอง)', username: 'admin-local', password: 'local-demo-123', department_id: 1 },
  { id: '20000000-0000-0000-0000-000000000002', role: 'USER', full_name: 'ผู้ขอใช้รถ (ข้อมูลจำลอง)', username: 'user-local', password: 'local-demo-123', department_id: 1 },
  { id: '30000000-0000-0000-0000-000000000003', role: 'USER', full_name: 'เจ้าหน้าที่รายงาน (ข้อมูลจำลอง)', username: 'reports-local', password: 'local-demo-123', department_id: 1 },
];
let grants = [{ permission_version: 2, user_id: profiles[2].id, permissions: ['reports', 'my_requests'], updated_at: new Date().toISOString() }];
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3100');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, prefer, x-client-info, accept, range');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:54329');
  const table = url.pathname.split('/').pop();
  let rows = [];
  if (req.method === 'POST' && table === 'user_access_permissions') {
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 10000) { res.writeHead(413); res.end(); return; } }
    try {
      const grant = JSON.parse(raw);
      grants = [...grants.filter(g => g.user_id !== grant.user_id), grant];
      res.writeHead(201); res.end(); return;
    } catch { res.writeHead(400); res.end(); return; }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  if (table === 'profiles') rows = profiles;
  if (table === 'user_access_permissions') rows = grants;
  for (const [key, value] of url.searchParams) {
    if (value.startsWith('eq.')) rows = rows.filter(r => String(r[key]) === value.slice(3));
    else if (value.startsWith('neq.')) rows = rows.filter(r => String(r[key]) !== value.slice(4));
    else if (value.startsWith('ilike.')) rows = rows.filter(r => String(r[key]).toLowerCase() === value.slice(6).toLowerCase());
    else if (value.startsWith('in.(')) { const allowed = value.slice(4, -1).split(','); rows = rows.filter(r => allowed.includes(String(r[key]))); }
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Range', rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0');
  if (req.method === 'HEAD') { res.writeHead(200); res.end(); return; }
  const select = url.searchParams.get('select');
  if (select && select !== '*' && !select.includes('(')) rows = rows.map(row => Object.fromEntries(select.split(',').map(key => [key, row[key] ?? null])));
  const single = req.headers.accept?.includes('application/vnd.pgrst.object+json');
  res.end(JSON.stringify(single ? rows[0] || null : rows));
});
server.listen(54329, '127.0.0.1', () => console.log('Local permissions fixtures: http://127.0.0.1:54329 (memory only)'));
