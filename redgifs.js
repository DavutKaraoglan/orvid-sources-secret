var API = "https://api.redgifs.com/v2/";

function token() {
  var t = cache.get("token");
  if (t) return t;
  var root;
  try {
    root = JSON.parse(http.get(API + "auth/temporary"));
  } catch (e) {
    if (String(e).indexOf("SyntaxError") < 0) throw e;
    throw new Error("Captcha needed (redgifs token answer is not JSON)");
  }
  if (!root.token) throw new Error("no redgifs token");
  cache.put("token", root.token, 20 * 3600 * 1000);
  return root.token;
}

function call(path) {
  var text;
  try {
    text = http.get(API + path, { Authorization: "Bearer " + token() });
  } catch (e) {
    if (String(e).indexOf("401") >= 0) cache.put("token", "", 0);
    throw e;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Captcha needed (redgifs answer is not JSON)");
  }
}

function title(g) {
  if (g.description && g.description.trim()) return util.unescape(g.description).split("\n")[0];
  var tags = (g.tags || []).slice(0, 6).join(", ");
  return tags || g.id;
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var root = call("gifs/search?query=" + encodeURIComponent(query) + "&count=40&order=top&page=" + page);
  var items = [];
  (root.gifs || []).forEach(function (g) {
    if (!g.id) return;
    var urls = g.urls || {};
    items.push({
      url: "https://www.redgifs.com/watch/" + g.id,
      title: title(g),
      author: g.userName || "",
      duration: g.duration > 0 ? Math.ceil(g.duration) : -1,
      views: g.views,
      thumb: urls.poster || urls.thumbnail,
      date: g.createDate > 0 ? g.createDate : undefined
    });
  });
  return { items: items, next: items.length && page < (root.pages || 0) ? String(page + 1) : null };
}

function resolve(url) {
  var m = /redgifs\.com\/(?:watch|ifr)\/([A-Za-z]+)/.exec(url);
  if (!m) throw new Error("not a video link");
  var g = call("gifs/" + m[1].toLowerCase()).gif;
  var urls = g.urls || {};
  var file = urls.hd || urls.sd;
  if (!file) throw new Error("no stream");
  return { url: file, hls: false, title: title(g), author: g.userName || "" };
}
