const assert = require('assert');
const { buildCli, getConfig } = require('./src/cli');

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

console.log('commander-fixture tests\n');

test('buildCli returns a Command instance', () => {
  const program = buildCli();
  assert.ok(program);
  assert.ok(typeof program.parse === 'function');
});

test('getConfig returns default configuration', () => {
  const program = buildCli();
  program.parse(['node', 'test']);
  const config = getConfig(program);
  assert.strictEqual(config.port, 3000);
  assert.strictEqual(config.host, 'localhost');
  assert.strictEqual(config.verbose, false);
});

test('getConfig reads custom --port flag', () => {
  const program = buildCli();
  program.parse(['node', 'test', '--port', '8080']);
  const config = getConfig(program);
  assert.strictEqual(config.port, 8080);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
