const assert = require('assert');
const { formatSuccess, formatError, formatWarning } = require('./src/index');

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

console.log('chalk-fixture tests\n');

test('formatSuccess returns a styled string', () => {
  const result = formatSuccess('done');
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('formatError returns a styled string', () => {
  const result = formatError('fail');
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('formatWarning returns a styled string', () => {
  const result = formatWarning('warn');
  assert.ok(typeof result === 'string');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
