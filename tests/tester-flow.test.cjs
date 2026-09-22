/* eslint-disable @typescript-eslint/no-require-imports */
// Actual route handlers + proxy + Supabase SDK; only database transport and notifications are mocked.
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8').replace(/from "@\//g, `from "${root}/`);
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: 'https://tester-flow.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service', SESSION_SECRET: 'isolated-tester-flow-secret',
  PUBLIC_DOMAIN: 'https://tester-flow.invalid', ADMIN_EMAIL: 'admin@example.invalid',
});
const tester = { id: '20000000-0000-0000-0000-000000000002', username: 'tester', password: 'fixture-only', role: 'TESTER', full_name: 'ผู้ทดสอบจำลอง', department_id: 1 };
const vehicle = { id: '30000000-0000-0000-0000-000000000003', type: 'รถเก๋ง', plate_number: 'ทดสอบ-001', brand: 'Test', model: 'Car' };
let db, notifications, cookie, failTable;
function mock(modulePath, exports) {
  const filename = require.resolve(modulePath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
mock('../lib/email.ts', {
  sendAdminEmail: async (...args) => notifications.push(args),
  generateBookingEmailHtml: () => 'booking fixture', generateFuelEmailHtml: () => 'fuel fixture',
  generateDriverAssignmentEmailHtml: () => 'assignment fixture',
});
mock('../lib/line.ts', { sendLinePush: async () => { throw new Error('Unexpected LINE notification'); }, flexAssignDriver: () => ({}) });
mock('../lib/settings.ts', { getAutoAssignEnabled: async () => false });
mock('next/headers', { cookies: async () => ({ get: name => {
  const value = new Map(cookie.split(';').map(v => v.trim().split('='))).get(name);
  return value ? { value } : undefined;
} }) });
// Fail closed: no real network is ever called, even with local production credentials present.
global.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assert.equal(url.origin, 'https://tester-flow.invalid', 'External network forbidden in tests');
  const table = url.pathname.split('/').pop();
  assert.ok(Object.hasOwn(db, table), `Unexpected table: ${table}`);
  const method = options.method || 'GET';
  if (table === failTable && method === 'POST') return Response.json({ code: '23514', message: 'Simulated database failure' }, { status: 400 });
  let rows = db[table];
  for (const [key, filter] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const dot = filter.indexOf('.'), op = filter.slice(0, dot), value = filter.slice(dot + 1);
    assert.ok(['eq', 'neq', 'ilike', 'gte', 'lte'].includes(op), `Unsupported filter ${filter}`);
    rows = rows.filter(row => {
      const actual = String(row[key]);
      if (op === 'eq') return actual === value;
      if (op === 'neq') return actual !== value;
      if (op === 'ilike') return actual.toLowerCase() === value.replace(/\\/g, '').toLowerCase();
      return op === 'gte' ? actual >= value : actual <= value;
    });
  }
  if (method === 'POST') {
    const body = JSON.parse(options.body);
    rows = (Array.isArray(body) ? body : [body]).map((row, i) => ({ id: `${table}-${db[table].length + i + 1}`, ...row }));
    db[table].push(...rows);
  } else assert.equal(method, 'GET');
  const headers = new Headers(options.headers);
  const single = headers.get('accept')?.includes('vnd.pgrst.object');
  const count = rows.length;
  const offset = Number(url.searchParams.get('offset') || 0);
  rows = rows.slice(offset, offset + Number(url.searchParams.get('limit') || count));
  return Response.json(single ? rows[0] || null : rows, { headers: { 'content-range': `0-${Math.max(0, count - 1)}/${count}` } });
};
const { NextRequest } = require('next/server');
const { SESSION_COOKIE } = require('../lib/session.ts');
const proxy = require('../proxy.ts').default;
const login = require('../app/api/login/route.ts');
const booking = require('../app/api/user/create-booking/route.ts');
const fuel = require('../app/api/public/request-fuel/route.ts');
const myRequests = require('../app/api/user/my-requests/route.ts');
const bookingBody = { requester_id: tester.id, requester_name: tester.full_name, department_id: 1, vehicle_id: vehicle.id, date: '2099-01-06', start_time: '09:00', end_time: '10:00', purpose: 'ทดสอบขอใช้รถ', destination: 'สถานที่จำลอง', passenger_count: 2 };
const fuelBody = { driver_name: tester.full_name, plate_number: vehicle.plate_number, request_date: '2099-01-06', system_quota: 'ดีเซล 50 ลิตร', period: 'มกราคม', remark: 'ข้อมูลทดสอบ' };
async function call(route, handler, body, method = 'POST') {
  const request = new NextRequest(`http://localhost${route}`, { method, headers: { cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const gate = await proxy(request);
  if (!gate.headers.has('x-middleware-next')) return gate;
  cookie = gate.headers.get('x-middleware-request-cookie') || cookie;
  return handler(request);
}
async function signIn(password = tester.password) {
  const response = await call('/api/login', login.POST, { username: tester.username, password });
  if (response.ok) cookie = response.cookies.getAll().map(c => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
  return response;
}
beforeEach(() => {
  db = { profiles: [{ ...tester }], vehicles: [{ ...vehicle }], bookings: [], fuel_requests: [], user_access_permissions: [] };
  notifications = []; cookie = ''; failTable = undefined;
});
test('TESTER login → request vehicle → see own request → request fuel', async () => {
  const auth = await signIn();
  assert.equal(auth.status, 200);
  assert.equal((await auth.json()).role, 'TESTER');
  assert.ok(cookie.includes(`${SESSION_COOKIE}=`));
  for (const route of ['/user/request', '/user/my-requests', '/fuel']) {
    assert.equal((await proxy(new NextRequest(`http://localhost${route}`, { headers: { cookie } }))).headers.get('x-middleware-next'), '1');
  }
  const response = await call('/api/user/create-booking', booking.POST, bookingBody);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.success, true);
  assert.match(result.booking.request_code, /^TEST-\d{6}$/);
  assert.equal(db.bookings.length, 1);
  assert.equal(db.bookings[0].requester_id, tester.id);
  assert.equal(db.bookings[0].status, 'REQUESTED');
  assert.equal(db.bookings[0].start_at, '2099-01-06T09:00:00+07:00');
  assert.equal(db.bookings[0].destination, bookingBody.destination);
  assert.equal(db.bookings[0].passenger_count, 2);
  db.bookings.push({ id: 'someone-else', requester_id: 'another-user', status: 'REQUESTED' });
  const list = await (await call('/api/user/my-requests', myRequests.GET, undefined, 'GET')).json();
  assert.equal(list.total, 1);
  assert.deepEqual(list.items.map(row => row.id), [result.booking.id]);
  const fuelResponse = await call('/api/public/request-fuel', fuel.POST, fuelBody);
  assert.equal(fuelResponse.status, 200);
  assert.equal((await fuelResponse.json()).success, true);
  assert.deepEqual(db.fuel_requests, [{ id: 'fuel_requests-1', ...fuelBody, status: 'PENDING' }]);
  assert.equal(notifications.length, 2, 'Email requests are captured locally');
});
test('wrong password and unsigned booking request are rejected without writes', async () => {
  assert.equal((await signIn('wrong')).status, 401);
  assert.equal((await call('/api/user/create-booking', booking.POST, bookingBody)).status, 401);
  assert.equal(db.bookings.length, 0);
});
test('TESTER with booking permission removed cannot create a booking', async () => {
  await signIn();
  db.user_access_permissions.push({ user_id: tester.id, permissions: [], permission_version: 2 });
  assert.equal((await call('/api/user/create-booking', booking.POST, bookingBody)).status, 403);
  assert.equal(db.bookings.length, 0);
});
test('missing vehicle request fields do not create records or notifications', async () => {
  await signIn();
  assert.equal((await call('/api/user/create-booking', booking.POST, { ...bookingBody, purpose: '' })).status, 400);
  assert.equal(db.bookings.length, 0);
  assert.equal(notifications.length, 0);
});
test('overlapping vehicle request is rejected and no duplicate is persisted', async () => {
  await signIn();
  assert.equal((await call('/api/user/create-booking', booking.POST, bookingBody)).status, 200);
  assert.equal((await call('/api/user/create-booking', booking.POST, bookingBody)).status, 409);
  assert.equal(db.bookings.length, 1);
  assert.equal(notifications.length, 1);
});
test('missing fuel request fields are rejected without writes', async () => {
  await signIn();
  assert.equal((await call('/api/public/request-fuel', fuel.POST, { ...fuelBody, plate_number: '' })).status, 400);
  assert.equal(db.fuel_requests.length, 0);
  assert.equal(notifications.length, 0);
});
test('database failures return errors and do not send success notifications', async () => {
  await signIn();
  failTable = 'bookings';
  assert.equal((await call('/api/user/create-booking', booking.POST, bookingBody)).status, 500);
  failTable = 'fuel_requests';
  assert.equal((await call('/api/public/request-fuel', fuel.POST, fuelBody)).status, 500);
  assert.equal(db.bookings.length + db.fuel_requests.length, 0);
  assert.equal(notifications.length, 0);
});
