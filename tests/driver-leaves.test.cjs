/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const store = require('../lib/driver-leave-store.ts');
test('local leave lifecycle: boundaries, overlapping requests, ownership and cancellation', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'govcar-leave-test-'));
  process.env.DRIVER_LEAVE_TEST = '1'; process.env.DRIVER_LEAVE_TEST_DIR = directory;
  try {
    const start_at = '2099-01-06T09:00:00+07:00', end_at = '2099-01-06T12:00:00+07:00';
    await assert.rejects(store.changeLeave('line:a', 'a', { start_at: end_at, end_at: start_at }, false));
    const outcomes = await Promise.allSettled([store.changeLeave('line:a', 'a', { start_at, end_at }, false), store.changeLeave('line:a', 'a', { start_at, end_at }, false)]);
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await store.unavailableDrivers('2099-01-06T08:30:00+07:00')).has('a'), true, 'null end assumes one hour');
    assert.equal((await store.unavailableDrivers('2099-01-06T12:00:00+07:00')).has('a'), false, 'touching endpoint is allowed');
    assert.equal((await store.unavailableDrivers('2099-01-06T08:00:00+07:00', start_at)).has('a'), false);
    await assert.rejects(store.assertDriverAvailable('a', start_at, end_at));
    await store.assertDriverAvailable('b', start_at, end_at);
    const [leave] = await store.readLeaves();
    await assert.rejects(store.changeLeave('line:b', 'b', { id: leave.id }, false));
    await store.changeLeave('line:a', 'a', { id: leave.id }, false);
    await store.assertDriverAvailable('a', start_at, end_at);
    assert.equal((await store.readLeaves())[0].cancelled_by, 'line:a');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); delete process.env.DRIVER_LEAVE_TEST; delete process.env.DRIVER_LEAVE_TEST_DIR; }
});
test('production does not activate local leave storage', async () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try { assert.equal(store.leavesEnabled(), false); assert.deepEqual(await store.readLeaves(), []); await assert.rejects(store.changeLeave('a', 'a', {}, true)); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
test('demo identity is fixed and only available on local development origins', () => {
  const { LOCAL_TEST_DRIVER, localDriverDemoAllowed } = require('../lib/local-test-driver.ts');
  const previous = process.env.NODE_ENV;
  try {
    assert.equal(LOCAL_TEST_DRIVER.full_name, 'ทดสอบ ขับรถ');
    process.env.NODE_ENV = 'development';
    assert.equal(localDriverDemoAllowed(new Request('http://localhost:3100/api/driver/leaves/demo')), true);
    assert.equal(localDriverDemoAllowed(new Request('https://example.com/api/driver/leaves/demo')), false);
    assert.equal(localDriverDemoAllowed(new Request('http://localhost:3100/api/driver/leaves/demo', { headers: { origin: 'https://example.com' } })), false);
    process.env.NODE_ENV = 'production';
    assert.equal(localDriverDemoAllowed(new Request('http://localhost:3100/api/driver/leaves/demo')), false);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
