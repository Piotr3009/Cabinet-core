#!/usr/bin/env node
// ─── THE SILENT SHOWROOM, SERVED (turn 23, CLAUDE.md R8) ────────────────────
//
// A static file server over `test/fixtures/hardware-local/`, so the acceptance
// walk can point the app at synthetic hardware with one `localStorage` key and
// prove pose, mirror, swing and finish in a container whose egress policy
// answers `403 CONNECT` to the real bucket.
//
// It is deliberately a SEPARATE ORIGIN from the app: the models are fetched by
// `GLTFLoader`, exactly as they are fetched from Supabase Storage, so the
// cross-origin request and its CORS headers are part of what is being proved.
// A fixture served from the app's own origin would be testing a path the
// browser does not take in production.
//
// Zero dependencies — node's own `http`, as every script in this folder is.
//
//     node scripts/fixture-server.mjs [--port 4174] [--root <dir>]

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ROOT = argOf('--root', join(HERE, '..', 'test', 'fixtures', 'hardware-local'));
const PORT = Number(argOf('--port', 4174));

const TYPES = {
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.md': 'text/markdown',
};

export function startFixtureServer({ root = ROOT, port = PORT } = {}) {
  const server = createServer((req, res) => {
    // Same-origin is not what production does, so the headers a bucket sends
    // are the headers this sends.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // No `..` out of the showroom, however the request is spelled.
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    try {
      const stat = statSync(file);
      if (!stat.isFile()) throw new Error('not a file');
      const ext = file.slice(file.lastIndexOf('.'));
      res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not in the showroom');
    }
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({
      server, port, url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => { server.close(r); }),
    }));
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const started = await startFixtureServer();
  process.stdout.write(`the silent showroom is at ${started.url}\n  root ${ROOT}\n`);
}
