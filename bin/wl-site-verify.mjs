#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from '../src/shared/parse-args.mjs';

function usage() {
  console.error(`Usage: wl-site-verify --dir <staticDir> [--build "<cmd>"] [--routes <paths...>] [--out <screenshotDir>] [--viewports desktop,mobile]

Serves --dir on an ephemeral port, requests each route (default /), fails on non-200 or console/page errors.
Screenshots require optional peer dependency "playwright".`);
}

const { flags } = parseArgs(process.argv.slice(2));
if (flags.help) {
  usage();
  process.exit(0);
}

const root = path.resolve(
  typeof flags.root === 'string' ? flags.root : process.cwd(),
);
const dirRel = typeof flags.dir === 'string' ? flags.dir : '';
if (!dirRel) {
  usage();
  process.exit(2);
}
const staticDir = path.resolve(root, dirRel);
const buildCmd = typeof flags.build === 'string' ? flags.build : null;
const routes = /** @type {string[]} */ (
  flags.routes?.length ? flags.routes : ['/']
);
const outDir = typeof flags.out === 'string' ? path.resolve(root, flags.out) : null;
const viewportSpec =
  typeof flags.viewports === 'string'
    ? flags.viewports.split(',').map((s) => s.trim()).filter(Boolean)
    : ['desktop'];

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
};

function runBuild(cmd, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true, cwd, stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build command exited with code ${code}`));
    });
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };
  return map[ext] ?? 'application/octet-stream';
}

function createStaticServer(dir) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      let reqPath = decodeURIComponent(url.pathname);
      if (reqPath.endsWith('/')) reqPath += 'index.html';
      const filePath = path.join(dir, reqPath);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(dir))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      let stat;
      try {
        stat = await fs.stat(resolved);
      } catch {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      if (stat.isDirectory()) {
        const index = path.join(resolved, 'index.html');
        try {
          await fs.access(index);
          const body = await fs.readFile(index);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(body);
        } catch {
          res.writeHead(404);
          res.end('Not found');
        }
        return;
      }
      const body = await fs.readFile(resolved);
      res.writeHead(200, { 'Content-Type': contentType(resolved) });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end('Server error');
    }
  });
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium ?? mod.default?.chromium;
  } catch {
    return null;
  }
}

async function verifyWithPlaywright(baseUrl, routes, screenshotDir) {
  const chromium = await loadPlaywright();
  if (screenshotDir && !chromium) {
    console.error(
      'wl-site-verify: --out requested but playwright is not installed. Add playwright as a devDependency in the consumer repo.',
    );
    process.exit(1);
  }

  const browser = chromium ? await chromium.launch() : null;
  let hadError = false;

  try {
    for (const route of routes) {
      const url = new URL(route, baseUrl).href;
      if (browser) {
        const page = await browser.newPage();
        const pageErrors = [];
        const consoleErrors = [];
        page.on('pageerror', (err) => pageErrors.push(String(err)));
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        const response = await page.goto(url, { waitUntil: 'networkidle' });
        const status = response?.status() ?? 0;
        if (status !== 200) {
          console.error(`${url}: HTTP ${status} — Fix: ensure route builds and returns 200.`);
          hadError = true;
        }
        if (pageErrors.length) {
          for (const e of pageErrors) {
            console.error(`${url}: page error ${e}`);
          }
          hadError = true;
        }
        if (consoleErrors.length) {
          for (const e of consoleErrors) {
            console.error(`${url}: console error ${e}`);
          }
          hadError = true;
        }
        if (screenshotDir) {
          await fs.mkdir(screenshotDir, { recursive: true });
          const safeName = route.replace(/\//g, '_') || '_root';
          for (const vp of viewportSpec) {
            const size = VIEWPORTS[vp] ?? VIEWPORTS.desktop;
            await page.setViewportSize(size);
            await page.screenshot({
              path: path.join(screenshotDir, `${safeName}-${vp}.png`),
            });
          }
        }
        await page.close();
      } else {
        const res = await fetch(url);
        if (res.status !== 200) {
          console.error(`${url}: HTTP ${res.status} — Fix: ensure route builds and returns 200.`);
          hadError = true;
        }
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  return !hadError;
}

async function main() {
  if (buildCmd) {
    await runBuild(buildCmd, root);
  }
  const server = createStaticServer(staticDir);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('No server address');
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  const ok = await verifyWithPlaywright(baseUrl, routes, outDir);
  await new Promise((res) => server.close(() => res()));
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});