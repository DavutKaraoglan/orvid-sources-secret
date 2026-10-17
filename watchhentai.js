var SITE = "https://watchhentai.net";
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var q = encodeURIComponent(query);
  var html = http.get(page > 1 ? SITE + "/page/" + page + "/?s=" + q : SITE + "/?s=" + q);
  var re = /<article\b[^>]*>([\s\S]*?)<\/article>/g, m, items = [], seen = {};
  while ((m = re.exec(html))) {
    var b = m[1];
    var link = /href="(https:\/\/watchhentai\.net\/(?:series|videos)\/[^"]+)"/.exec(b);
    if (!link || seen[link[1]]) continue;
    seen[link[1]] = true;
    var title = /\btitle="([^"]+)"/.exec(b) || /\balt="([^"]+)"/.exec(b);
    if (!title) continue;
    var thumb = /data-src="(https:\/\/[^"]+\.(?:jpe?g|webp|png))"/.exec(b) || /\bsrc="(https:\/\/[^"]+\.(?:jpe?g|webp|png))"/.exec(b);
    items.push({ url: link[1], title: util.unescape(title[1]), author: "", duration: -1, thumb: thumb ? thumb[1] : null });
  }
  return { items: items, next: items.length && html.indexOf("/page/" + (page + 1) + "/?s=") >= 0 ? String(page + 1) : null };
}

function bytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/").replace(/[^A-Za-z0-9+\/]/g, "");
  var out = [], bits = 0, value = 0;
  for (var i = 0; i < s.length; i++) {
    value = (value << 6) | B64.indexOf(s.charAt(i));
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 255);
    }
  }
  return out;
}

function decode(file) {
  var x = bytes(file), r = "";
  for (var i = 0; i < x.length; i++) r += String.fromCharCode(x[i] ^ ((13 + i % 17) & 255));
  var y = bytes(r.split("").reverse().join("")), out = "";
  for (var j = 0; j < y.length; j++) out += String.fromCharCode(y[j]);
  return out;
}

function resolve(url) {
  if (url.indexOf("/series/") >= 0) {
    var series = http.get(url);
    var first = /tv-single-hero__watch" href="([^"]+)"/.exec(series) || /href="(https:\/\/watchhentai\.net\/videos\/[^"]+)"/.exec(series);
    if (!first) throw new Error("no episode");
    url = first[1];
  }
  var html = http.get(url);
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html);
  var player = /data-primary-player-url="([^"]+)"/.exec(html) || /data-alternate-player-url="([^"]+)"/.exec(html);
  if (!player) throw new Error("no player");
  var p = http.get(player[1], { Referer: url });
  var list = /var whJwSources = (\[[\s\S]*?\]);/.exec(p);
  if (!list) throw new Error("no stream");
  var sources = JSON.parse(list[1]);
  var cap = typeof env == "undefined" || env.tor ? 720 : 1080, best = -1, file = null, other = null, lowest = 1e9, smallest = null;
  for (var i = 0; i < sources.length; i++) {
    var u = decode(sources[i].file);
    if (u.indexOf("http") != 0) continue;
    var h = parseInt(sources[i].label, 10) || 480;
    if (h <= cap && h > best) {
      if (file) other = file;
      best = h;
      file = u;
    } else if (!other) other = u;
    if (h < lowest) {
      lowest = h;
      smallest = u;
    }
  }
  file = file || smallest;
  if (!file) throw new Error("no stream");
  var out = { url: file, hls: false, referer: SITE + "/", title: title ? util.unescape(title[1]).replace(/\s+-\s+Watch Hentai$/, "") : "" };
  if (other && other != file) out.fallback = { url: other, hls: false };
  return out;
}
