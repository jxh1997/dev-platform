import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { selectGroups } from './helpers/integration-groups';

test('默认全套、单组与多组选择采用稳定顺序且不重复执行', () => {
  assert.deepEqual(selectGroups([]), ['transport', 'records', 'identity']);
  for (const group of ['transport', 'records', 'identity']) {
    assert.deepEqual(selectGroups(['--group', group]), [group]);
  }
  assert.deepEqual(
    selectGroups([
      '--group',
      'identity',
      '--group',
      'transport',
      '--group',
      'identity',
    ]),
    ['transport', 'identity'],
  );
});

test('非法筛选在环境校验及 DB 初始化之前非零退出', () => {
  for (const args of [
    ['--group'],
    ['--group', ''],
    ['--group', 'unknown'],
    ['--group=transport'],
    ['--unknown'],
    ['transport'],
    ['--group', 'transport', '--group'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /未知参数|分组缺失或未知|拒绝空分组/);
    assert.doesNotMatch(result.stderr, /拒绝执行：需 APP_ENV|ECONNREFUSED/);
    assert.doesNotMatch(result.stdout, /PASS |组通过/);
  }
});

test('合法筛选仍拒绝非测试环境', () => {
  const result = run(['--group', 'transport']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /拒绝执行：需 APP_ENV=test/);
  assert.doesNotMatch(result.stdout, /PASS |组通过/);
});

function run(args: string[]) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'tests/integration.ts', ...args],
    {
      encoding: 'utf8',
      env: { ...process.env, CI: 'true', APP_ENV: 'production' },
      timeout: 10000,
    },
  );
}
