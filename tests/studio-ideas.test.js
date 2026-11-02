const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { createStore } = require('../studio/store');
const { registerStudioRoutes } = require('../studio/api');

function start(aiClient) {
  const app = express();
  app.use(express.json());
  const store = createStore(':memory:');
  registerStudioRoutes(app, { store, aiClient, environment: 'test' });
  const server = http.createServer(app);
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}
function request(port, method, path, body, owner = 'alice') {
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

test('generate ideas stores a content package and consumes one quota unit', async t => {
  const aiClient = { completeJson: async () => ({ ideas: [{ title: 'Tips kopi pagi', hook: 'Kopi pahit terus?' }] }) };
  const ctx = await start(aiClient);
  t.after(() => ctx.server.close());
  const created = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Alice Brand', quota: 1 });
  const id = created.body.workspace.id;
  const response = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/ideas`, { topic: 'kopi', platform: 'instagram' });
  assert.equal(response.status, 201);
  assert.equal(response.body.package.ideas.length, 1);
  const usage = await request(ctx.port, 'GET', `/ms/studio/workspaces/${id}/usage`);
  assert.deepEqual(usage.body.usage, { used: 1, quota: 1, remaining: 0 });
});

test('generate ideas refuses when quota is exhausted and does not call AI', async t => {
  let calls = 0;
  const aiClient = { completeJson: async () => { calls += 1; return { ideas: [] }; } };
  const ctx = await start(aiClient);
  t.after(() => ctx.server.close());
  const created = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Alice Brand', quota: 1 });
  const id = created.body.workspace.id;
  await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/ideas`, { topic: 'kopi' });
  const response = await request(ctx.port, 'POST', `/ms/studio/workspaces/${id}/ideas`, { topic: 'teh' });
  assert.equal(response.status, 429);
  assert.equal(calls, 1);
});

test('generate ideas returns provider error without storing success', async t => {
  const aiClient = { completeJson: async () => { throw new Error('AI provider timeout'); } };
  const ctx = await start(aiClient);
  t.after(() => ctx.server.close());
  const created = await request(ctx.port, 'POST', '/ms/studio/workspaces', { name: 'Alice Brand', quota: 2 });
  const response = await request(ctx.port, 'POST', `/ms/studio/workspaces/${created.body.workspace.id}/ideas`, { topic: 'kopi' });
  assert.equal(response.status, 502);
  assert.match(response.body.error, /timeout/i);
});
