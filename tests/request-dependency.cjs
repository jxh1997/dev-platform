const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createRequire } = require('node:module');
const { test } = require('node:test');

// Resolve the packages actually consumed by the shared request client.
const clientRequire = createRequire(
  `${process.cwd()}/packages/effects/request/package.json`,
);
const axiosRequire = createRequire(clientRequire.resolve('axios/package.json'));
const FormData = axiosRequire('form-data');
const { http } = axiosRequire('follow-redirects');
const qs = clientRequire('qs');

test('multipart names and filenames cannot inject headers', () => {
  const form = new FormData();
  form.append('field"\r\nX-Injected: yes', Buffer.from('fixture'), {
    filename: 'file"\r\nX-Injected: yes.txt',
  });
  const body = form.getBuffer().toString();
  assert.ok(!body.includes('\r\nX-Injected:'));
  assert.ok(body.includes('fixture'));
  assert.ok(body.includes('%0D%0A'));
});

test('query serialization preserves IDs and rejects prototype pollution', () => {
  assert.equal(
    qs.stringify(
      { id: '9007199254740993', tags: ['a', 'b'] },
      { arrayFormat: 'repeat' },
    ),
    'id=9007199254740993&tags=a&tags=b',
  );
  const parsed = qs.parse(
    '__proto__[polluted]=yes&constructor[prototype][polluted]=yes',
  );
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.hasOwn(parsed, '__proto__'), false);
  assert.equal(Object.hasOwn(parsed, 'constructor'), false);
});

test(
  'redirects strip array-form credentials before crossing hosts',
  { timeout: 5000 },
  async (t) => {
    const destination = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(req.headers));
    });
    const source = createServer((_req, res) => {
      res.writeHead(302, {
        Location: `http://127.0.0.1:${destination.address().port}/target`,
      });
      res.end();
    });
    t.after(() => {
      source.closeAllConnections();
      destination.closeAllConnections();
      source.close();
      destination.close();
    });
    const listen = (server, host) =>
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, host, resolve);
      });
    await listen(destination, '127.0.0.1');
    await listen(source, '::1');
    const headers = await new Promise((resolve, reject) => {
      const req = http.get(
        {
          hostname: '::1',
          port: source.address().port,
          path: '/',
          headers: [
            'Authorization',
            'Bearer synthetic-fixture',
            'Cookie',
            'session=synthetic-fixture',
            'X-Public',
            'retained',
          ],
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.setTimeout(2000, () =>
        req.destroy(new Error('fixture request timed out')),
      );
      t.after(() => req.destroy());
    });
    assert.equal(headers.authorization, undefined);
    assert.equal(headers.cookie, undefined);
    assert.equal(headers['x-public'], 'retained');
  },
);
