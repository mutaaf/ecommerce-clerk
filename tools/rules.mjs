/* The house rules from CLAUDE.md, as a check that fails a build.

   Only the rules a machine can actually decide are here. The ones it
   cannot (voice, whether a number is real, whether the demo sits below
   the problem) stay a human's job and are not faked with a regex. */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', 'shots', '.git', '.vercel', '.baseline']);
const failures = [];

function walk(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk();
const rel = f => path.relative(ROOT, f);
const read = f => fs.readFileSync(f, 'utf8');
const by = (...exts) => files.filter(f => exts.includes(path.extname(f)));

function fail(rule, file, line, detail) {
  failures.push({ rule, where: line ? `${rel(file)}:${line}` : rel(file), detail });
}

function eachLine(file, fn) {
  read(file).split('\n').forEach((text, i) => fn(text, i + 1));
}

/* 1. No em dashes. Anywhere. Copy, comments, docs.
      Built from code points so this file does not trip its own rule. */
const DASHES = new RegExp('[' + String.fromCharCode(0x2014, 0x2013) + ']');
const PROSE = by('.html', '.js', '.mjs', '.ts', '.css', '.md', '.json');
for (const f of PROSE) {
  if (rel(f) === 'CLAUDE.md') continue;              /* the rulebook quotes the character */
  eachLine(f, (text, n) => {
    if (DASHES.test(text)) fail('no em dashes', f, n, text.trim().slice(0, 72));
  });
}

/* 2, 3, 4. No colour, font or shadow named outside styles/tokens.css. */
const TOKENS = path.join(ROOT, 'styles/tokens.css');
for (const f of [...by('.css'), ...by('.js', '.mjs'), ...by('.html')]) {
  if (f === TOKENS) continue;
  if (rel(f).startsWith('tools/') || rel(f).startsWith('platform/')) continue;  /* not the site */
  eachLine(f, (text, n) => {
    const hex = text.match(/#[0-9A-Fa-f]{3,8}\b/g);
    /* an id selector or a url fragment is not a colour */
    const colours = (hex || []).filter(h => /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{8}$/.test(h) && !/href=|id=|url\(/.test(text));
    for (const c of colours) fail('colour outside tokens.css', f, n, c);

    if (/font-family\s*:/.test(text) && !/var\(--/.test(text)) {
      fail('font outside tokens.css', f, n, text.trim().slice(0, 72));
    }
    const shadow = text.match(/box-shadow\s*:\s*([^;}]*)/);
    if (shadow && !/var\(--/.test(shadow[1]) && !/^\s*(none|inset 0 0 0)/.test(shadow[1])) {
      fail('shadow outside tokens.css', f, n, shadow[1].trim().slice(0, 60));
    }
  });
}

/* 5. Content is rendered with innerHTML, so content must never carry
      anything executable. Formatting tags are fine, script is not. */
const DANGEROUS = /<script|<iframe|<object|<embed|\son[a-z]+\s*=|javascript:/i;
for (const f of files.filter(f => rel(f).startsWith('content/'))) {
  eachLine(f, (text, n) => {
    if (DANGEROUS.test(text)) fail('executable markup in content', f, n, text.trim().slice(0, 72));
  });
}

/* 6. Both pages keep the landmarks the accessibility pass added. */
for (const page of ['index.html', 'platform.html']) {
  const src = read(path.join(ROOT, page));
  if (!/<main\b/.test(src))            fail('missing main landmark', path.join(ROOT, page), 0, page);
  if (!/class="skip"/.test(src))       fail('missing skip link', path.join(ROOT, page), 0, page);
  if (!/rel="stylesheet" href="styles\/tokens\.css"/.test(src)) fail('tokens.css not linked first', path.join(ROOT, page), 0, page);
}

/* 7. The merchant page carries no system identifiers. Those live only on
      the platform page. */
const IDENTIFIERS = /\b(ai_session_id|recommendation_id|conversation_id|cart_id|merchant_id|attribution_source)\b/;
const merchantSurface = ['index.html', 'content/merchant.js', 'content/brand.js', 'content/demos.js'];
for (const r of merchantSurface) {
  const f = path.join(ROOT, r);
  if (!fs.existsSync(f)) continue;
  eachLine(f, (text, n) => {
    if (IDENTIFIERS.test(text)) fail('identifier on the merchant surface', f, n, text.trim().slice(0, 72));
  });
}

/* ---------- report ---------- */
const rules = [...new Set(failures.map(f => f.rule))];
if (!failures.length) {
  console.log('house rules: all checks pass');
  process.exit(0);
}
console.error(`house rules: ${failures.length} violation(s) across ${rules.length} rule(s)\n`);
for (const rule of rules) {
  console.error(`  ${rule}`);
  for (const f of failures.filter(x => x.rule === rule)) console.error(`    ${f.where}  ${f.detail}`);
  console.error('');
}
process.exit(1);
