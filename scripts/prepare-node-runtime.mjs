import { execFileSync } from 'node:child_process';
import { rootCertificates } from 'node:tls';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

if (process.platform !== 'linux' || process.version !== 'v24.22.2') {
  throw new Error(
    'Runtime preparation requires the pinned Linux Node24.22.2 source',
  );
}
const output = process.argv[2];
if (
  !output ||
  !output.startsWith('/') ||
  output === '/' ||
  (existsSync(output) && readdirSync(output).length)
) {
  throw new Error('Provide a new, empty absolute runtime output directory');
}
mkdirSync(output, { recursive: true });
const sourceStatus = readFileSync('/var/lib/dpkg/status', 'utf8');
const blocks = new Map();
for (const block of sourceStatus.trim().split(/\n\n+/)) {
  const name = /^Package: (.+)$/m.exec(block)?.[1];
  const arch = /^Architecture: (.+)$/m.exec(block)?.[1];
  if (name) {
    blocks.set(name, block);
    blocks.set(name + ':' + arch, block);
  }
}
const owners = new Map();
for (const file of readdirSync('/var/lib/dpkg/info').filter((f) =>
  f.endsWith('.list'),
)) {
  const name = file.slice(0, -5);
  for (const path of readFileSync('/var/lib/dpkg/info/' + file, 'utf8').split(
    '\n',
  )) {
    if (path) owners.set(path, name);
  }
}
const hash = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
const files = new Map();
const packages = new Set();
function owner(file) {
  return (
    owners.get(file) ||
    owners.get(file.startsWith('/usr/lib/') ? file.slice(4) : '/usr' + file)
  );
}
function copy(file) {
  file = resolve(file);
  if (files.has(file)) return;
  const stat = lstatSync(file);
  const target = join(output, file);
  mkdirSync(dirname(target), { recursive: true });
  const packageName = owner(file);
  if (packageName) packages.add(packageName);
  if (stat.isSymbolicLink()) {
    const link = readlinkSync(file);
    files.set(file, {
      file,
      type: 'symlink',
      target: link,
      package: packageName || 'official Node image configuration',
    });
    symlinkSync(link, target);
    copy(resolve(dirname(file), link));
  } else if (stat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(file)) copy(join(file, entry));
  } else if (stat.isFile()) {
    copyFileSync(file, target);
    chmodSync(target, stat.mode & 0o777);
    files.set(file, {
      file,
      sha256: hash(file),
      mode: stat.mode & 0o777,
      package: packageName || 'official Node distribution',
    });
  } else {
    throw new Error('Unsupported runtime file type: ' + file);
  }
}
const ldd = execFileSync('ldd', [process.execPath], { encoding: 'utf8' });
if (/not found/.test(ldd))
  throw new Error('Node ELF dependencies are incomplete');
copy(process.execPath);
for (const line of ldd.split('\n')) {
  const match = /(?:=>\s+|^\s*)(\/\S+)/.exec(line);
  if (match) copy(match[1]);
}
for (const file of [
  '/usr/local/LICENSE',
  '/etc/os-release',
  '/etc/debian_version',
  '/etc/nsswitch.conf',
  '/etc/passwd',
  '/etc/group',
  '/usr/share/zoneinfo',
  '/usr/share/common-licenses',
])
  copy(file);
if (existsSync('/etc/ssl/certs/ca-certificates.crt')) {
  copy('/etc/ssl/certs/ca-certificates.crt');
} else {
  const cert = '/etc/ssl/certs/ca-certificates.crt';
  mkdirSync(dirname(join(output, cert)), { recursive: true });
  writeFileSync(join(output, cert), rootCertificates.join('\n') + '\n');
  files.set(cert, {
    file: cert,
    sha256: hash(join(output, cert)),
    mode: 0o644,
    package: 'official Node distribution',
    source: 'tls.rootCertificates from the pinned Node binary',
  });
}
if (existsSync('/etc/localtime')) copy('/etc/localtime');
if (existsSync('/etc/ssl/openssl.cnf')) copy('/etc/ssl/openssl.cnf');

// Some copyright paths are links to another binary package's original notice.
const reviewed = new Set();
while ([...packages].some((p) => !reviewed.has(p))) {
  for (const name of packages) {
    if (reviewed.has(name)) continue;
    reviewed.add(name);
    const file = '/usr/share/doc/' + name.split(':')[0] + '/copyright';
    if (!existsSync(file))
      throw new Error('Missing OS package copyright: ' + name);
    copy(file);
  }
}
const selected = [...packages].sort().map((key) => {
  const block = blocks.get(key);
  if (!block) throw new Error('Missing package provenance: ' + key);
  return {
    name: /^Package: (.+)$/m.exec(block)[1],
    version: /^Version: (.+)$/m.exec(block)[1],
    architecture: /^Architecture: (.+)$/m.exec(block)[1],
    content: 'selected-runtime-files-only',
    files: [...files.values()]
      .filter((f) => f.package === key)
      .map((f) => f.file),
  };
});
mkdirSync(join(output, 'var/lib/dpkg'), { recursive: true });
writeFileSync(
  join(output, 'var/lib/dpkg/status'),
  [...new Set([...packages].map((p) => blocks.get(p)))]
    .map((b) => b + '\nX-DevPlatform-Content: selected-runtime-files-only')
    .join('\n\n') + '\n',
);
mkdirSync(join(output, 'tmp'), { recursive: true });
chmodSync(join(output, 'tmp'), 0o1777);
mkdirSync(join(output, 'usr/share/devplatform'), { recursive: true });
writeFileSync(
  join(output, 'usr/share/devplatform/runtime-files.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      nodeVersion: process.version,
      architecture: process.arch,
      nodeSha256: hash(process.execPath),
      source: 'node:24.22.2-bookworm-slim',
      packageMetadata:
        'Original binary package versions retained; only the enumerated files are distributed.',
      packages: selected,
      files: [...files.values()].sort((a, b) => a.file.localeCompare(b.file)),
      runtimeProvided: [
        '/etc/hosts',
        '/etc/resolv.conf',
        '/etc/hostname',
        '/proc',
        '/dev',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Node runtime: ' +
    files.size +
    ' files/links, ' +
    selected.length +
    ' source packages, original versions and copyright retained',
);
