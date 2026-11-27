// Local preview of dist/ at http://localhost:8080 (same paths as on the server). node scripts/serve.mjs [port]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const DIST = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist'), PORT = +process.argv[2] || 8080;
const TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain'};
http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    if (!req.url.split('?')[0].endsWith('/')) { res.writeHead(301, {Location: req.url.replace(/(\?|$)/, '/$1')}).end(); return; }
    p = path.join(p, 'index.html');
  }
  if (!fs.existsSync(p)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, {'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`dist/ → http://localhost:${PORT}`));
