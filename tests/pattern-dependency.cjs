const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

function isolated(source) {
  const child = spawnSync(
    process.execPath,
    [
      '-e',
      `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');
    const { createRequire } = require('node:module');
    function parent(name, version) {
      const key = name.replace('/', '+') + '@' + version;
      const folder = fs.readdirSync('node_modules/.pnpm').find(
        (value) => value === key || value.startsWith(key + '_')
      );
      assert.ok(folder, name + '@' + version + ' must be installed');
      const base = path.resolve('node_modules/.pnpm', folder, 'node_modules', name);
      return { base, require: createRequire(path.join(base, 'package.json')) };
    }
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devplatform-pattern-'));
    const write = (name, body = 'synthetic fixture') => {
      const dest = path.join(temp, name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, body);
      return dest;
    };
    (async () => {
      try { ${source} }
      finally { fs.rmSync(temp, { recursive: true, force: true }); }
    })().catch((error) => { console.error(error); process.exitCode = 1; });
  `,
    ],
    { encoding: 'utf8', timeout: 8000, maxBuffer: 8192 },
  );
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr || child.stdout);
}

test('every reviewed parent resolves the fixed parser API', () => {
  isolated(String.raw`
    for (const [name, version] of [
      ['typeorm', '0.3.31'], ['archiver-utils', '5.0.2'], ['js-beautify', '1.15.4'],
      ['rimraf', '6.1.3'], ['workbox-build', '7.4.1'], ['@vercel/nft', '1.5.0'],
    ]) {
      const req = parent(name, version).require;
      assert.equal(req('glob/package.json').version, '14.0.5');
      const glob = req('glob');
      assert.equal(typeof glob.glob, 'function');
      assert.equal(typeof glob.globSync, 'function');
      assert.equal(glob.sync, glob.globSync);
    }
    for (const [name, version] of [
      ['@eslint/config-array', '0.23.5'], ['@jspm/generator', '2.15.0'],
      ['@typescript-eslint/typescript-estree', '8.59.4'],
      ['circular-dependency-scanner', '3.0.1'], ['editorconfig', '1.0.7'], ['eslint', '10.4.0'],
    ]) {
      const req = parent(name, version).require;
      assert.equal(req('minimatch/package.json').version, '11.0.8');
      const { Minimatch, minimatch } = req('minimatch');
      assert.equal(new Minimatch('src/**/*.ts').match('src/deep/model.ts'), true);
      assert.equal(minimatch.filter('**/*.ts')('src/model.ts'), true);
      assert.equal(minimatch('src/model.js', '!**/*.ts'), true);
    }
  `);
});

test('glob matching preserves exclusion, escaped names and Windows separator options', () => {
  isolated(String.raw`
    const req = parent('typeorm', '0.3.31').require;
    const glob = req('glob');
    write('src/one.ts'); write('src/deep/two.ts'); write('src/skip.ts'); write('src/.hidden.ts');
    write('literal[1].txt');
    const options = { cwd: temp, nodir: true, ignore: ['**/skip.ts'] };
    const expected = ['src/deep/two.ts', 'src/one.ts'];
    assert.deepEqual(glob.globSync('src/**/*.ts', options).sort(), expected);
    assert.deepEqual((await glob.glob('src/**/*.ts', options)).sort(), expected);
    assert.deepEqual(glob.globSync(glob.escape('literal[1].txt'), { cwd: temp }), ['literal[1].txt']);
    assert.deepEqual(glob.globSync('src' + String.fromCharCode(92) + '*.ts', { cwd: temp, windowsPathsNoEscape: true }).sort(), ['src/one.ts', 'src/skip.ts']);
    const mm = createRequire(req.resolve('glob/package.json'))('minimatch');
    const amplified = new mm.Minimatch('**/../'.repeat(24) + '*.ts', { optimizationLevel: 2 });
    assert.ok(amplified.set.length < 128);
    assert.equal(typeof amplified.match('src/one.ts'), 'boolean');
  `);
});

