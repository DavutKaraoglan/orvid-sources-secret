var SITE = "https://www.eporner.com";

function clean(s) {
  return util.unescape(s || "").replace(/&#039;/g, "'");
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var root = http.json(SITE + "/api/v2/video/search/?query=" + encodeURIComponent(query) + "&per_page=30&page=" + page
      + "&thumbsize=big&order=most-popular&format=json");
  var items = [];
  (root.videos || []).forEach(function (v) {
    if (!v.url || !/eporner\.com\/(?:video-|hd-porn\/)[A-Za-z0-9]+/.test(v.url)) return;
    items.push({
      url: v.url,
      title: clean(v.title),
      author: "",
      duration: v.length_sec,
      views: v.views,
      thumb: v.default_thumb && v.default_thumb.src,
      date: v.added
    });
  });
  return { items: items, next: page < (root.total_pages || 0) ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var title = html.match(/<h1[^>]*>([^<]+)/);
  var cap = env.tor ? 720 : 1080, best = -1, file = null;
  var re = /href="(\/dload\/[^"]+-(\d+)p\.mp4)"/g, m;
  while ((m = re.exec(html))) {
    var h = parseInt(m[2], 10);
    if (h <= cap && h > best) {
      best = h;
      file = SITE + m[1];
    }
  }
  if (!file) throw new Error("no stream");
  var cdn = http.check(file, { Referer: url }).location;
  return { url: cdn || file, hls: false, title: title ? clean(title[1].trim()) : "" };
}
