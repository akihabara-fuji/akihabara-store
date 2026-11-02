const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Studio UI exposes persistent content queue and version editor', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'studio.html'), 'utf8');
  for (const marker of ['Content queue', 'queueCard', 'editorModal', 'openEditor', 'saveVersion']) assert.match(html, new RegExp(marker));
});
