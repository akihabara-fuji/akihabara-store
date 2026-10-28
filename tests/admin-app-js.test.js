"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

/* Dua fungsi bernama sama di satu cakupan: yang terakhir menimpa yang pertama (hoisting). Itu yang membuat draf blog
   terbuka sebagai "Editor Halaman". Penjaga ini mencegah kejadian serupa. */
test("admin app.js: tidak ada fungsi bernama ganda, semua rute punya fungsi", () => {
  const s = fs.readFileSync(path.join(__dirname, "..", "admin-ca", "public", "app.js"), "utf8");
  const names = [...s.matchAll(/^\s*(?:async )?function (\w+)/gm)].map(m => m[1]);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepStrictEqual([...new Set(dup)], [], "fungsi ganda: " + dup.join(","));
  const routes = s.slice(s.indexOf("const ROUTES = ["), s.indexOf("const params ="));
  for (const m of routes.matchAll(/,\s*(p[A-Z]\w+)\s*[\]\)]/g)) assert.ok(names.includes(m[1]), "rute tanpa fungsi: " + m[1]);
  assert.match(routes, /posts\\\/\(\[a-f0-9\]\+\)\$\/, ED, m => pEditor\(m\[1\]\)/, "draf harus membuka pEditor artikel");
});
