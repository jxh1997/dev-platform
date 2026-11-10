import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
const roots = [
  'apps/server/src',
  'apps/admin-web/src',
  'packages/backend-modules/src',
  'packages/database/src',
  'packages/contracts/src',
];
const failures: string[] = [];
async function walk(dir: string): Promise<string[]> {
  const children = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      children.map((c) =>
        c.isDirectory()
          ? walk(join(dir, c.name))
          : Promise.resolve(
              /\.(ts|vue)$/.test(c.name) ? [join(dir, c.name)] : [],
            ),
      ),
    )
  ).flat();
}
for (const root of roots)
  for (const file of await walk(root)) {
    if (file.includes('/generated/')) continue;
    const text = await readFile(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const inspect = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const dep = node.moduleSpecifier.text;
        const resolved = dep.startsWith('.')
          ? relative('.', resolve(file, '..', dep))
          : dep;
        if (
          root.includes('admin-web') &&
          /backend-modules|database|typeorm|@nestjs/.test(resolved)
        )
          failures.push(`${file}: 前端依赖后端 ${dep}`);
        if (
          root.includes('database') &&
          /backend-modules|apps\//.test(resolved)
        )
          failures.push(`${file}: database 反向依赖 ${dep}`);
        if (
          root.includes('backend-modules') &&
          /apps\/|customer-business/.test(resolved)
        )
          failures.push(`${file}: 公共业务反向依赖 ${dep}`);
        if (
          root.includes('contracts') &&
          /@nestjs|typeorm|node:|apps\/|database|backend-modules/.test(resolved)
        )
          failures.push(`${file}: contracts 非纯契约依赖 ${dep}`);
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ['Put', 'Patch', 'Delete', 'All', 'Head', 'Options'].includes(
          node.expression.text,
        )
      )
        failures.push(`${file}: 非白名单业务装饰器 ${node.expression.text}`);
      ts.forEachChild(node, inspect);
    };
    inspect(source);
    if (root.includes('admin-web') && /\.(put|patch|delete)\s*[(<]/.test(text))
      failures.push(`${file}: 非白名单前端请求`);
  }
if (failures.length) throw new Error(failures.join('\n'));
console.log(
  '应用边界与业务方法静态检查通过（不替代运行时授权与完整依赖图审查）',
);
