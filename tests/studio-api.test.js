const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { createStore } = require('../studio/store');
const { registerStudioRoutes } = require('../studio/api');

function start() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  const store = createStore(':memory:');
  registerStudioRoutes(app, { store, environment: 'test' });
  const server = http.createServer(app);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, store, port: server.address().port })));
}
async function request(port, method, path, body, owner = 'alice') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', 'x-nextaja-owner-id': owner } }, res => {
      let text = '';
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('studio API creates and returns only the current owner workspace', async t => {
  const ctx = await start();
  t.after(() => ctx.server.close());
  let response = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Alice Brand', quota: 2 });
  assert.equal(response.status, 201);
  const id = response.body.workspace.id;
  response = await request(ctx.port, 'PUT', `/ms/studio/workspaces/${id}/brand`, { businessName: 'Alice Coffee', category: 'food' });
  assert.equal(response.status, 200);
  response = await request(ctx.port, 'GET', '/ms/studio/workspaces');
  assert.equal(response.status, 200);
  assert.equal(response.body.workspaces.length, 1);
  assert.equal(response.body.workspaces[0].name, 'Alice Brand');
  response = await request(ctx.port, 'GET', `/ms/studio/workspaces/${id}/usage`);
  assert.deepEqual(response.body.usage, { used: 0, quota: 2, remaining: 2 });
});

test('studio API refuses access from another owner', async t => {
  const ctx = await start();
  t.after(() => ctx.server.close());
  const created = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Alice Brand' }, 'alice');
  const response = await request(ctx.port, 'GET', `/ms/studio/workspaces/${created.body.workspace.id}`, null, 'bob');
  assert.equal(response.status, 404);
});

test('studio API blocks development identity in production mode', async t => {
  const app = express();
  app.use(express.json());
  const store = createStore(':memory:');
  registerStudioRoutes(app, { store, environment: 'production' });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const response = await request(server.address().port, 'GET', '/ms/studio/workspaces');
  assert.equal(response.status, 401);
});
