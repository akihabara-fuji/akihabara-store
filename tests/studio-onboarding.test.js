const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Studio UI contains the onboarding flow and Bleam-inspired workspace sections', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'studio.html'), 'utf8');
  for (const marker of ['onboarding', 'Brand kit', 'Content queue', 'Asset library', 'Integrations']) {
    assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(html, /function openOnboarding/);
  assert.match(html, /function completeOnboarding/);
});
