/* eslint-disable @typescript-eslint/no-require-imports */
// Requires npm run dev:permissions. Refuses to modify anything except the fixture account.
const assert = require('node:assert/strict');
const origin = 'http://127.0.0.1:3100';
async function login(username) {
  const res = await fetch(`${origin}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'local-demo-123' }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.full_name, /ข้อมูลจำลอง/);
  return res.headers.getSetCookie().map(s => s.split(';')[0]).join('; ');
}
(async () => {
  const admin = await login('admin-local');
  const user = await login('user-local');
  const list = await (await fetch(`${origin}/api/admin/permissions`, { headers: { cookie: admin } })).json();
  const fixture = list.users.find(u => u.username === 'user-local');
  assert.equal(fixture.id, '20000000-0000-0000-0000-000000000002');
  assert.match(fixture.full_name, /ข้อมูลจำลอง/);
  const save = (cookie, permissions) => fetch(`${origin}/api/admin/permissions`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: fixture.id, permissions, permission_version: 2 }) });
  assert.equal((await save(user, ['reports'])).status, 403);
  try {
    assert.equal((await save(admin, ['reports'])).status, 200);
    const access = await (await fetch(`${origin}/api/permissions/me`, { headers: { cookie: user } })).json();
    assert.deepEqual(access.permissions, ['reports']);
    const allowed = await fetch(`${origin}/admin/reports/monthly`, { headers: { cookie: user }, redirect: 'manual' });
    assert.equal(allowed.status, 200);
    const denied = await fetch(`${origin}/admin/vehicles`, { headers: { cookie: user }, redirect: 'manual' });
    assert.equal(denied.status, 307);
    assert.equal(new URL(denied.headers.get('location')).pathname, '/access-denied');
    assert.equal((await save(admin, [])).status, 200);
    assert.equal((await fetch(`${origin}/api/user/create-booking`, { method: 'POST', headers: { cookie: user, 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    assert.equal((await fetch(`${origin}/api/admin/permissions`, { headers: { cookie: 'user_id=10000000-0000-0000-0000-000000000001; role=ADMIN' } })).status, 401);
    const screen = await fetch(`${origin}/admin/permissions`, { headers: { cookie: admin } });
    assert.equal(screen.status, 200);
    assert.match(await screen.text(), /จัดการสิทธิ์การเข้าถึง/);
    console.log('PASS: local login, permission save/reload, direct URL allow/deny, empty grants, admin-only writes, forged cookies, page render');
  } finally { assert.equal((await save(admin, fixture.permissions)).status, 200); }
})().catch(err => { console.error(err.message); process.exitCode = 1; });
