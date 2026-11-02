const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Studio UI exposes workflow filter and package status actions', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'studio.html'), 'utf8');
  for (const marker of ['queueStatusFilter', 'updatePackageStatus', 'status-action', 'Menunggu review']) assert.match(html, new RegExp(marker));
});
