import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const harnessRoot = path.resolve('skills/clone-website/assets/website-cloner');

test('website-cloner smoke scaffold is distributed inside its owning skill', () => {
  expect(fs.existsSync(path.join(harnessRoot, 'scripts', 'validate-site.mjs'))).toBe(true);
  expect(fs.existsSync(path.join(harnessRoot, 'site', 'index.html'))).toBe(true);
});

test('website-cloner harness validates its static smoke artifact', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-cloner-harness-'));
  copyDirectory(harnessRoot, targetDir);

  const output = execFileSync(process.execPath, ['scripts/validate-site.mjs'], {
    cwd: targetDir,
    encoding: 'utf8',
  });

  expect(output).toContain('Website cloner harness validation passed.');
});

test('website-cloner static server rejects sibling path traversal', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-cloner-harness-'));
  copyDirectory(harnessRoot, targetDir);
  fs.mkdirSync(path.join(targetDir, 'site2'));
  fs.writeFileSync(path.join(targetDir, 'site2', 'secret.txt'), 'outside root');

  const port = await getFreePort();
  const server = spawn(process.execPath, ['scripts/serve-static.mjs'], {
    cwd: targetDir,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(server);
    const status = await requestStatus(port, '/%2e%2e/site2/secret.txt');

    expect(status).toBe(403);
  } finally {
    server.kill();
  }
});

function copyDirectory(source: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Expected TCP address for test server')));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(server: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for static server')), 5000);
    server.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    server.stdout?.once('data', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function requestStatus(port: number, requestPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, '127.0.0.1', () => {
      socket.write(`GET ${requestPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let response = '';
    socket.setEncoding('utf8');
    socket.on('data', chunk => {
      response += chunk;
    });
    socket.once('error', reject);
    socket.once('end', () => {
      const match = response.match(/^HTTP\/1\.1 (\d+)/);
      resolve(match ? Number(match[1]) : 0);
    });
  });
}
