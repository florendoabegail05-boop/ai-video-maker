#!/usr/bin/env node
// Read-only local prerequisites check: no downloads, model calls or media writes.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {draftReadiness} from './readiness.mjs';

const exec = promisify(execFile);
export async function checkLocalSetup(env = process.env) {
  const entries = await Promise.all(['ffmpeg', 'ffprobe'].map(async name => {
    const command = env[`AIVM_${name.toUpperCase()}`] || name;
    try {
      const {stdout, stderr} = await exec(command, ['-version'], {timeout: 5000, windowsHide: true, maxBuffer: 1024 * 1024, env});
      const version = String(stdout || stderr).split(/\r?\n/)[0].trim();
      return [name, {command, available: version.toLowerCase().startsWith(`${name} version`), version}];
    } catch (error) {
      return [name, {command, available: false, version: null, error: String(error.code || 'FAILED')}];
    }
  }));
  const report = {
    node: process.version, platform: process.platform, costMode: 'FREE ONLY',
    tools: Object.fromEntries(entries), mock: env.AIVM_MOCK === '1',
    imageFallback: {enabled: env.AIVM_ENABLE_IMAGE_FALLBACK !== '0'},
    motionFallback: {enabled: env.AIVM_ENABLE_MOTION_FALLBACK !== '0'},
    // A read-only CLI check does not execute or certify a model workflow.
    freeOnlyImageWorkflow: false
  };
  return {...report, ...draftReadiness(report)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await checkLocalSetup();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`V2 local setup: ${report.ready ? 'basic draft prerequisites found' : 'setup needed'} · FREE ONLY`);
    console.log(`Node ${report.node} · ${report.platform}`);
    for (const [name, tool] of Object.entries(report.tools)) console.log(`${name}: ${tool.available ? tool.version : 'unavailable'} (${tool.command})`);
    for (const issue of report.issues) console.log(`- ${issue}`);
    console.log('Planning remains available. This check does not verify codecs, render quality or a local AI model. Use Check local bridge for live workflow capabilities.');
  }
  process.exitCode = report.ready ? 0 : 1;
}
