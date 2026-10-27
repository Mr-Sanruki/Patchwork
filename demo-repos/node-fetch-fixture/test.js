const assert = require('assert');
const { getJson, getText } = require('./src/index');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('node-fetch-fixture tests\n');

test('getJson is a function', () => {
  assert.ok(typeof getJson === 'function');
});

test('getText is a function', () => {
  assert.ok(typeof getText === 'function');
});

test('module exports both functions', () => {
  const mod = require('./src/index');
  assert.ok('getJson' in mod);
  assert.ok('getText' in mod);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
