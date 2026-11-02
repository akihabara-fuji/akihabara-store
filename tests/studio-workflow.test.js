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
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}

test('package workflow updates status and filters the queue', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const id = workspace.body.workspace.id;
  const made = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/packages`, { topic: 'kopi', platform: 'instagram', payload: { caption: 'Awal' } });
  const updated = await request(ctx.port, 'PATCH', `/ms/studio/packages/${made.body.package.id}/status`, { status: 'approved' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.package.status, 'approved');
  const filtered = await request(ctx.port, 'GET', `/ms/studio/workspaces/${id}/packages?status=approved`);
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.packages.length, 1);
  const empty = await request(ctx.port, 'GET', `/ms/studio/workspaces/${id}/packages?status=draft`);
  assert.equal(empty.body.packages.length, 0);
});

test('workflow rejects invalid status and another owner cannot update', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const made = await request(ctx.port, 'POST', `/ms/studio/workspaces/${workspace.body.workspace.id}/packages`, { topic: 'kopi', payload: {} });
  const bad = await request(ctx.port, 'PATCH', `/ms/studio/packages/${made.body.package.id}/status`, { status: 'published' });
  assert.equal(bad.status, 400);
  const foreign = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: ctx.port, method: 'PATCH', path: `/ms/studio/packages/${made.body.package.id}/status`, headers: { 'content-type': 'application/json', 'x-nextaja-owner-id': 'bob' } }, res => { let s=''; res.on('data', c=>s+=c); res.on('end', ()=>resolve({ status: res.statusCode, body: JSON.parse(s) })); });
    req.on('error', reject); req.write(JSON.stringify({ status: 'review' })); req.end();
  });
  assert.equal(foreign.status, 404);
});
