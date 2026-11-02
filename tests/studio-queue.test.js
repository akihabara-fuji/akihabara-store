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
function request(port, method, path, body, owner = 'alice') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', 'x-nextaja-owner-id': owner } }, res => {
      let text = ''; res.on('data', c => { text += c; });
      res.on('end', () => { let parsed = {}; try { parsed = JSON.parse(text); } catch {} resolve({ status: res.statusCode, body: parsed }); });
    });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}

test('workspace can list saved packages and package details', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const id = workspace.body.workspace.id;
  const made = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/packages`, { topic: 'kopi', platform: 'instagram', payload: { caption: 'Awal' } });
  const list = await request(ctx.port, 'GET', `/ms/studio/workspaces/${id}/packages`);
  assert.equal(list.status, 200);
  assert.equal(list.body.packages.length, 1);
  const detail = await request(ctx.port, 'GET', `/ms/studio/packages/${made.body.package.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.package.payload.caption, 'Awal');
});

test('package details remain isolated from another owner', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const made = await request(ctx.port, 'POST', `/ms/studio/workspaces/${workspace.body.workspace.id}/packages`, { topic: 'kopi', payload: {} });
  const response = await request(ctx.port, 'GET', `/ms/studio/packages/${made.body.package.id}`, null, 'bob');
  assert.equal(response.status, 404);
});
