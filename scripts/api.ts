import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
const require = createRequire(import.meta.url);
const { createApplication, openapi, closeApplication } =
  require('../dist/apps/server/src/application.js') as typeof import('../apps/server/src/application');
const app = await createApplication(true);
try {
  const doc = openapi(app);
  const schema = JSON.stringify(doc, null, 2) + '\n';
  const types = astToString(await openapiTS(JSON.parse(schema)));
  const outputs = [
    ['docs/api/openapi.json', schema],
    ['packages/contracts/src/generated/openapi.ts', types],
  ];
  for (const [path, content] of outputs) {
    if (process.argv.includes('--check')) {
      if ((await readFile(path!, 'utf8')) !== content)
        throw new Error(`契约漂移：${path}；请运行 pnpm api:generate`);
    } else {
      await mkdir(path!.slice(0, path!.lastIndexOf('/')), { recursive: true });
      await writeFile(path!, content!);
    }
  }
  console.log(
    process.argv.includes('--check') ? 'API 契约一致' : 'API 契约已生成',
  );
} finally {
  await closeApplication(app);
}