test('aborted glob promises and streams stop subsequent directory reads', () => {
  isolated(String.raw`
    const glob = parent('typeorm', '0.3.31').require('glob');
    for (let i = 0; i < 20; i++) write('tree/' + i + '/nested/file.ts');
    for (const mode of ['promise', 'stream']) {
      const controller = new AbortController();
      let reads = 0;
      const options = {
        cwd: temp, signal: controller.signal,
        fs: { readdir(dir, opts, callback) {
          reads++;
          fs.readdir(dir, opts, (error, entries) => {
            if (reads === 1) controller.abort(new Error('fixture cancellation'));
            callback(error, entries);
          });
        } },
      };
      if (mode === 'promise') {
        await assert.rejects(glob.glob('**/*', options), /fixture cancellation/);
      } else {
        await assert.rejects(new Promise((resolve, reject) => {
          glob.globStream('**/*', options).on('error', reject).on('end', resolve).resume();
        }), /fixture cancellation/);
      }
      // Observe any I/O scheduled after rejection, as required by the upstream advisory.
      await new Promise((resolve) => setTimeout(resolve, 40));
      assert.equal(reads, 1, mode + ' must not descend after cancellation');
    }
    const controller = new AbortController();
    controller.abort(new Error('already cancelled'));
    let reads = 0;
    await assert.rejects(glob.glob('**/*', {
      cwd: temp, signal: controller.signal,
      fs: { readdir() { reads++; throw new Error('unexpected directory read'); } },
    }), /already cancelled/);
    assert.equal(reads, 0);
  `);
});

test('TypeORM directory loading resolves classes and excludes declarations', () => {
  isolated(String.raw`
    const orm = parent('typeorm', '0.3.31');
    write('entities/model.cjs', 'exports.FixtureEntity = class FixtureEntity {};');
    write('entities/ignored.d.ts', 'not executable JavaScript');
    const { importClassesFromDirectories } = orm.require(path.join(orm.base, 'util/DirectoryExportedClassesLoader.js'));
    const classes = await importClassesFromDirectories({ log() {} }, [path.join(temp, 'entities/*')]);
    assert.deepEqual(classes.map((value) => value.name), ['FixtureEntity']);
  `);
});

test('archiving, Workbox manifests and rimraf use the fixed filesystem patterns', () => {
  isolated(String.raw`
    write('assets/a.txt'); write('assets/b.txt'); write('assets/excluded.tmp');
    const utils = parent('archiver-utils', '5.0.2').require('archiver-utils');
    assert.deepEqual(utils.file.expand({ cwd: temp }, ['assets/*', '!**/*.tmp']).sort(), ['assets/a.txt', 'assets/b.txt']);
    const workbox = parent('workbox-build', '7.4.1');
    const { getFileDetails } = workbox.require(path.join(workbox.base, 'build/lib/get-file-details.js'));
    const details = getFileDetails({ globDirectory: temp, globFollow: false, globIgnores: ['**/*.tmp'], globPattern: 'assets/*' });
    assert.deepEqual(details.globbedFileDetails.map((value) => value.file).sort(), ['assets/a.txt', 'assets/b.txt']);
    assert.ok(details.globbedFileDetails.every((value) => value.hash && value.size > 0));
    const archiver = createRequire(process.cwd() + '/internal/vite-config/package.json')('archiver');
    const { PassThrough } = require('node:stream');
    const archive = archiver('zip');
    const output = new PassThrough();
    const chunks = [];
    const completed = new Promise((resolve, reject) => {
      output.on('data', (chunk) => chunks.push(chunk));
      output.on('end', resolve);
      output.on('error', reject);
      archive.on('error', reject);
      archive.on('warning', reject);
    });
    archive.pipe(output);
    archive.directory(path.join(temp, 'assets'), false);
    await archive.finalize();
    await completed;
    const zip = Buffer.concat(chunks);
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    assert.ok(zip.includes(Buffer.from('a.txt')) && zip.includes(Buffer.from('b.txt')));
    const { rimraf } = createRequire(process.cwd() + '/package.json')('rimraf');
    await rimraf(path.join(temp, 'assets/*.tmp'), { glob: true });
    assert.equal(fs.existsSync(path.join(temp, 'assets/excluded.tmp')), false);
    assert.equal(fs.existsSync(path.join(temp, 'assets/a.txt')), true);
  `);
});

test('NFT tracing and editorconfig retain file discovery behavior', () => {
  isolated(String.raw`
    write('entry.cjs', 'module.exports = require("./dependency.cjs");');
    write('dependency.cjs', 'module.exports = "fixture";');
    const { nodeFileTrace } = parent('@vercel/nft', '1.5.0').require('@vercel/nft');
    const trace = await nodeFileTrace([path.join(temp, 'entry.cjs')], { base: temp, processCwd: temp });
    assert.ok(trace.fileList.has('entry.cjs') && trace.fileList.has('dependency.cjs'));
    write('.editorconfig', 'root = true\n[*.{js,cjs}]\nindent_style = space\nindent_size = 2\n');
    const editorconfig = parent('editorconfig', '1.0.7').require('editorconfig');
    const config = await editorconfig.parse(path.join(temp, 'entry.cjs'));
    assert.equal(config.indent_size, 2);
    assert.equal(config.indent_style, 'space');
  `);
});
