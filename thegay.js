var HOST = "thegay.com";
var VIDEO = /https?:\/\/(?:www\.)?(thegay\.com)\/(?:videos?[\/-]|embed\/)(\d+)/;
var LETTERS = { "Ѕ": "S", "І": "I", "Ј": "J", "А": "A", "В": "B", "Е": "E", "К": "K",
  "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Х": "X", ",": "/", ".": "+", "~": "=" };

function json(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Captcha needed (txxx answered a page instead of JSON)");
  }
}

function decode(text) {
  return util.base64(text.replace(/[ЅІЈАВЕКМНОРСХ,.~]/g,
      function (c) { return LETTERS[c]; }));
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var root = json(http.get("https://" + HOST + "/api/videos2.php?params=86400/str/relevance/60/search.." + page + ".all..&s="
      + encodeURIComponent(query)));
  var items = [];
  (root.videos || []).forEach(function (v) {
    if (!v.video_id) return;
    items.push({
      url: "https://" + HOST + "/videos/" + v.video_id + "/" + (v.dir || "") + "/",
      title: util.unescape(v.title),
      author: v.username || "",
      duration: util.duration(v.duration || ""),
      views: util.number(String(v.video_viewed || "-1")),
      thumb: v.scr,
      date: v.post_date
    });
  });
  var pages = parseInt(root.pages, 10) || 0;
  return { items: items, next: items.length && page < pages ? String(page + 1) : null };
}

function resolve(url) {
  var m = VIDEO.exec(url);
  if (!m) throw new Error("not a video link");
  var host = m[1], id = m[2];
  var headers = { Referer: url, "X-Requested-With": "XMLHttpRequest" };
  var files = json(http.get("https://" + host + "/api/videofile.php?video_id=" + id + "&lifetime=8640000", headers));
  var file = null;
  for (var i = 0; i < files.length && !file; i++) {
    if (!files[i].video_url) continue;
    var path = decode(files[i].video_url);
    file = /^http/.test(path) ? path : "https://" + host + path;
  }
  if (!file) throw new Error("no stream");
  var out = { url: file, hls: false, referer: url, title: "", author: "" };
  try {
    var n = parseInt(id, 10);
    var slug = Math.floor(n / 1000000) * 1000000 + "/" + Math.floor(n / 1000) * 1000;
    var info = json(http.get("https://" + host + "/api/json/video/86400/" + slug + "/" + id + ".json", headers)).video;
    out.title = util.unescape(info.title);
    out.author = (info.user && info.user.username) || "";
  } catch (e) {
  }
  return out;
}
