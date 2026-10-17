var API = "https://www.bellesa.co/api/rest/v1/videos";
var PAGE = 24;

function author(v) {
  var p = v.content_provider || [];
  return p.length && p[0].name ? p[0].name : "Bellesa";
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var videos = http.json(API + "/search?q=" + encodeURIComponent(query) + "&limit=" + PAGE + "&page=" + page) || [];
  var items = [];
  videos.forEach(function (v) {
    if ((v.access && v.access.plus) || !v.source) return;
    items.push({
      url: "https://www.bellesa.co/videos/" + v.id,
      title: v.title || "",
      author: author(v),
      duration: v.duration,
      views: v.views,
      thumb: (v.image || "").replace("/image/upload/", "/image/upload/w_480,q_70/"),
      date: v.posted_on > 0 ? v.posted_on : undefined
    });
  });
  return { items: items, next: videos.length >= PAGE ? String(page + 1) : null };
}

function resolve(url) {
  var m = /bellesa\.co\/videos\/(\d+)/.exec(url);
  if (!m) throw new Error("not a video link");
  var v = http.json(API + "/" + m[1]);
  if (v.access && v.access.plus) throw new Error("members only");
  if (!v.source) throw new Error("video unavailable");
  var best = 0;
  String(v.resolutions || "").split(",").forEach(function (r) {
    var h = parseInt(r, 10);
    if (h <= 720 && h > best) best = h;
  });
  return { url: "https://s.bellesa.co/v/" + v.source + "/" + (best || 480) + ".mp4", hls: false, title: v.title || "", author: author(v) };
}
