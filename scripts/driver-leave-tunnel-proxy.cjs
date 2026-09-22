/* eslint-disable @typescript-eslint/no-require-imports */
// Restricted gateway for LINE testing. Never tunnel the full development server.
const http = require('node:http');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const allowed = (req.method === 'GET' && (pathname === '/driver/leave' || pathname.startsWith('/_next/static/') || pathname === '/favicon.ico')) ||
    (['GET', 'POST'].includes(req.method) && pathname === '/api/driver/leaves');
  if (!allowed) { res.writeHead(404); res.end('Not found'); return; }
  const headers = { ...req.headers, host: '127.0.0.1:3100' };
  delete headers.cookie;
  delete headers['x-middleware-subrequest'];
  const upstream = http.request({ hostname: '127.0.0.1', port: 3100, path: req.url, method: req.method, headers }, response => {
    const outgoing = { ...response.headers, 'cache-control': 'no-store' };
    delete outgoing['set-cookie'];
    res.writeHead(response.statusCode || 502, outgoing); response.pipe(res);
  });
  upstream.setTimeout(30000, () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Local server unavailable'); });
  req.pipe(upstream);
});
server.listen(3101, '127.0.0.1', () => console.log('Driver leave gateway: http://127.0.0.1:3101'));
