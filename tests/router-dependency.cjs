const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// 独立子进程限制耗时，禁止在开发API中执行潜在ReDoS样本。
const result = spawnSync(
  process.execPath,
  [
    '-e',
    String.raw`
  const assert = require('node:assert/strict');
  const { createRequire } = require('node:module');
  const root = createRequire(process.cwd() + '/package.json');
  const express = createRequire(root.resolve('express/package.json'));
  const router = createRequire(express.resolve('router/package.json'));
  const { match, pathToRegexp } = router('path-to-regexp');
  const tooMany = '/' + Array.from({length: 9}, (_, i) => '{a' + i + '}').join('') + ':z';
  assert.throws(() => pathToRegexp(tooMany), /Too many path combinations/);
  const route = match('/api/v1/demo/records/:id');
  assert.equal(route('/api/v1/demo/records/9007199254740993').params.id, '9007199254740993');
  assert.equal(route('/api/v1/demo/records/'), false);
  assert.equal(route('/api/v1/demo/records/1/extra'), false);
  assert(route('/API/v1/demo/records/1/'));
  assert.deepEqual([...match('/assets/*parts')('/assets/a/b').params.parts], ['a', 'b']);
  const regex = pathToRegexp('/*foo-*bar-:baz').regexp;
  assert.equal(regex.test('/' + '-'.repeat(30000) + '\n'), false);
  assert(match('/*foo-*bar-:baz')('/a-b-c'));
`,
  ],
  { timeout: 5000, encoding: 'utf8', maxBuffer: 8192 },
);
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
console.log(
  'PASS Express/router实际解析链：模式组合上限、固定/参数/通配路径及隔离限时ReDoS回归',
);
