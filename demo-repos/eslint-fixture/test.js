const assert = require('assert');
const { greet, add } = require('./src/index');
const { execSync } = require('child_process');
const path = require('path');

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

console.log('eslint-fixture tests\n');

test('greet returns a greeting string', () => {
  assert.strictEqual(greet('World'), 'Hello, World!');
});

test('add returns the sum of two numbers', () => {
  assert.strictEqual(add(2, 3), 5);
});

test('eslint runs without errors on src/', () => {
  const eslintBin = path.join(__dirname, 'node_modules', '.bin', 'eslint');
  try {
    execSync(`"${eslintBin}" src/`, { cwd: __dirname, stdio: 'pipe' });
  } catch (e) {
    throw new Error('ESLint reported errors: ' + e.stderr?.toString().slice(0, 200));
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
