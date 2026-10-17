var SITE = "https://www.pornhub.com";
var REFERER = SITE + "/";

function clean(s) {
  return (s || "").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
}

function viewkey(url) {
  var m = url.match(/pornhub\.com\/view_video\.php\?viewkey=([A-Za-z0-9]+)/);
  if (!m) throw new Error("not a video link");
  return m[1];
}

function api(url) {
  var text = http.get(url);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Captcha needed (aylo answered a page instead of JSON)");
  }
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var root = api(SITE + "/webmasters/search?search=" + encodeURIComponent(query) + "&page=" + page);
  var videos = root.videos || [];
  var items = [];
  videos.forEach(function (v) {
    if (!v.url || !/view_video\.php\?viewkey=/.test(v.url)) return;
    items.push({
      url: v.url,
      title: clean(v.title),
      author: "",
      duration: util.duration(v.duration || ""),
      views: parseInt(v.views, 10) || -1,
      thumb: v.default_thumb
    });
  });
  return { items: items, next: videos.length >= 20 ? String(page + 1) : null };
}

function tags(url) {
  var video = api(SITE + "/webmasters/video_by_id?id=" + viewkey(url)).video || {};
  var out = [];
  (video.tags || []).forEach(function (t) { if (t.tag_name) out.push(t.tag_name); });
  (video.categories || []).forEach(function (c) { if (c.category) out.push(c.category.replace(/-/g, " ")); });
  return { tags: out };
}

function flashvars(html) {
  var m = /var flashvars(?:_\d+)?\s*=\s*\{/.exec(html);
  if (!m) return null;
  var start = m.index + m[0].length - 1, depth = 0, string = false;
  for (var i = start; i < html.length; i++) {
    var c = html.charAt(i);
    if (string) {
      if (c == "\\") i++;
      else if (c == "\"") string = false;
    } else if (c == "\"") string = true;
    else if (c == "{") depth++;
    else if (c == "}" && --depth == 0) return html.substring(start, i + 1);
  }
  return null;
}

function attempt(url) {
  var html = http.get(SITE + "/embed/" + viewkey(url));
  var json = flashvars(html);
  if (!json) {
    if (html.indexOf("mediaDefinitions") >= 0 || html.indexOf("flashvars") < 0) {
      throw new Error("Captcha needed (aylo video page without player)");
    }
    throw new Error("video unavailable");
  }
  var vars = JSON.parse(json);
  var cap = env.tor ? 720 : 1080, best = -1, hls = null;
  (vars.mediaDefinitions || []).forEach(function (d) {
    if (d.format != "hls") return;
    var q = parseInt(d.quality, 10);
    if (q <= cap && q > best) {
      best = q;
      hls = d.videoUrl;
    }
  });
  if (!hls) throw new Error("no stream");
  var status = http.check(hls, { Referer: REFERER, Origin: SITE }).status;
  if (status != 200) throw new Error("Captcha needed (aylo playlist " + status + ")");
  return { url: hls, hls: true, title: clean(vars.video_title), referer: REFERER };
}

function resolve(url) {
  var last;
  for (var i = 0; i < 4; i++) {
    try {
      return attempt(url);
    } catch (e) {
      if (String(e).indexOf("Captcha needed") < 0) throw e;
      last = e;
    }
  }
  throw last;
}
