var SITE = "https://archivebate.com";
var MAX_MODELS = 2;
var WANTED = 12;
var PER_MODEL = 10;

function ajax(extra) {
  var h = { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" };
  for (var k in extra) h[k] = extra[k];
  return h;
}

function component(html, name) {
  var re = /wire:initial-data="([^"]+)"/g, m;
  while ((m = re.exec(html))) {
    var d = JSON.parse(util.unescape(m[1]));
    if (d.fingerprint && d.fingerprint.name === name) return d;
  }
  return null;
}

function modelVideos(username) {
  var page = http.page(SITE + "/profile/" + encodeURIComponent(username));
  var token = /csrf-token" content="([^"]+)"/.exec(page.body);
  var data = component(page.body, "profile.model-videos");
  if (!token || !data) return "";
  var body = JSON.stringify({
    fingerprint: data.fingerprint,
    serverMemo: data.serverMemo,
    updates: [{ type: "callMethod", payload: { id: "ab1", method: "load_profile_videos", params: [] } }]
  });
  var out = http.post(SITE + "/livewire/message/" + data.fingerprint.name, body, "application/json", {
    "X-Livewire": "true",
    "X-CSRF-TOKEN": token[1],
    Cookie: page.cookies,
    Referer: SITE + "/profile/" + username,
    Accept: "text/html, application/xhtml+xml"
  });
  var effects = JSON.parse(out).effects || {};
  return effects.html || "";
}

function cards(html, username, items, seen) {
  html.split('<section class="video_item">').slice(1).forEach(function (c) {
    var link = /href="https:\/\/archivebate\.com\/watch\/(\d+)"/.exec(c);
    if (!link || seen[link[1]]) return;
    seen[link[1]] = true;
    var thumb = /background-image:\s*url\('([^']+)'\)/.exec(c) || /poster="([^"]+)"/.exec(c);
    var dur = /<\/svg>\s*([0-9:]+)\s*<\/span>/.exec(c);
    var meta = /<p>([\s\S]*?)<\/p>/.exec(c);
    var parts = meta ? meta[1].split("&middot;") : [];
    var platform = parts.length > 1 ? parts[1].trim() : "";
    var views = parts.length > 2 ? /([\d,.]+)/.exec(parts[2]) : null;
    items.push({
      url: SITE + "/watch/" + link[1],
      title: username + (platform ? " (" + platform + ")" : ""),
      author: username,
      duration: dur ? util.duration(dur[1]) : 0,
      views: views ? util.number(views[1]) : 0,
      thumb: thumb ? thumb[1] : "",
      date: parts.length ? parts[0].trim() : ""
    });
  });
}

function search(query, next) {
  if (next) return { items: [], next: null };
  var found = http.json(SITE + "/api/v1/search?query=" + encodeURIComponent(query), ajax({ Referer: SITE + "/" }));
  var names = [];
  (found.data || []).forEach(function (m) {
    if (m.username && names.indexOf(m.username) < 0) names.push(m.username);
  });
  var items = [], seen = {};
  names.slice(0, MAX_MODELS).forEach(function (n) {
    if (items.length >= WANTED) return;
    try {
      var batch = [];
      cards(modelVideos(n), n, batch, seen);
      batch = batch.slice(0, PER_MODEL);
      var pages = http.all(batch.map(function (b) { return b.url; }), { Referer: SITE + "/" });
      batch.forEach(function (b, i) {
        if (pages[i] === null || playable(pages[i])) items.push(b);
      });
    } catch (e) {
      if (!items.length) throw e;
    }
  });
  return { items: items, next: null };
}

function playable(html) {
  return !/This video has been deleted/.test(html) && /<iframe[^>]+src="https?:\/\/(?:mixdrop|mxdrop)[^"]*\/e\//.test(html);
}

function unpack(src) {
  var m = /\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/.exec(src);
  if (!m) return "";
  var radix = parseInt(m[2], 10), count = parseInt(m[3], 10), words = m[4].split("|");
  var digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function code(n) {
    return (n < radix ? "" : code(Math.floor(n / radix))) + digits.charAt(n % radix);
  }
  var table = {};
  for (var i = count - 1; i >= 0; i--) table[code(i)] = words[i] || code(i);
  return m[1].replace(/\\'/g, "'").replace(/\b\w+\b/g, function (w) {
    return table.hasOwnProperty(w) ? table[w] : w;
  });
}

function resolve(url) {
  var page = http.get(url);
  if (/This video has been deleted/.test(page)) throw new Error("video unavailable");
  var embed = /<iframe[^>]+src="(https?:\/\/(?:mixdrop|mxdrop)[^"]*\/e\/[A-Za-z0-9]+)"/.exec(page);
  if (!embed) throw new Error("no stream");
  var title = /<title>([^<]*?)(?:,\s*Archivebate)?\s*<\/title>/.exec(page);
  var player = http.page(embed[1], { Referer: SITE + "/" });
  var file = /MDCore\.wurl="([^"]+)"/.exec(unpack(player.body));
  if (!file) throw new Error("no stream");
  var origin = /^(https?:\/\/[^\/]+)/.exec(player.url);
  return {
    url: file[1].indexOf("//") === 0 ? "https:" + file[1] : file[1],
    hls: false,
    title: title ? util.unescape(title[1]).trim() : "",
    referer: origin ? origin[1] + "/" : SITE + "/"
  };
}
