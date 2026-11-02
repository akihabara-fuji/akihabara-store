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
      res.on('end', () => { let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; } resolve({ status: res.statusCode, body }); });
    });
    req.on('error', reject); if (body) req.write(JSON.stringify(body)); req.end();
  });
}

test('content package can be fetched and edited into a new version', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const id = workspace.body.workspace.id;
  const created = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/packages`, { topic: 'kopi', payload: { caption: 'Versi awal' } });
  assert.equal(created.status, 201);
  const packageId = created.body.package.id;
  const edited = await request(ctx.port, 'POST', `/ms/studio/packages/${packageId}/versions`, { payload: { caption: 'Versi revisi' }, note: 'Perbaikan caption' });
  assert.equal(edited.status, 201);
  assert.equal(edited.body.version.versionNumber, 2);
  const versions = await request(ctx.port, 'GET', `/ms/studio/packages/${packageId}/versions`);
  assert.equal(versions.status, 200);
  assert.deepEqual(versions.body.versions.map(v => v.payload.caption), ['Versi awal', 'Versi revisi']);
});

test('package cannot be read or edited by another owner', async t => {
  const ctx = await start(); t.after(() => ctx.server.close());
  const workspace = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Brand' });
  const id = workspace.body.workspace.id;
  const created = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/packages`, { topic: 'kopi', payload: {} });
  const packageId = created.body.package.id;
  const response = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: ctx.port, method: 'GET', path: `/ms/studio/packages/${packageId}/versions`, headers: { 'x-nextaja-owner-id': 'bob' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end();
  });
  assert.equal(response, 404);
});
