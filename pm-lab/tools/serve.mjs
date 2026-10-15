/* Zero-dependency static server for local autofill testing.
 * http://localhost is a "potentially trustworthy" origin, so WebAuthn works here
 * even though the scheme is plain http. Avoids any external dependency. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.argv[2] || 8000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
      return;
    }
    res.writeHead(200, {
      'content-type':
        rel === '/.well-known/passkey-endpoints'
          ? TYPES['.json']
          : TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'passkey-endpoints': 'enroll=/passkey-signup.html, signin=/passkey-login.html'
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log('PM Autofill Lab → http://localhost:' + PORT + '/  (root: ' + ROOT + ')');
});
