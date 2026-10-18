var SITE = "https://nonktube.com";

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var q = encodeURIComponent(query.trim().replace(/\s+/g, "-"));
  var html = http.get(SITE + "/search/" + q + "/" + (page > 1 ? "page/" + page + "/" : ""));
  var parts = html.split('class="video-block video-with-trailer"'), items = [], seen = {};
  for (var i = 1; i < parts.length; i++) {
    var b = parts[i];
    var link = /href="(https:\/\/nonktube\.com\/video\/[^"]+)"/.exec(b);
    if (!link || seen[link[1]]) continue;
    seen[link[1]] = true;
    var title = /class="infos[^"]*" href="[^"]+" title="([^"]+)"/.exec(b) || /class="title">([^<]+)</.exec(b);
    if (!title) continue;
    var thumb = /<img class="video-img[^>]*src="([^"]+)"/.exec(b);
    var duration = /class="duration">([0-9:]+)</.exec(b);
    items.push({
      url: link[1],
      title: util.unescape(title[1]),
      author: "",
      duration: duration ? util.duration(duration[1]) : -1,
      thumb: thumb ? thumb[1] : null
    });
  }
  return { items: items, next: items.length && html.indexOf("/page/" + (page + 1) + "/") >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var list = /sources\s*:\s*(\[[^\]]+\])/.exec(html);
  if (!list) throw new Error("no stream");
  var sources = JSON.parse(list[1]), best = null, lowest = null;
  for (var i = 0; i < sources.length; i++) {
    var s = sources[i];
    if (!s.src) continue;
    if (!best || s.res > best.res) best = s;
    if (!lowest || s.res < lowest.res) lowest = s;
  }
  if (!best) throw new Error("no stream");
  var title = /<title>([^<]*)<\/title>/.exec(html);
  var out = {
    url: best.src,
    hls: false,
    title: title ? util.unescape(title[1]).replace(/\s+Video\s+-\s+Free Porn Tube Videos.*$/i, "") : ""
  };
  if (lowest && lowest.src != best.src) out.fallback = { url: lowest.src, hls: false };
  return out;
}
