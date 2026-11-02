const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../studio/store');
const { createAiClient } = require('../studio/ai-client');

test('workspace data is isolated between owners', () => {
  const store = createStore(':memory:');
  const alice = store.createWorkspace({ ownerId: 'alice', name: 'Brand Alice' });
  const bob = store.createWorkspace({ ownerId: 'bob', name: 'Brand Bob' });

  store.saveBrand(alice.id, { businessName: 'Alice Coffee' });
  store.saveBrand(bob.id, { businessName: 'Bob Studio' });

  assert.equal(store.getBrand(alice.id).businessName, 'Alice Coffee');
  assert.equal(store.getBrand(bob.id).businessName, 'Bob Studio');
  assert.equal(store.getWorkspacesForOwner('alice').length, 1);
  assert.equal(store.getWorkspacesForOwner('alice')[0].id, alice.id);
});

test('usage quota rejects calls after the workspace limit', () => {
  const store = createStore(':memory:');
  const workspace = store.createWorkspace({ ownerId: 'alice', name: 'Brand Alice', quota: 2 });

  assert.equal(store.consumeQuota(workspace.id, 'ideas'), true);
  assert.equal(store.consumeQuota(workspace.id, 'ideas'), true);
  assert.equal(store.consumeQuota(workspace.id, 'ideas'), false);
  assert.deepEqual(store.getUsage(workspace.id), { used: 2, quota: 2, remaining: 0 });
});

test('AI client rejects invalid JSON and returns parsed JSON for valid output', async () => {
  const invalid = createAiClient({ transport: async () => ({ status: 200, text: '{bad' }) });
  await assert.rejects(() => invalid.completeJson({ prompt: 'ideas' }), /invalid JSON/i);

  const valid = createAiClient({ transport: async () => ({ status: 200, text: '{"ideas":[]}' }) });
  assert.deepEqual(await valid.completeJson({ prompt: 'ideas' }), { ideas: [] });
});

test('AI client converts provider timeout into a bounded error', async () => {
  const client = createAiClient({ timeoutMs: 10, transport: async () => new Promise(() => {}) });
  await assert.rejects(() => client.completeJson({ prompt: 'ideas' }), /timeout/i);
});
