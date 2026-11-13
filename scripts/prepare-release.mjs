import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = join(root, 'node_modules');
const hash = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const slash = (value) => value.split(sep).join('/');
const inside = (base, file) => {
  const value = relative(base, file);
  return !value.startsWith('..' + sep) && value !== '..' && !isAbsolute(value);
};
const writeJson = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function packageRoot(req, name) {
  let file;
  try {
    file = req.resolve(name + '/package.json');
  } catch {
    file = req.resolve(name);
  }
  let dir = dirname(realpathSync(file));
  while (inside(modules, dir)) {
    const manifest = join(dir, 'package.json');
    if (existsSync(manifest) && readJson(manifest).name === name) return dir;
    dir = dirname(dir);
  }
  throw new Error('Cannot locate runtime dependency: ' + name);
}

function link(output, location, target) {
  mkdirSync(dirname(location), { recursive: true });
  const value = relative(dirname(location), target);
  if (!inside(output, target))
    throw new Error('Dependency link escapes release');
  try {
    const existing = lstatSync(location);
    if (!existing.isSymbolicLink() || readlinkSync(location) !== value) {
      throw new Error(
        'Conflicting dependency link: ' + relative(output, location),
      );
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    symlinkSync(value, location, 'dir');
  }
}

function licenseSources(base) {
  return readdirSync(base)
    .filter(
      (name) =>
        /^(licen[sc]e|copying|notice)([._-]|$)/i.test(name) &&
        lstatSync(join(base, name)).isFile(),
    )
    .sort();
}

function addLicense(output, info, base, text) {
  const supplementFile = join(root, 'deployment/licenses/sources.json');
  const supplement = existsSync(supplementFile)
    ? readJson(supplementFile).find(
        (item) => item.package === info.name + '@' + info.version,
      )
    : undefined;
  if (!info.license && supplement)
    info = { ...info, license: supplement.declaredLicense };

  const id = info.name.replaceAll('/', '__') + '@' + info.version;
  const directory = join(output, 'third-party', 'licenses', id);
  mkdirSync(directory, { recursive: true });
  const files = [];
  for (const name of base ? licenseSources(base) : []) {
    cpSync(join(base, name), join(directory, name));
    files.push({
      source: name,
      file: slash(relative(output, join(directory, name))),
      sha256: hash(join(directory, name)),
    });
  }
  if (text) {
    writeFileSync(join(directory, 'BUNDLED-LICENSE.txt'), text);
    files.push({
      source: 'vite build.license',
      file: slash(relative(output, join(directory, 'BUNDLED-LICENSE.txt'))),
      sha256: hash(join(directory, 'BUNDLED-LICENSE.txt')),
    });
  }
  if (
    !files.length &&
    (info.name.startsWith('@vben/') || info.name.startsWith('@vben-core/'))
  ) {
    cpSync(join(root, 'LICENSE.vben'), join(directory, 'LICENSE.vben'));
    files.push({
      source: 'fixed Vben v5.7.0 workspace license',
      file: slash(relative(output, join(directory, 'LICENSE.vben'))),
      sha256: hash(join(directory, 'LICENSE.vben')),
    });
  }

  if (supplement && !files.length) {
    const original = join(root, supplement.file);
    if (!inside(root, original) || hash(original) !== supplement.sha256)
      throw new Error('Supplemental license integrity mismatch');
    cpSync(original, join(directory, 'PUBLISHER-LICENSE.txt'));
    files.push({
      source: supplement.source,
      file: slash(relative(output, join(directory, 'PUBLISHER-LICENSE.txt'))),
      sha256: supplement.sha256,
    });
    if (supplement.standardLicenseText) {
      const standard = join(root, supplement.standardLicenseText);
      if (
        !inside(root, standard) ||
        hash(standard) !== supplement.standardSha256
      )
        throw new Error('License terms integrity mismatch');
      cpSync(standard, join(directory, 'MIT-STANDARD-TERMS.txt'));
      files.push({
        source: supplement.standardSource,
        file: slash(
          relative(output, join(directory, 'MIT-STANDARD-TERMS.txt')),
        ),
        sha256: supplement.standardSha256,
      });
    }
    writeJson(join(directory, 'SOURCE.json'), supplement);
  }
  if (!info.license || !files.length)
    throw new Error(
      'Missing license metadata or original text: ' +
        info.name +
        '@' +
        info.version,
    );
  return { ...info, licenseFiles: files };
}

function installedWebPackage(name, version) {
  if (name.startsWith('@vben/') || name.startsWith('@vben-core/'))
    return undefined;
  const key = name.replace('/', '+') + '@' + version;
  const candidates = readdirSync(join(modules, '.pnpm')).filter(
    (n) => n === key || n.startsWith(key + '_'),
  );
  const patchFile = join(root, 'patches', name + '@' + version + '.patch');
  const patched = existsSync(patchFile)
    ? candidates.find((n) => n.includes('patch_hash=' + hash(patchFile)))
    : undefined;
  const selected = patched || candidates[0];
  return selected
    ? join(modules, '.pnpm', selected, 'node_modules', name)
    : undefined;
}

function notices(output, kind, packages) {
  const directory = join(output, 'third-party');
  mkdirSync(directory, { recursive: true });
  const selectedPatches = [];
  for (const file of readdirSync(join(root, 'patches')).filter((n) =>
    n.endsWith('.patch'),
  )) {
    if (!packages.some((p) => p.name + '@' + p.version + '.patch' === file))
      continue;
    const dest = join(directory, 'patches', file);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(root, 'patches', file), dest);
    selectedPatches.push({
      file: slash(relative(output, dest)),
      sha256: hash(dest),
    });
  }
  cpSync(
    join(root, 'THIRD_PARTY_NOTICES.md'),
    join(output, 'THIRD_PARTY_NOTICES.md'),
  );
  cpSync(join(root, 'LICENSE.vben'), join(directory, 'LICENSE.vben'));
  if (selectedPatches.length)
    cpSync(
      join(root, 'patches/README.md'),
      join(directory, 'patches/README.md'),
    );
  const metadata = {
    schemaVersion: 1,
    artifact: kind,
    product: 'DevPlatform',
    version: readJson(join(root, 'package.json')).version,
    lockSha256: hash(join(root, 'pnpm-lock.yaml')),
    packages: packages.sort((a, b) =>
      (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version),
    ),
    patches: selectedPatches,
  };
  writeJson(join(directory, 'packages.json'), metadata);
  const files = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      const rel = slash(relative(output, file));
      if (rel === 'third-party/files.json') continue;
      if (entry.isSymbolicLink()) {
        if (!inside(realpathSync(output), realpathSync(file)))
          throw new Error('Release contains an external symlink: ' + rel);
        files.push({ file: rel, target: readlinkSync(file) });
      } else if (entry.isDirectory()) visit(file);
      else
        files.push({
          file: rel,
          size: lstatSync(file).size,
          sha256: hash(file),
        });
    }
  }
  visit(output);
  writeJson(join(directory, 'files.json'), {
    schemaVersion: 1,
    excludesSelf: true,
    files,
  });
  console.log(
    kind +
      ' release: ' +
      packages.length +
      ' dependency records, ' +
      files.length +
      ' files/links',
  );
}

