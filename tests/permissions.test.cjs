/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated tests: no production credentials, database writes, LINE messages or emails.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8').replace(/from "@\//g, `from "${root}/`);
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};
process.env.SESSION_SECRET = 'isolated-test-signing-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://permissions-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
const { signSession, verifySession, SESSION_COOKIE } = require('../lib/session.ts');
const { defaultPermissions, hasAccess, pageRequirement, apiRequirement, storedPermissions, expandLegacyPermissions, PERMISSION_SECTIONS, PERMISSION_MODULES } = require('../lib/permissions.ts');
const { getAccessProfile } = require('../lib/access-server.ts');
const { NextRequest } = require('next/server');
const proxy = require('../proxy.ts').default;
const adminId = '10000000-0000-0000-0000-000000000001';
const userId = '20000000-0000-0000-0000-000000000002';
let cookie;
require.cache[require.resolve('next/headers')] = { id: require.resolve('next/headers'), filename: require.resolve('next/headers'), loaded: true, exports: { cookies: async () => ({ get: name => name === SESSION_COOKIE && cookie ? { value: cookie } : undefined }) } };
const permissionsApi = require('../app/api/admin/permissions/route.ts');
let grants = [];
let failGrants = false;
let writes = 0;
const profiles = [{ id: adminId, role: 'ADMIN', full_name: 'Admin Test', username: 'admin' }, { id: userId, role: 'USER', full_name: 'User Test', username: 'user' }];
global.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  assert.equal(url.origin, 'https://permissions-test.invalid', 'Tests must never access external systems');
  const table = url.pathname.split('/').pop();
  const method = options.method || 'GET';
  if (table === 'profiles') {
    const id = url.searchParams.get('id');
    const row = profiles.find(p => id === `eq.${p.id}`);
    return Response.json(id?.startsWith('eq.') ? row || null : profiles);
  }
  if (table === 'user_access_permissions') {
    if (failGrants) return Response.json({ message: 'Missing table', code: '42P01' }, { status: 404 });
    if (method === 'POST') { const body = JSON.parse(options.body); writes++; grants = [body]; return new Response(null, { status: 201 }); }
    const id = url.searchParams.get('user_id');
    return Response.json(id ? grants.find(g => id === `eq.${g.user_id}`) || null : grants);
  }
  throw new Error(`Unexpected test request ${url.pathname}`);
};

 test('session rejects tampering, expiry, malformed tokens and legacy cookies', () => {
  const token = signSession(userId, 1000000);
  assert.equal(verifySession(token, 1000001), userId);
  assert.equal(verifySession(token + 'x', 1000001), null);
  assert.equal(verifySession(token, 1000000 + 30 * 86400000), null);
  assert.equal(verifySession('user_id=' + userId), null);
  assert.equal(verifySession(undefined), null);
  const [payload, mac] = token.split('.');
  assert.equal(verifySession(Buffer.from(JSON.stringify({ sub: adminId, exp: 9999999999 })).toString('base64url') + '.' + mac), null);
  assert.equal(verifySession(payload + '.' + mac + '.extra'), null);
});
 test('role defaults, admin-only areas, nested paths and unknown admin endpoints', () => {
  const user = { id: userId, role: 'USER', permissions: ['reports'] };
  assert.deepEqual(defaultPermissions('USER'), ['booking', 'my_requests', 'my_requests.evaluate', 'profile', 'change_password']);
  assert.equal(hasAccess(user, pageRequirement('/admin/reports')), true);
  assert.equal(hasAccess(user, pageRequirement('/admin/users')), false);
  assert.equal(hasAccess(user, pageRequirement('/admin/permissions')), false);
  assert.equal(hasAccess(user, pageRequirement('/admin/requests')), false);
  assert.equal(pageRequirement('/admin/inspections/config'), 'inspections.config');
  assert.equal(apiRequirement('/api/admin/reports/annual'), 'reports.annual');
  assert.equal(apiRequirement('/api/admin/new-sensitive-api'), 'admin');
  assert.equal(apiRequirement('/api/admin/reports-secret'), 'admin');
  assert.equal(hasAccess({ ...user, role: 'ADMIN', permissions: [] }, 'admin'), true);
  assert.equal(hasAccess({ ...user, role: 'UNKNOWN' }, 'signed_in'), false);
  assert.equal(hasAccess({ ...user, permissions: ['requests'] }, apiRequirement('/api/user/create-booking', 'POST')), true);
});
 test('permission loading uses current database grants, empty means deny, missing table fails closed', async () => {
  grants = [];
  assert.deepEqual((await getAccessProfile(signSession(userId))).permissions, ['booking', 'my_requests', 'my_requests.evaluate', 'profile', 'change_password']);
  grants = [{ user_id: userId, permission_version: 2, permissions: [] }];
  assert.deepEqual((await getAccessProfile(signSession(userId))).permissions, []);
  grants = [{ user_id: userId, permission_version: 2, permissions: ['reports', 'admin', 'invalid'] }];
  assert.deepEqual((await getAccessProfile(signSession(userId))).permissions, ['reports']);
  failGrants = true;
  await assert.rejects(() => getAccessProfile(signSession(userId)));
  assert.equal((await getAccessProfile(signSession(adminId))).role, 'ADMIN');
  failGrants = false;
});
 test('proxy enforces API and direct page access, and replaces forged legacy identity', async () => {
  const forged = await proxy(new NextRequest('http://localhost/api/admin/delete-user', { method: 'POST', headers: { cookie: `user_id=${adminId}; role=ADMIN` } }));
  assert.equal(forged.status, 401);
  grants = [{ user_id: userId, permission_version: 2, permissions: ['reports'] }];
  const headers = { cookie: `${SESSION_COOKIE}=${signSession(userId)}; user_id=${adminId}; role=ADMIN` };
  const denied = await proxy(new NextRequest('http://localhost/admin/permissions', { headers }));
  assert.equal(new URL(denied.headers.get('location')).pathname, '/access-denied');
  assert.equal((await proxy(new NextRequest('http://localhost/api/admin/delete-user', { method: 'POST', headers }))).status, 403);
  const allowed = await proxy(new NextRequest('http://localhost/api/admin/reports', { headers }));
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get('x-middleware-request-cookie'), new RegExp(`user_id=${userId}`));
  assert.match(allowed.headers.get('x-middleware-request-cookie'), /role=USER/);
  grants = [{ user_id: userId, permission_version: 2, permissions: [] }];
  assert.equal((await proxy(new NextRequest('http://localhost/api/admin/reports', { headers }))).status, 403);
  failGrants = true;
  assert.equal((await proxy(new NextRequest('http://localhost/api/admin/reports', { headers }))).status, 503);
  failGrants = false;
});
 test('permissions API rejects unauthorized writes, invalid grants and admin lockout; persists empty grants', async () => {
  writes = 0; grants = [];
  const put = body => permissionsApi.PUT(new Request('http://localhost/api/admin/permissions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permission_version: 2, ...body }) }));
  cookie = undefined;
  assert.equal((await put({ user_id: userId, permission_version: 2, permissions: [] })).status, 401);
  cookie = signSession(userId);
  assert.equal((await put({ user_id: userId, permission_version: 2, permissions: ['reports'] })).status, 403);
  cookie = signSession(adminId);
  assert.equal((await put({ user_id: userId, permission_version: 2, permissions: ['admin'] })).status, 400);
  assert.equal((await put({ user_id: adminId, permissions: [] })).status, 400);
  assert.equal(writes, 0);
  assert.equal((await put({ user_id: userId, permission_version: 2, permissions: ['reports', 'reports'] })).status, 200);
  assert.deepEqual(grants[0].permissions, ['reports']);
  assert.equal(grants[0].updated_by, adminId);
  assert.equal((await put({ user_id: userId, permission_version: 2, permissions: [] })).status, 200);
  assert.deepEqual(grants[0].permissions, []);
  const listing = await (await permissionsApi.GET()).json();
  assert.equal(listing.users.find(u => u.id === userId).custom, true);
  assert.equal(listing.users.some(user => Object.hasOwn(user, 'password')), false);
});
 test('each page grant is independent and catalogue has no missing or duplicate leaves', () => {
  const leaves = PERMISSION_MODULES.flatMap(m => m.pages);
  assert.equal(new Set(leaves).size, leaves.length);
  assert.deepEqual([...leaves].sort(), PERMISSION_SECTIONS.map(p => p.key).sort());
  const profile = { id: userId, role: 'USER', permissions: ['reports.fuel', 'inspections'] };
  assert.equal(hasAccess(profile, pageRequirement('/admin/reports/fuel')), true);
  assert.equal(hasAccess(profile, pageRequirement('/admin/reports/monthly')), false);
  assert.equal(hasAccess(profile, pageRequirement('/admin/reports/annual')), false);
  assert.equal(hasAccess(profile, apiRequirement('/api/admin/reports/fuel', 'POST')), true);
  assert.equal(hasAccess(profile, apiRequirement('/api/admin/reports/annual', 'POST')), false);
  assert.equal(hasAccess(profile, pageRequirement('/admin/inspections/config')), false);
  assert.equal(hasAccess(profile, apiRequirement('/api/vehicle-inspections/config', 'PUT')), false);
  assert.equal(hasAccess({ ...profile, permissions: ['dashboard'] }, pageRequirement('/admin/dashboard')), false);
  assert.equal(hasAccess({ ...profile, permissions: ['requests'] }, pageRequirement('/admin/print-request/123')), false);
  assert.equal(hasAccess({ ...profile, permissions: ['my_requests'] }, pageRequirement('/user/evaluate/123')), false);
  assert.equal(hasAccess({ ...profile, permissions: ['my_requests.evaluate'] }, pageRequirement('/user/evaluations')), true);
 });
 test('legacy grants expand once; version-2 empty and parent-only grants stay restricted', () => {
   assert.deepEqual(storedPermissions(['reports'], 2), ['reports']);
   assert.deepEqual(storedPermissions([], 2), []);
   const migrated = expandLegacyPermissions(['reports', 'inspections', 'my_requests']);
   for (const key of ['reports', 'reports.fuel', 'reports.annual', 'inspections', 'inspections.config', 'my_requests', 'my_requests.evaluate', 'profile', 'change_password']) assert.ok(migrated.includes(key));
   assert.deepEqual(storedPermissions(migrated, 2), migrated);
   assert.deepEqual(storedPermissions([], 1).sort(), ['change_password', 'profile']);
 });
 test('proxy rejects the wrong report tab API and accepts only the assigned subpage', async () => {
   grants = [{ user_id: userId, permission_version: 2, permissions: ['reports.fuel'] }];
   const headers = { cookie: `${SESSION_COOKIE}=${signSession(userId)}` };
   assert.equal((await proxy(new NextRequest('http://localhost/api/admin/reports/fuel', { method: 'POST', headers }))).status, 200);
   assert.equal((await proxy(new NextRequest('http://localhost/api/admin/reports/annual', { method: 'POST', headers }))).status, 403);
   assert.equal((await proxy(new NextRequest('http://localhost/admin/reports/fuel', { headers }))).status, 200);
   assert.equal((await proxy(new NextRequest('http://localhost/admin/reports/monthly', { headers }))).status, 307);
   assert.equal((await proxy(new NextRequest('http://localhost/admin/reports?tab=ANNUAL', { headers }))).status, 307);
 });
 test('all current internal pages have explicit matching requirements or documented aliases', () => {
   function pages(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? pages(path.join(directory, entry.name)) : entry.name === 'page.tsx' ? [path.join(directory, entry.name)] : []); }
   for (const file of [...pages(path.join(root, 'app/admin')), ...pages(path.join(root, 'app/user'))]) {
     const route = '/' + path.relative(path.join(root, 'app'), path.dirname(file)).split(path.sep).join('/');
     assert.notEqual(pageRequirement(route), null, route);
     if (pageRequirement(route) === 'signed_in') assert.ok(['/user', '/user/calendar'].includes(route), `Unmapped private page ${route}`);
     if (pageRequirement(route) === 'admin') assert.ok(['/admin/users', '/admin/user', '/admin/permissions'].includes(route), `Unmapped admin page ${route}`);
   }
 });
test('driver data and driver leave pages have independent grants', () => {
  const profile = { id: userId, role: 'USER', permissions: ['drivers.leave'] };
  assert.equal(hasAccess(profile, pageRequirement('/admin/drivers/leaves')), true);
  assert.equal(hasAccess(profile, pageRequirement('/admin/drivers')), false);
  assert.equal(hasAccess(profile, apiRequirement('/api/admin/driver-leaves', 'POST')), true);
  assert.equal(hasAccess({ ...profile, permissions: ['drivers'] }, apiRequirement('/api/admin/driver-leaves', 'POST')), false);
  assert.ok(PERMISSION_MODULES.find(m => m.key === 'drivers').pages.includes('drivers.leave'));
});
