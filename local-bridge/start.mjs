#!/usr/bin/env node
/** AI Video Maker — safe local launcher. Loads local .env values, then starts server.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(root, '.env');

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

if (fs.existsSync(envFile)) Object.assign(process.env, parseEnv(fs.readFileSync(envFile, 'utf8')));
function resolveFromRoot(value) { return path.isAbsolute(value) ? value : path.resolve(root, value); }
process.env.AIVM_MEDIA_ROOT = resolveFromRoot(process.env.AIVM_MEDIA_ROOT || './media');
process.env.AIVM_OUTPUT_ROOT = resolveFromRoot(process.env.AIVM_OUTPUT_ROOT || './exports');
process.env.AIVM_COMFYUI_URL ||= 'http://127.0.0.1:8188';

for (const dir of [process.env.AIVM_MEDIA_ROOT, process.env.AIVM_OUTPUT_ROOT]) fs.mkdirSync(dir, { recursive: true });

console.log('AI Video Maker local bridge');
console.log(`Media: ${process.env.AIVM_MEDIA_ROOT}`);
console.log(`Exports: ${process.env.AIVM_OUTPUT_ROOT}`);
console.log(`ComfyUI: ${process.env.AIVM_COMFYUI_URL}`);
console.log('Cost mode: $0 / local only');
console.log('Starting loopback bridge…');

const child = spawn(process.execPath, [path.join(root, 'server.mjs')], { stdio: 'inherit', env: process.env });
child.on('exit', code => process.exit(code ?? 0));
child.on('error', error => { console.error(`Could not start local bridge: ${error.message}`); process.exit(1); });
