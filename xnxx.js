var SITE = "https://www.xnxx.com";

function call(html, name) {
  var m = html.match(new RegExp(name + "\\('([^']*)'\\)"));
  return m ? m[1] : "";
}

function seconds(text) {
  var total = 0, any = false, re = /(\d+)\s*(h|min|sec|s)\b/g, m;
  while ((m = re.exec(text))) {
    any = true;
    var n = parseInt(m[1], 10);
    total += m[2] == "h" ? n * 3600 : m[2] == "min" ? n * 60 : n;
  }
  return any ? total : -1;
}

function views(text) {
  var m = /([\d.,]+)\s*([kM]?)/.exec(text || "");
  if (!m) return -1;
  var n = parseFloat(m[1].replace(/,/g, ""));
  return Math.round(m[2] == "k" ? n * 1000 : m[2] == "M" ? n * 1000000 : n);
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 0;
  var html = http.get(SITE + "/search/" + encodeURIComponent(query) + (page > 0 ? "/" + page : ""));
  var blocks = html.split('class="thumb-block');
  var items = [];
  for (var i = 1; i < blocks.length; i++) {
    var b = blocks[i];
    var href = b.match(/<a href="(\/video-[a-z0-9]+\/[^"]*)" title="([^"]*)"/);
    if (!href) continue;
    var name = b.match(/<span class="name">([^<]+)<\/span>/);
    var meta = b.match(/<p class="metadata">([\s\S]*?)<\/p>/);
    var seen = meta ? meta[1].match(/<span class="right">\s*([^<]*)</) : null;
    var thumb = b.match(/data-src="(https:\/\/[^"]+\.jpg)"/);
    items.push({
      url: SITE + href[1],
      title: util.unescape(href[2]),
      author: name ? util.unescape(name[1]).trim() : "",
      duration: meta ? seconds(meta[1].replace(/<[^>]*>/g, " ")) : -1,
      views: seen ? views(seen[1]) : -1,
      thumb: thumb ? thumb[1] : null
    });
  }
  return { items: items, next: items.length && html.indexOf('no-page next') >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var hls = call(html, "setVideoHLS");
  var mp4 = call(html, "setVideoUrlHigh") || call(html, "setVideoUrlLow");
  if (!hls && !mp4) throw new Error("no stream");
  var out = {
    url: hls || mp4,
    hls: !!hls,
    title: util.unescape(call(html, "setVideoTitle"))
  };
  if (hls && mp4) out.fallback = { url: mp4, hls: false };
  return out;
}
