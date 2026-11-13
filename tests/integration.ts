import { strict as assert } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { expectedChecks, selectGroups } from './helpers/integration-groups';

const selected = selectGroups(process.argv.slice(2));
const { withIntegrationContext } =
  await import('./helpers/integration-context');
const suites = {
  transport: () =>
    import('./integration/transport').then((m) => m.runTransport),
  records: () => import('./integration/records').then((m) => m.runRecords),
  identity: () => import('./integration/identity').then((m) => m.runIdentity),
};
const started = performance.now();
const completed: string[] = [];
console.log(`集成验证分组：${selected.join(', ')}`);
for (const group of selected) {
  const groupStarted = performance.now();
  const suite = await suites[group]();
  const names = await withIntegrationContext(suite);
  assert.equal(names.length, expectedChecks[group], `${group} 用例数量漂移`);
  completed.push(...names);
  console.log(
    `GROUP ${group}: ${names.length} 组通过，${((performance.now() - groupStarted) / 1000).toFixed(2)}s`,
  );
}
assert.ok(completed.length > 0, '拒绝零用例成功');
assert.equal(new Set(completed).size, completed.length, '存在重复用例名称');
console.log(
  `真实 MySQL 集成验证：${completed.length} 组通过，${((performance.now() - started) / 1000).toFixed(2)}s`,
);
