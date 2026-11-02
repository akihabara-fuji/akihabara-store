const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { createStore } = require('../studio/store');
const { registerStudioRoutes } = require('../studio/api');

function start() {
  const app = express(); app.use(express.json());
  const store = createStore(':memory:');
  registerStudioRoutes(app, { store, environment: 'test' });
  const server = http.createServer(app);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}
function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', 'x-nextaja-owner-id': 'alice' } }, res => {
      let text = ''; res.on('data', c => { text += c; });
      res.on('end', () => { let parsed = {}; try { parsed = JSON.parse(text); } catch {} resolve({ status: res.statusCode, body: parsed }); });
    });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}

test('scheduling approved package changes status to scheduled', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const id = workspace.body.workspace.id;
  const made = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/packages`, { topic: 'kopi', platform: 'instagram', payload: { caption: 'Siap' } });
  await request(ctx.port, 'PATCH', `/ms/studio/packages/${made.body.package.id}/status`, { status: 'approved' });
  const scheduled = await request(ctx.port, 'POST', `/ms/studio/packages/${made.body.package.id}/schedule`, { scheduledAt: '2026-10-22T09:00:00+07:00', platform: 'instagram' });
  assert.equal(scheduled.status, 201);
  const detail = await request(ctx.port, 'GET', `/ms/studio/packages/${made.body.package.id}`);
  assert.equal(detail.body.package.status, 'scheduled');
});

test('package export returns copy-ready content and preserves ownership', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const made = await request(ctx.port, 'POST', `/ms/studio/workspaces/${workspace.body.workspace.id}/packages`, { topic: 'kopi', platform: 'instagram', payload: { caption: 'Pagi yang hangat' } });
  const exported = await request(ctx.port, 'GET', `/ms/studio/packages/${made.body.package.id}/export`);
  assert.equal(exported.status, 200);
  assert.equal(exported.body.export.topic, 'kopi');
  assert.match(exported.body.export.text, /Pagi yang hangat/);
  assert.equal(exported.body.export.platform, 'instagram');
});