function server(output) {
  if (existsSync(output) && readdirSync(output).length)
    throw new Error('Server output must be empty');
  mkdirSync(output, { recursive: true });
  cpSync(join(root, 'dist'), join(output, 'dist'), { recursive: true });
  const manifest = readJson(join(root, 'package.json'));
  const rootRequire = createRequire(join(root, 'package.json'));
  const seen = new Map();
  function visit(base) {
    if (seen.has(base)) return;
    if (!inside(modules, base))
      throw new Error('Unexpected workspace runtime dependency');
    const pkg = readJson(join(base, 'package.json'));
    const dest = join(output, 'node_modules', relative(modules, base));
    const info = {
      name: pkg.name,
      version: pkg.version,
      license:
        typeof pkg.license === 'string'
          ? pkg.license
          : pkg.licenses?.length === 1
            ? pkg.licenses[0].type
            : undefined,
      sourceLicenseMetadata: pkg.license || pkg.licenses,
      manifestSha256: hash(join(base, 'package.json')),
    };
    seen.set(base, info);
    cpSync(base, dest, { recursive: true, dereference: false });
    const req = createRequire(join(base, 'package.json'));
    const optional = new Set([
      ...Object.keys(pkg.optionalDependencies || {}),
      ...Object.entries(pkg.peerDependenciesMeta || {})
        .filter(([, value]) => value.optional)
        .map(([key]) => key),
    ]);
    const dependencies = {
      ...pkg.dependencies,
      ...pkg.optionalDependencies,
      ...pkg.peerDependencies,
    };
    const siblingModules = base.slice(
      0,
      base.lastIndexOf(sep + 'node_modules' + sep) +
        (sep + 'node_modules').length,
    );
    for (const name of Object.keys(dependencies)) {
      let child;
      try {
        child = packageRoot(req, name);
      } catch (error) {
        if (optional.has(name)) continue;
        throw error;
      }
      visit(child);
      const depTarget = join(output, 'node_modules', relative(modules, child));
      link(
        output,
        join(output, relative(root, siblingModules), name),
        depTarget,
      );
    }
    seen.set(base, addLicense(output, info, base));
  }
  const dependencies = {};
  for (const name of Object.keys(manifest.dependencies)) {
    const base = packageRoot(rootRequire, name);
    visit(base);
    dependencies[name] = readJson(join(base, 'package.json')).version;
    link(
      output,
      join(output, 'node_modules', name),
      join(output, 'node_modules', relative(modules, base)),
    );
  }
  writeJson(join(output, 'package.json'), {
    name: '@dev-platform/server-release',
    version: manifest.version,
    private: true,
    type: 'commonjs',
    dependencies,
  });
  notices(output, 'server', [...seen.values()]);
}

function web(output) {
  const raw = readJson(join(output, 'third-party/bundled-licenses.json'));
  const packages = raw.map((p) => {
    const base = installedWebPackage(p.name, p.version);
    return addLicense(
      output,
      {
        name: p.name,
        version: p.version,
        license: p.identifier,
        source: 'Vite actual bundle',
      },
      base,
      p.text,
    );
  });
  const manifest = readJson(join(root, 'apps/admin-web/package.json'));
  const assets = readdirSync(join(root, 'apps/admin-web/public'))
    .filter((f) => lstatSync(join(root, 'apps/admin-web/public', f)).isFile())
    .map((name) => ({
      file: name,
      source: 'apps/admin-web/public/' + name,
      sha256: hash(join(output, name)),
      declaredLicense: manifest.license,
      licenseSource:
        'apps/admin-web/package.json; fixed Vben source LICENSE.vben',
    }));
  writeJson(join(output, 'third-party/public-assets.json'), assets);
  notices(output, 'web', packages);
}

const [kind, destination] = process.argv.slice(2);
if (!['server', 'web'].includes(kind) || !destination)
  throw new Error(
    'Usage: node scripts/prepare-release.mjs server|web <output>',
  );
const output = resolve(destination);
if (output === resolve(root) || output === modules || inside(output, root))
  throw new Error('Unsafe release output');
if (
  inside(modules, output) ||
  (kind === 'server' && inside(join(root, 'dist'), output))
)
  throw new Error('Release output overlaps inputs');
if (kind === 'server') server(output);
else web(output);
