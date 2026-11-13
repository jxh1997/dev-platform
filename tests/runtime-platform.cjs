const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
require('dotenv').config({ path: '.env.test', override: true, quiet: true });
if (process.env.APP_ENV !== 'test')
  throw new Error('Isolated test environment required');

async function verify() {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const dns = require('node:dns/promises');
  const https = require('node:https');
  const tls = require('node:tls');
  assert.equal(process.version, 'v24.22.2');
  for (const file of [
    '/bin/sh',
    '/usr/bin/bash',
    '/usr/bin/apt',
    '/sbin/apk',
    '/usr/local/bin/npm',
  ]) {
    assert.equal(
      fs.existsSync(file),
      false,
      'runtime must not contain ' + file,
    );
  }
  const inventory = JSON.parse(
    fs.readFileSync('/usr/share/devplatform/runtime-files.json'),
  );
  assert.ok(inventory.packages.length > 0);
  for (const file of inventory.files) {
    if (file.type === 'symlink') {
      assert.equal(fs.readlinkSync(file.file), file.target);
      assert.equal(
        fs.existsSync(file.file),
        true,
        'runtime symlink must resolve',
      );
    } else {
      assert.equal(
        crypto
          .createHash('sha256')
          .update(fs.readFileSync(file.file))
          .digest('hex'),
        file.sha256,
      );
    }
  }
  const status = fs.readFileSync('/var/lib/dpkg/status', 'utf8');
  for (const pkg of inventory.packages) {
    assert.ok(status.includes('Package: ' + pkg.name + '\n'));
    assert.ok(status.includes('Version: ' + pkg.version + '\n'));
    assert.ok(fs.existsSync('/usr/share/doc/' + pkg.name + '/copyright'));
  }
  const root = fs
    .readFileSync('/proc/mounts', 'utf8')
    .split('\n')
    .map((line) => line.split(' '))
    .find((line) => line[1] === '/');
  assert.ok(root[3].split(',').includes('ro'));
  assert.ok((await dns.lookup('mysql')).address);
  const socket = require('node:dgram').createSocket('udp4');
  socket.on('message', (query, remote) => {
    const reply = Buffer.from(query);
    reply.writeUInt16BE(0x8183, 2);
    reply.writeUInt16BE(0, 6);
    reply.writeUInt16BE(0, 8);
    reply.writeUInt16BE(0, 10);
    socket.send(reply, remote.port, remote.address);
  });
  await new Promise((resolve) => socket.bind(0, '127.0.0.1', resolve));
  const resolver = new dns.Resolver({ timeout: 1000, tries: 1 });
  resolver.setServers(['127.0.0.1:' + socket.address().port]);
  try {
    await assert.rejects(
      resolver.resolve4('devplatform-nonexistent.invalid'),
      (error) => error.code === 'ENOTFOUND',
      'controlled DNS NXDOMAIN must reject',
    );
  } finally {
    socket.close();
  }
  assert.ok(fs.existsSync('/usr/share/zoneinfo/Asia/Shanghai'));
  process.env.TZ = 'Asia/Shanghai';
  assert.equal(new Date('2026-01-01T00:00:00Z').getHours(), 8);
  process.env.TZ = 'UTC';
  assert.equal(new Date('2026-01-01T00:00:00Z').getHours(), 0);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date('2026-01-01T00:00:00Z'));
  assert.equal(parts.find((part) => part.type === 'hour').value, '08');
  assert.equal(crypto.randomBytes(32).length, 32);
  const jwt = require('/app/node_modules/jsonwebtoken');
  const key = 'synthetic-platform-verification-only';
  const token = jwt.sign({ fixture: true }, key, {
    algorithm: 'HS256',
    expiresIn: 60,
  });
  assert.equal(jwt.verify(token, key).fixture, true);
  assert.throws(() => jwt.verify(token, 'wrong-synthetic-key'));
  assert.ok(tls.rootCertificates.length > 50);
  assert.ok(
    fs
      .readFileSync('/etc/ssl/certs/ca-certificates.crt', 'utf8')
      .includes('BEGIN CERTIFICATE'),
  );
  const cert = fs.readFileSync('/verification/tls/cert.pem');
  const server = https.createServer(
    { key: fs.readFileSync('/verification/tls/key.pem'), cert },
    (_req, res) => res.end('fixture'),
  );
  server.on('tlsClientError', () => {});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const request = (options) =>
    new Promise((resolve, reject) => {
      const req = https.get(
        {
          hostname: '127.0.0.1',
          port: server.address().port,
          agent: false,
          ...options,
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode));
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.setTimeout(2000, () => req.destroy(new Error('TLS fixture timeout')));
    });
  try {
    assert.equal(await request({ ca: cert }), 200);
    await assert.rejects(
      request({}),
      (error) =>
        ['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(
          error.code,
        ),
      'untrusted CA must reject',
    );
    await assert.rejects(
      request({ ca: cert, servername: 'wrong.invalid' }),
      (error) => error.code === 'ERR_TLS_CERT_ALTNAME_INVALID',
      'wrong TLS hostname must reject',
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  const z = require('/app/node_modules/zod');
  let visits = 0;
  const parsed = z
    .array(
      z.preprocess((value) => {
        visits++;
        return value;
      }, z.string()),
    )
    .max(1)
    .safeParse(['a', 'b']);
  assert.equal(parsed.success, false);
  assert.equal(visits, 0, 'existing Zod security backport remains installed');
  process.stdout.write(
    JSON.stringify({
      node: process.version,
      architecture: process.arch,
      files: inventory.files.length,
      packages: inventory.packages.length,
      checks: [
        'ELF/source integrity',
        'package metadata/copyright',
        'no shell/package manager',
        'readonly root',
        'DNS success and NXDOMAIN',
        'UTC/Shanghai/Intl',
        'random/hash/JWT',
        'TLS CA/hostname rejection',
        'Zod patch',
      ],
    }),
  );
}
const result = spawnSync(
  'docker',
  [
    'compose',
    '-p',
    'dev-platform-release-validation',
    '--env-file',
    '.env.test',
    '-f',
    'deployment/compose.release-test.yaml',
    'exec',
    '-T',
    'server',
    'node',
    '-e',
    '(' +
      verify.toString() +
      ')().catch(error=>{console.error(error.message);process.exitCode=1})',
  ],
  { encoding: 'utf8', timeout: 30000 },
);
if (result.status !== 0) {
  console.error('Runtime platform verification failed:', result.stderr.trim());
  process.exitCode = 1;
} else {
  mkdirSync('.release/verification', { recursive: true });
  writeFileSync('.release/verification/platform-results.json', result.stdout);
  console.log(
    'PASS pinned runtime, file/package provenance, DNS, timezones, crypto, TLS and patch regression',
  );
}
