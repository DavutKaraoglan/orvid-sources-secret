var SITE = "https://www.tube8.com";

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var html = http.get(SITE + "/searches.html/?q=" + encodeURIComponent(query) + (page > 1 ? "&page=" + page : ""));
  var items = [];
  var seen = {};
  var cards = html.split('<article class="video-box');
  for (var i = 1; i < cards.length; i++) {
    var b = cards[i];
    var id = b.match(/href="\/porn-video\/(\d+)\//);
    if (!id || seen[id[1]]) continue;
    seen[id[1]] = true;
    var title = b.match(/class="video-title-text[^"]*"[^>]*>\s*<span>([^<]+)<\/span>/);
    var author = b.match(/class="author-title-text[^"]*"[^>]*>([^<]+)</);
    var dur = b.match(/video-duration[^>]*>\s*<span>\s*([0-9:]+)\s*<\/span>/);
    var views = b.match(/Views: <\/span>([^<]+)</);
    var thumb = b.match(/data-src="(https:\/\/[^"]+)"/);
    items.push({
      url: SITE + "/porn-video/" + id[1] + "/",
      title: title ? util.unescape(title[1]).trim() : "",
      author: author ? util.unescape(author[1]).trim() : "",
      duration: dur ? util.duration(dur[1]) : -1,
      views: views ? util.number(views[1]) : -1,
      thumb: thumb ? util.unescape(thumb[1]) : null
    });
  }
  var more = html.indexOf("page=" + (page + 1)) >= 0;
  return { items: items, next: items.length && more ? String(page + 1) : null };
}

function resolve(url) {
  var id = url.match(/tube8\.com\/porn-video\/(\d+)/)[1];
  var p = http.page(SITE + "/porn-video/" + id + "/");
  if (p.status >= 400) throw new Error("video unavailable");
  var html = p.body;
  var m = html.match(/"format":"mp4","videoUrl":"([^"]+)"/);
  if (!m) throw new Error("video unavailable");
  var media = m[1].replace(/\\\//g, "/");
  if (media.indexOf("http") != 0) media = SITE + media;
  var list = JSON.parse(http.get(media, { Referer: SITE + "/porn-video/" + id + "/", Cookie: p.cookies }));
  var cap = env.tor ? 720 : 1080, best = -1, file = null, smallest = null, low = 1e9, qualities = [];
  list.forEach(function (q) {
    var h = parseInt(q.quality, 10);
    if (!h || !q.videoUrl) return;
    qualities.push({ url: q.videoUrl, height: h });
    if (h <= cap && h > best) { best = h; file = q.videoUrl; }
    if (h < low) { low = h; smallest = q.videoUrl; }
  });
  file = file || smallest;
  if (!file) throw new Error("no stream");
  var title = html.match(/<meta property="og:title" content="([^"]*)"/);
  return { url: file, hls: false, title: title ? util.unescape(title[1]) : "", referer: SITE + "/", qualities: qualities };
}
