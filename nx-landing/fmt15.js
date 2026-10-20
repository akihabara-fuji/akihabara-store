function nxFmt(seg) {
  var BLK = /<(p|ul|ol|h[1-6]|figure|blockquote)\b[^>]*>[\s\S]*?<\/\1>/g;
  var NUM = /^<p>\s*(\d{1,2})[.)]\s+([\s\S]*?)<\/p>$/;
  var BUL = /^<p>\s*(?:[•●▪–—+]|\*(?!\*))\s+([\s\S]*?)<\/p>$/;
  var blocks = [], m;
  while ((m = BLK.exec(seg))) blocks.push({ s: m.index, e: m.index + m[0].length, t: m[0] });
  var plain = function (t) { return t.replace(/<[^>]+>/g, "").trim(); };
  var ital = function (t) { return t.replace(/(^|[\s(>])\*([^*\s<][^*<]*?)\*(?=[\s).,;:!?<]|$)/g, "$1<em>$2</em>"); };
  var out = "", cur = 0, i = 0;
  while (i < blocks.length) {
    var b = blocks[i], mn = b.t.match(NUM), mb = mn ? null : b.t.match(BUL), rep = null, n = 1;
    if (mn || mb) {
      var re = mn ? NUM : BUL, run = [];
      while (i + run.length < blocks.length && re.test(blocks[i + run.length].t)) run.push(blocks[i + run.length].t.match(re));
      n = run.length;
      if (mn && n === 1) {
        var txt = plain(run[0][2]);
        rep = (txt.length <= 110 && !/[.!?:]$/.test(txt)) ? '<h3 class="nx-step"><span>' + run[0][1] + '</span> ' + run[0][2] + '</h3>' : b.t;
      } else {
        var tag = mn ? "ol" : "ul";
        rep = "<" + tag + ">" + run.map(function (r) { return "<li>" + ital(mn ? r[2] : r[1]) + "</li>"; }).join("") + "</" + tag + ">";
      }
    } else {
      var mq = b.t.match(/^<p>\s*&gt;\s+([\s\S]*?)<\/p>$/), mh = b.t.match(/^<p>\s*(#{1,3})\s+([\s\S]*?)<\/p>$/);
      if (mq) rep = "<blockquote><p>" + ital(mq[1]) + "</p></blockquote>";
      else if (mh) rep = "<h" + (mh[1].length >= 3 ? 3 : 2) + ">" + mh[2] + "</h" + (mh[1].length >= 3 ? 3 : 2) + ">";
      else if (/^<p>/.test(b.t)) rep = ital(b.t);
    }
    var last = blocks[i + n - 1];
    out += seg.slice(cur, b.s) + (rep === null ? b.t : rep); cur = last.e; i += n;
  }
  return out + seg.slice(cur);
}
if (typeof module !== "undefined") module.exports = nxFmt;
