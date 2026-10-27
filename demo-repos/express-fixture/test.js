const assert = require('assert');
const { createApp } = require('./src/app');

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

console.log('express-fixture tests\n');

test('createApp returns an Express app', () => {
  const app = createApp();
  assert.ok(typeof app === 'function');
  assert.ok(typeof app.get === 'function');
  assert.ok(typeof app.listen === 'function');
});

test('app has expected routes', () => {
  const app = createApp();
  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => r.route.path);
  assert.ok(routes.includes('/'));
  assert.ok(routes.includes('/hello/:name'));
});

test('app has error handler middleware', () => {
  const app = createApp();
  const layers = app._router.stack;
  const errorHandlers = layers.filter(l => l.handle && l.handle.length === 4);
  assert.ok(errorHandlers.length > 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
