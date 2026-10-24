var SITE = "https://www.redtube.com";

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var root = http.json("https://api.redtube.com/?data=redtube.Videos.searchVideos&output=json&thumbsize=medium&search="
      + encodeURIComponent(query) + "&page=" + page);
  var items = [];
  (root.videos || []).forEach(function (w) {
    var v = w.video;
    if (!v || !v.video_id) return;
    items.push({
      url: SITE + "/" + v.video_id,
      title: util.unescape(v.title || ""),
      author: "",
      duration: util.duration(v.duration || ""),
      views: v.views || -1,
      thumb: v.thumb || v.default_thumb,
      date: v.publish_date
    });
  });
  var count = parseInt(root.count, 10) || 0;
  return { items: items, next: items.length && page * 20 < count ? String(page + 1) : null };
}

function resolve(url) {
  var id = url.match(/redtube\.com\/(\d+)/)[1];
  var p = http.page(SITE + "/" + id);
  if (p.status >= 400) throw new Error("video unavailable");
  var html = p.body;
  var m = html.match(/"format":"mp4","videoUrl":"([^"]+)"/);
  if (!m) throw new Error("video unavailable");
  var list = JSON.parse(http.get(SITE + m[1].replace(/\\\//g, "/"), { Referer: SITE + "/" + id, Cookie: p.cookies }));
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
