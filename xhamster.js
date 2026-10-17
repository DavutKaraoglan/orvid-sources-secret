var SITE = "https://xhamster.com";

function initials(html) {
  var m = /window\.initials\s*=\s*\{/.exec(html);
  if (!m) throw new Error("Captcha needed (xhamster page without data)");
  var start = m.index + m[0].length - 1, depth = 0, string = false;
  for (var i = start; i < html.length; i++) {
    var c = html.charAt(i);
    if (string) {
      if (c == "\\") i++;
      else if (c == "\"") string = false;
    } else if (c == "\"") string = true;
    else if (c == "{") depth++;
    else if (c == "}" && --depth == 0) return JSON.parse(html.substring(start, i + 1));
  }
  throw new Error("xhamster data is not JSON");
}

function generator(algo, seed) {
  var s = seed | 0;
  return function () {
    var r, x, e;
    switch (algo) {
      case 1:
        s = (Math.imul(s, 1664525) + 1013904223) | 0;
        r = s;
        break;
      case 2:
        x = s;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        s = x;
        r = x;
        break;
      case 3:
        s = (s + 0x9e3779b9) | 0;
        x = s;
        x ^= x >>> 16;
        x = Math.imul(x, 0x85ebca77);
        x ^= x >>> 13;
        x = Math.imul(x, 0xc2b2ae3d);
        r = x ^ (x >>> 16);
        break;
      case 4:
        s = (s + 0x6d2b79f5) | 0;
        x = s;
        x = (x << 7) | (x >>> 25);
        x = (x + 0x9e3779b9) | 0;
        x ^= x >>> 11;
        r = Math.imul(x, 0x27d4eb2d);
        break;
      case 5:
        x = s;
        x ^= x << 7;
        x ^= x >>> 9;
        x ^= x << 8;
        x = (x + 0xa5a5a5a5) | 0;
        s = x;
        r = x;
        break;
      case 6:
        s = (Math.imul(s, 0x2c9277b5) + 0xac564b05) | 0;
        x = s ^ (s >>> 18);
        r = x >>> ((s >>> 27) & 31);
        break;
      default:
        s = (s + 0x9e3779b9) | 0;
        e = s ^ (s << 5);
        e = Math.imul(e, 0x7feb352d);
        e ^= e >>> 15;
        r = Math.imul(e, 0x846ca68b);
    }
    return r & 0xff;
  };
}

function decipher(hex) {
  var data = [];
  for (var i = 0; i + 1 < hex.length; i += 2) data.push(parseInt(hex.substr(i, 2), 16));
  if (data.length < 6 || data[0] < 1 || data[0] > 7) return null;
  var next = generator(data[0], data[1] | data[2] << 8 | data[3] << 16 | data[4] << 24);
  var out = "";
  for (var j = 5; j < data.length; j++) out += String.fromCharCode((data[j] ^ next()) & 0xff);
  return out;
}

function plain(value) {
  if (!value) return null;
  if (/^[0-9a-fA-F]{12,}$/.test(value)) return decipher(value);
  var m = /^(https?:\/\/[^\/]+)\/([0-9a-fA-F]{12,})([\/,][^?#]+)(\?.*)?$/.exec(value);
  if (!m) return /^http/.test(value) ? value : null;
  var path = decipher(m[2]);
  return path == null ? null : m[1] + "/" + path + m[3] + (m[4] || "");
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var data = initials(http.get(SITE + "/search/" + encodeURIComponent(query) + (page > 1 ? "?page=" + page : "")));
  var result = data.searchResult;
  if (!result) throw new Error("Captcha needed (xhamster page without results)");
  var items = [];
  (result.videoThumbProps || []).forEach(function (v) {
    if (!v.pageURL || !/xhamster\d*\.(?:com|one|desi)\/videos\//.test(v.pageURL)) return;
    items.push({
      url: v.pageURL,
      title: v.title || "",
      author: (v.landing && v.landing.name) || "",
      duration: v.duration,
      views: v.views,
      thumb: v.thumbURL || v.imageURL,
      date: v.created > 0 ? v.created : undefined
    });
  });
  var p = result.pagination || {};
  var max = p.maxPage || p.pageCount || page + 1;
  return { items: items, next: items.length && page < max ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var data = initials(html);
  if (!data.xplayerSettings) throw new Error("Captcha needed (xhamster page without player)");
  var hls = (data.xplayerSettings.sources || {}).hls || {};
  var picks = [hls.url, hls.fallback];
  ["h264", "av1"].forEach(function (c) { if (hls[c]) picks.push(hls[c].url, hls[c].fallback); });
  var stream = null;
  for (var i = 0; i < picks.length && !stream; i++) stream = plain(picks[i]);
  if (!stream) throw new Error("no stream");
  var model = data.videoModel || {};
  var title = model.title;
  if (!title) {
    var t = /<title>([^<]*)<\/title>/.exec(html);
    title = t ? t[1].replace(/\s*[|-]\s*xHamster.*$/, "").trim() : "";
  }
  var out = { url: stream, hls: true, title: title, author: (model.author && model.author.name) || "", referer: url };
  if (model.spriteURL && model.spriteCount > 0) {
    out.sprite = { url: model.spriteURL, width: 320, height: 180, cols: model.spriteCount, rows: 1, count: model.spriteCount };
  }
  return out;
}
