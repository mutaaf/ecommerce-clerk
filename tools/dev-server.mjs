/* Static files plus the serverless function, so the whole path can be run
   and tested locally exactly as it behaves in production.

   It also applies the response headers from vercel.json, which is what
   makes local identical to the deployment: the content security policy
   and the cache rules are exercised by every screenshot, axe run and
   Lighthouse run rather than being discovered after a deploy.

     node tools/dev-server.mjs [port] */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import handler from '../api/parse-intent.js';

const PORT = +(process.argv[2] || process.env.PORT || 8123);
const ROOT = process.cwd();
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json' };

/* vercel.json is the single source of truth for headers. Its `source` is a
   path pattern, so it is turned into a regular expression once at boot. */
const RULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers ?? [];
const MATCHERS = RULES.map(rule => ({
  re: new RegExp('^' + rule.source
        .replace(/\((\.\*)\)/g, '(?:$1)')
        .replace(/\.html$/, '\\.html')
        .replace(/\/favicon\.svg/, '/favicon\\.svg') + '$'),
  headers: rule.headers
}));

function applyHeaders(res, pathname) {
  for (const m of MATCHERS) {
    if (!m.re.test(pathname)) continue;
    for (const h of m.headers) res.setHeader(h.key, h.value);
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  applyHeaders(res, url.pathname);

  if (url.pathname === '/api/parse-intent') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    req.body = raw;
    return handler(req, res);
  }

  const rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(buf);
  });
}).listen(PORT, () => console.log(
  `clerk on http://localhost:${PORT}\n` +
  `  headers: ${MATCHERS.length} rules from vercel.json\n` +
  `  api key: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'unset, the scripted fallback will answer'}`));
