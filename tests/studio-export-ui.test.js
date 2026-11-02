const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Studio UI exposes export and copy actions', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'studio.html'), 'utf8');
  for (const marker of ['exportPackage', 'Export / copy', 'editorPayload', 'navigator.clipboard']) assert.match(html, new RegExp(marker));
});
