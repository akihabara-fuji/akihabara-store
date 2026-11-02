const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "views", "studio-editor.html"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "..", "public", "assets", "studio.js"), "utf8");
test("editor Studio: semua ID penting ada", () => {
  for (const id of ["file","clear","fmt","zoom","msg","tpl","head","sub","handle","acc","size","dl","cv","ov","topic","aud","hookGo","hooks","cHook","cPts","cGoal","capGo","capCopy","cOut","menuBtn","plat","schedBtn","promptTx","tb","rvStack","rvYes","rvNo","rvUndo","tabRv"])
    assert.ok(html.includes(`id="${id}"`), "hilang: " + id);
});
test("editor Studio: Polaroid jadi gaya default dan tombol Jadwalkan ada", () => {
  assert.match(html, /data-t="polaroid" aria-pressed="true"/);
  assert.match(html, /Jadwalkan/);
  assert.match(html, /Ceritakan post yang kamu mau/);
});
test("editor Studio: JS memuat fitur utama", () => {
  for (const k of ["autoLayout","smartCrop","autoStraight","rvDecide","ensureContrast","prefers-reduced-motion"]) assert.ok(js.includes(k), k);
});
