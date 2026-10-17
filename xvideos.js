var SITE = "https://www.xvideos.com";

function call(html, name) {
  var m = html.match(new RegExp(name + "\\('([^']*)'\\)"));
  return m ? m[1] : "";
}

function seconds(text) {
  var total = 0, any = false, re = /(\d+)\s*(h|min|sec|s)/g, m;
  while ((m = re.exec(text))) {
    any = true;
    var n = parseInt(m[1], 10);
    total += m[2] == "h" ? n * 3600 : m[2] == "min" ? n * 60 : n;
  }
  return any ? total : -1;
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 0;
  var html = http.get(SITE + "/?k=" + encodeURIComponent(query) + (page > 0 ? "&p=" + page : ""));
  var blocks = html.split('class="frame-block thumb-block');
  var items = [];
  for (var i = 1; i < blocks.length; i++) {
    var b = blocks[i];
    var href = b.match(/href="(\/video\.?[a-z0-9]+\/[^"]*)"/);
    var title = b.match(/<p class="title"><a [^>]*title="([^"]*)"/);
    if (!href || !title) continue;
    var name = b.match(/<span class="name">([^<]+)<\/span>/);
    var duration = b.match(/<span class="duration">([^<]+)<\/span>/);
    var thumb = b.match(/data-src="(https:\/\/[^"]+)"/);
    items.push({
      url: SITE + href[1],
      title: util.unescape(title[1]),
      author: name ? util.unescape(name[1]).trim() : "",
      duration: duration ? seconds(duration[1]) : -1,
      thumb: thumb ? thumb[1] : null
    });
  }
  return { items: items, next: items.length && html.indexOf("next-page") >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var hls = call(html, "setVideoHLS");
  var mp4 = call(html, "setVideoUrlHigh") || call(html, "setVideoUrlLow");
  if (!hls && !mp4) throw new Error("no stream");
  var out = {
    url: hls || mp4,
    hls: !!hls,
    title: util.unescape(call(html, "setVideoTitle")),
    author: util.unescape(call(html, "setUploaderName"))
  };
  if (hls && mp4) out.fallback = { url: mp4, hls: false };
  var slide = html.match(/setThumbSlideBig\('([^']+)'\)/);
  if (slide) out.sprite = { url: slide[1], width: 208, height: 117, cols: 10, rows: 10, count: 100 };
  return out;
}
