const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

async function schemaWorker() {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { createRequire } = require('node:module');
  const { pathToFileURL } = require('node:url');
  const version = process.argv[1];
  const sourceEntries = process.argv[2] === 'source';
  const rootRequire = createRequire(process.cwd() + '/package.json');
  const req =
    version === '3.25.76'
      ? rootRequire
      : createRequire(
          fs.realpathSync(
            process.cwd() + '/scripts/vsh/node_modules/knip/package.json',
          ),
        );
  const manifestFile = req.resolve('zod/package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile));
  assert.equal(manifest.version, version);
  const base = path.dirname(manifestFile);

  async function verify(z, v3) {
    const safe = (schema, value) =>
      typeof schema.safeParse === 'function'
        ? schema.safeParse(value)
        : z.safeParse(schema, value);
    const safeAsync = (schema, value) =>
      typeof schema.safeParseAsync === 'function'
        ? schema.safeParseAsync(value)
        : z.safeParseAsync(schema, value);
    const bound = (schema, kind, max) => {
      if (kind === 'arrayMax')
        return schema.max ? schema.max(max) : schema.check(z.maxLength(max));
      if (kind === 'arrayExact')
        return schema.length ? schema.length(max) : schema.check(z.length(max));
      if (kind === 'setMax')
        return schema.max ? schema.max(max) : schema.check(z.maxSize(max));
      return schema.size ? schema.size(max) : schema.check(z.size(max));
    };
    for (const async of [false, true]) {
      for (const kind of ['arrayMax', 'arrayExact', 'setMax', 'setExact']) {
        let visits = 0;
        const track = (value) => {
          visits++;
          return async ? Promise.resolve(value) : value;
        };
        const element = z.preprocess
          ? z.preprocess(track, z.string())
          : z.pipe(z.unknown(), z.transform(track));
        const collection = kind.startsWith('array')
          ? z.array(element)
          : z.set(element);
        const schema = z.object({ items: bound(collection, kind, 1) });
        const items = kind.startsWith('array')
          ? ['a', 'b', 'c']
          : new Set(['a', 'b', 'c']);
        const result = async
          ? await safeAsync(schema, { items })
          : safe(schema, { items });
        assert.equal(
          result.success,
          false,
          kind + ' must fail its declared bound',
        );
        assert.equal(
          visits,
          0,
          kind + ' must stop before child parsing or Promise allocation',
        );
        assert.equal(result.error.issues.length, 1);
        assert.equal(result.error.issues[0].code, 'too_big');
        assert.equal(result.error.issues[0].maximum, 1);
        assert.deepEqual(result.error.issues[0].path, ['items']);
        const accepted = kind.startsWith('array') ? ['a'] : new Set(['a']);
        const normal = async
          ? await safeAsync(schema, { items: accepted })
          : safe(schema, { items: accepted });
        assert.equal(normal.success, true);
        assert.equal(visits, 1, 'in-bound child parsing must remain enabled');
      }
    }
    let visits = 0;
    const element = z.preprocess
      ? z.preprocess((value) => {
          visits++;
          return value;
        }, z.string())
      : z.pipe(
          z.unknown(),
          z.transform((value) => {
            visits++;
            return value;
          }),
        );
    assert.equal(safe(z.array(element), ['a', 'b', 'c']).success, true);
    assert.equal(
      visits,
      3,
      'unconstrained arrays retain their existing contract',
    );
    const wrong = safe(z.object({ items: z.array(z.string()) }), {
      items: [1],
    });
    assert.equal(wrong.success, false);
    assert.deepEqual(wrong.error.issues[0].path, ['items', 0]);
    const minArray = z.array(z.string());
    const minSchema = minArray.min
      ? minArray.min(1)
      : minArray.check(z.minLength(1));
    assert.equal(safe(minSchema, []).error.issues[0].code, 'too_small');
    if (typeof z.string().optional === 'function') {
      const optional = z.object({
        name: z.string().default('fixture'),
        note: z.string().nullable().optional(),
      });
      assert.deepEqual(safe(optional, {}).data, { name: 'fixture' });
      assert.equal(safe(optional, { note: null }).success, true);
      assert.equal(
        safe(
          z.string().refine((value) => value === 'ok'),
          'no',
        ).success,
        false,
      );
      assert.equal(
        safe(
          z.string().transform((value) => value.trim()),
          ' ok ',
        ).data,
        'ok',
      );
    }
    if (!v3) {
      let mapVisits = 0;
      const entry = z.preprocess
        ? z.preprocess((value) => {
            mapVisits++;
            return value;
          }, z.string())
        : z.pipe(
            z.unknown(),
            z.transform((value) => {
              mapVisits++;
              return value;
            }),
          );
      const result = safe(
        z.map(z.string(), entry).check(z.maxSize(1)),
        new Map([
          ['a', 'a'],
          ['b', 'b'],
        ]),
      );
      assert.equal(result.success, false);
      assert.equal(mapVisits, 0);
    }
    const bounded = bound(z.array(z.string()), 'arrayMax', 1);
    assert.equal(safe(bounded, Array(10000).fill(1)).error.issues.length, 1);
  }

  const entries = [
    '.',
    './v3',
    './v4',
    './v4/mini',
    version === '3.25.76' ? './v4-mini' : './mini',
  ];
  for (const entry of entries) {
    const target = manifest.exports[entry];
    for (const condition of sourceEntries
      ? ['@zod/source']
      : ['require', 'import']) {
      const file = path.join(base, target[condition]);
      const z =
        condition === 'require'
          ? require(file)
          : await import(pathToFileURL(file).href);
      const isV3 = entry === './v3' || (entry === '.' && version === '3.25.76');
      try {
        await verify(z, isV3);
      } catch (error) {
        error.message =
          version + ' ' + entry + ' ' + condition + ': ' + error.message;
        throw error;
      }
    }
  }
  const coreEntry = manifest.exports['./v4/core'];
  for (const condition of sourceEntries
    ? ['@zod/source']
    : ['require', 'import']) {
    const file = path.join(base, coreEntry[condition]);
    const core =
      condition === 'require'
        ? require(file)
        : await import(pathToFileURL(file).href);
    let visits = 0;
    const element = new core.$ZodString({ type: 'string' });
    const original = element._zod.run;
    element._zod.run = (payload, ctx) => {
      visits++;
      return original(payload, ctx);
    };
    const cap = new core.$ZodCheckMaxLength({
      check: 'max_length',
      maximum: 1,
    });
    const array = new core.$ZodArray({ type: 'array', element, checks: [cap] });
    assert.equal(core.safeParse(array, ['a', 'b']).success, false);
    assert.equal((await core.safeParseAsync(array, ['a', 'b'])).success, false);
    assert.equal(
      visits,
      0,
      'direct core entry must also reject before child parsing',
    );
  }
}

async function mergeWorker() {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { createRequire } = require('node:module');
  const folder = fs
    .readdirSync('node_modules/.pnpm')
    .find((name) => name.startsWith('@rollup+plugin-node-resolve@16.0.3_'));
  assert.ok(folder);
  const resolver = createRequire(
    path.resolve(
      'node_modules/.pnpm',
      folder,
      'node_modules/@rollup/plugin-node-resolve/package.json',
    ),
  );
  const base = path.dirname(resolver.resolve('deepmerge/package.json'));
  for (const entry of ['index.js', 'dist/cjs.js', 'dist/umd.js']) {
    let merge;
    if (entry === 'index.js') {
      // The published source imports a dev-only helper; reuse the identical
      // helper bundled in its real CJS entry without installing a dependency.
      const Module = require('node:module');
      const cjsFile = path.join(base, 'dist/cjs.js');
      const bundled = fs.readFileSync(cjsFile, 'utf8');
      const helper = new Module(cjsFile);
      helper._compile(
        bundled.slice(0, bundled.indexOf('function emptyTarget')) +
          '\nmodule.exports = isMergeableObject;',
        cjsFile,
      );
      const source = new Module(path.join(base, entry));
      source.require = (name) => {
        assert.equal(name, 'is-mergeable-object');
        return helper.exports;
      };
      source._compile(
        fs.readFileSync(path.join(base, entry), 'utf8'),
        path.join(base, entry),
      );
      merge = source.exports;
    } else {
      merge = require(path.join(base, entry));
    }
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
    const nullSource = Object.assign(Object.create(null), malicious);
    for (const [target, source] of [
      [malicious, {}],
      [Object.create(null), nullSource],
      [{ nested: malicious }, {}],
      [{ list: [malicious] }, {}],
    ]) {
      const output = merge(target, source);
      const inspect = (value) => {
        if (!value || typeof value !== 'object') return;
        assert.equal(
          Object.getPrototypeOf(value),
          Array.isArray(value) ? Array.prototype : Object.prototype,
        );
        assert.equal(value.polluted, undefined);
        for (const key of Object.keys(value))
          if (key !== '__proto__') inspect(value[key]);
      };
      inspect(output);
      assert.equal(Object.prototype.polluted, undefined);
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      merge(malicious, {}),
      '__proto__',
    );
    assert.equal(descriptor.enumerable, true);
    assert.equal(descriptor.configurable, true);
    assert.equal(descriptor.writable, true);
    const symbol = Symbol('fixture');
    const target = Object.assign(Object.create({ inherited: 1 }), { own: 2 });
    const result = merge(target, { [symbol]: 3, prototype: { fixture: true } });
    assert.equal(result.inherited, undefined);
    assert.equal(result[symbol], 3);
    assert.equal(result.prototype.fixture, true);
    assert.deepEqual(
      merge({ constructor: { a: 1 } }, { constructor: { b: 2 } }).constructor,
      { a: 1, b: 2 },
    );
    assert.deepEqual(merge([1], [2]), [1, 2]);
    assert.deepEqual(
      merge({ list: [1] }, { list: [2] }, { arrayMerge: (_a, b) => b }),
      { list: [2] },
    );
    assert.deepEqual(
      merge(
        { n: { a: 1 } },
        { n: { b: 2 } },
        {
          customMerge: (key) =>
            key === 'n' ? () => ({ custom: true }) : undefined,
        },
      ),
      { n: { custom: true } },
    );
    const special = { date: new Date(0), regex: /fixture/ };
    assert.deepEqual(merge({}, special), special);
  }
}

async function environmentWorker() {
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const os = require('node:os');
  // Prevent dotenv from reading the developer's environment file in this child.
  process.env.DOTENV_CONFIG_PATH = path.join(
    os.tmpdir(),
    'devplatform-no-env-' + process.pid,
  );
  const { databaseConfig } = require(
    process.cwd() + '/dist/packages/database/src/data-source.js',
  );
  const { validateRuntime } = require(
    process.cwd() + '/dist/apps/server/src/application.js',
  );
  const db = {
    APP_ENV: 'test',
    INSTANCE_ID: 'synthetic-schema-test',
    DB_HOST: '127.0.0.1',
    DB_PORT: '13307',
    DB_USERNAME: 'synthetic_fixture',
    DB_PASSWORD: 'synthetic-fixture-not-a-secret',
    DB_DATABASE: 'synthetic_fixture',
  };
  assert.equal(databaseConfig(db).DB_PORT, 13307);
  assert.throws(() => databaseConfig({ ...db, DB_PORT: 'invalid' }), /DB_PORT/);
  assert.throws(() => databaseConfig({ ...db, DB_USERNAME: 'root' }), /root/);
  process.env = {
    APP_ENV: 'test',
    INSTANCE_ID: 'synthetic-schema-test',
    APP_ORIGIN: 'http://127.0.0.1:5778',
    HOST: '127.0.0.1',
    PORT: '4311',
    JWT_SECRET: 'synthetic-fixture-not-a-secret-1234567890',
  };
  assert.equal(validateRuntime().PORT, 4311);
  process.env.APP_ORIGIN = 'http://127.0.0.1:5778/path';
  assert.throws(() => validateRuntime(), /APP_ORIGIN/);
  process.env.APP_ENV = 'production';
  process.env.APP_ORIGIN = 'http://127.0.0.1:5778';
  assert.throws(() => validateRuntime(), /HTTPS/);
}

function isolated(worker, version, sourceEntries = false) {
  const child = spawnSync(
    process.execPath,
    [
      '--max-old-space-size=256',
      ...(sourceEntries ? ['--import', 'tsx', '--conditions=@zod/source'] : []),
      '-e',
      '(' +
        worker.toString() +
        ')().catch((error) => { console.error(error); process.exitCode = 1; });',
      version,
      sourceEntries ? 'source' : 'compiled',
    ],
    { encoding: 'utf8', timeout: 10000, maxBuffer: 8192 },
  );
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr || child.stdout);
}

for (const version of ['3.25.76', '4.6.7']) {
  for (const sourceEntries of [false, true]) {
    test(
      'Zod ' +
        version +
        ' ' +
        (sourceEntries ? 'TypeScript source' : 'CJS/ESM') +
        ' schema entry bounds',
      () => {
        isolated(schemaWorker, version, sourceEntries);
      },
    );
  }
}
test('deepmerge source/CJS/UMD returned and global prototypes remain safe', () => {
  isolated(mergeWorker, '4.3.1');
});

test('actual database and runtime schemas accept valid fixtures and reject unsafe configuration', () => {
  isolated(environmentWorker, 'synthetic');
});
