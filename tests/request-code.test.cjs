const assert = require('node:assert/strict');
const { test } = require('node:test');

// We will mock the Supabase client used in requestCodeHelper.ts
const supabaseMock = {
    from: (table) => ({
        select: (cols) => ({
            eq: (col, val) => ({
                single: async () => {
                    if (table === 'vehicles' && val === 'v1') {
                        return { data: { plate_number: 'กข 1234' } };
                    }
                    return { data: null };
                }
            }),
            like: (col, val) => {
                return {
                    then: (resolve) => {
                        if (val === 'ENV-34/%') {
                            resolve({
                                data: [
                                    { request_code: 'ENV-34/001' },
                                    { request_code: 'ENV-34/009' },
                                    { request_code: 'ENV-34/010' }
                                ]
                            });
                        } else if (val === 'ENV-OT/%') {
                            resolve({
                                data: [
                                    { request_code: 'ENV-OT/008' },
                                    { request_code: 'ENV-OT/009' } // Test bug fix where 009 > 010 alphabetically
                                ]
                            });
                        } else {
                            resolve({ data: [] });
                        }
                    }
                };
            }
        })
    })
};

// Intercept module loading to mock supabase
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

require.extensions['.ts'] = (module, filename) => {
    let source = fs.readFileSync(filename, 'utf8').replace(/from "@\//g, `from "${root}/`);
    if (filename.includes('requestCodeHelper')) {
        source = source.replace(/import \{ createClient \}.*;/, '');
        source = source.replace(/const supabaseUrl.*;/, '');
        source = source.replace(/const supabaseServiceKey.*;/, '');
        source = source.replace(/const supabase = createClient\(.*\);/, 'const supabase = global.supabaseMock;');
    }
    module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};

global.supabaseMock = supabaseMock;

const { generateRequestCode, generateOtherVehicleRequestCode } = require('../lib/requestCodeHelper.ts');

test('generateRequestCode: calculates correct next sequence for normal vehicles', async () => {
    const code = await generateRequestCode('v1');
    assert.strictEqual(code, 'ENV-34/011', 'Should correctly parse 010 and add 1');
});

test('generateOtherVehicleRequestCode: calculates correct next sequence for other vehicles (Fix duplicate key 010)', async () => {
    const code = await generateOtherVehicleRequestCode('รถภายนอก กข 999');
    assert.strictEqual(code, 'ENV-99/001', 'Should use 99 from plate if digits exist');

    // This simulates the duplicate key bug: existing codes are up to 009. 
    // The old logic would do string sort and might mess up, but new logic parses integers.
    const code2 = await generateOtherVehicleRequestCode('รถไม่มีเลข');
    assert.strictEqual(code2, 'ENV-OT/010', 'Should use OT and correctly calculate 009 + 1 = 010');
});
