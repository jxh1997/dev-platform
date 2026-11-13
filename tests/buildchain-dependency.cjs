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
    const path = require('node:path');
    const { createRequire } = require('node:module');
    function installed(name, version) {
      const key = name.replace('/', '+') + '@' + version;
      const folder = fs.readdirSync('node_modules/.pnpm').find(
        (value) => value === key || value.startsWith(key + '_')
      );
      assert.ok(folder, name + '@' + version + ' must be installed');
      const manifest = path.resolve('node_modules/.pnpm', folder, 'node_modules', name, 'package.json');
      return createRequire(manifest)(name);
    }
    ${source}
  `,
    ],
    { encoding: 'utf8', timeout: 5000, maxBuffer: 8192 },
  );
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr || child.stdout);
}

for (const version of ['2.1.8', '5.0.13']) {
  test(`brace-expansion ${version}: non-expanding groups finish within the process limit`, () => {
    isolated(String.raw`
      const loaded = installed('brace-expansion', '${version}');
      const expand = typeof loaded === 'function' ? loaded : loaded.expand;
      assert.deepEqual(expand('file{1,2}.txt'), ['file1.txt', 'file2.txt']);
      const result = expand('a' + Array(30).fill('{}').join(','));
      assert.ok(Array.isArray(result));
      assert.ok(result.length <= 30);
    `);
  });
}

test('YAML 3/4 and TOML preserve configuration and reject malformed input', () => {
  isolated(String.raw`
    for (const version of ['3.15.2', '4.3.2']) {
      const yaml = installed('js-yaml', version);
      assert.deepEqual(yaml.load('port: 4311\nflags: [a, b]'), { port: 4311, flags: ['a', 'b'] });
      assert.throws(() => yaml.load('port: [unclosed'));
      const data = yaml.load('__proto__: {polluted: true}');
      assert.equal(Object.prototype.polluted, undefined);
      assert.ok(Object.hasOwn(data, '__proto__'));
    }
    const toml = installed('smol-toml', '1.9.1');
    assert.equal(toml.parse('[server]\nport = 4311').server.port, 4311);
    assert.throws(() => toml.parse('port = [unclosed'));
  `);
});

test('SVGO removes namespace and control-character executable links', () => {
  isolated(String.raw`
    const { optimize } = installed('svgo', '4.1.0');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg"><s:a href="java&#9;script:alert(1)"><circle r="2"/></s:a></svg>';
    const output = optimize(svg, { plugins: ['removeScripts'] }).data;
    assert.ok(output.includes('circle'));
    assert.ok(!output.includes('href='));
  `);
});

test('CSS tooling and serialization preserve data without executable script text', () => {
  isolated(String.raw`
    for (const version of ['6.1.6', '7.2.0']) {
      const parser = installed('postcss-selector-parser', version);
      const css = Array.from({ length: 500 }, (_, i) => '.item-' + i).join(',');
      assert.equal(parser().processSync(css), css);
    }
    const serialize = installed('serialize-javascript', '7.1.4');
    const data = { text: '</script><script>fixture</script>' };
    const output = serialize(data);
    assert.ok(!output.toLowerCase().includes('</script'));
    assert.deepEqual(JSON.parse(output), data);
  `);
});
