import assert from 'node:assert/strict';
import { diagnostics, routeKind } from '../local-bridge/hardware-diagnostics.mjs';

const report = await diagnostics();
assert.equal(report.status, 'ready');
assert.ok(report.cpu && Number(report.cpu.cores) >= 1);
assert.ok(report.memory && Number(report.memory.totalGb) > 0);
assert.ok(report.capabilities.local_image);
assert.ok(report.capabilities.local_video);
assert.ok(report.capabilities.assembly);
assert.ok(['local', 'hybrid', 'local-light', 'plan-only'].includes(report.recommendation));
for (const kind of ['image', 'video', 'voice', 'audio']) {
  const route = routeKind(kind, report);
  assert.ok(['local', 'remote', 'unavailable'].includes(route.provider));
  assert.equal(typeof route.reason, 'string');
}
console.log('hardware-routing smoke tests passed');
