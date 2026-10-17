var SITE = "https://www.tnaflix.com";

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var html = http.get(SITE + "/search?what=" + encodeURIComponent(query) + (page > 1 ? "&page=" + page : ""));
  var blocks = html.split("data-vid=\"");
  var items = [], seen = {};
  for (var i = 1; i < blocks.length; i++) {
    var b = blocks[i];
    var href = /href="(https:\/\/www\.tnaflix\.com\/[^"]+\/video\d+)"/.exec(b);
    var title = /class="video-title[^"]*">([^<]+)</.exec(b);
    if (!href || !title || seen[href[1]]) continue;
    seen[href[1]] = true;
    var author = /href="https:\/\/www\.tnaflix\.com\/profile\/[^"]*"[^>]*>([^<]+)</.exec(b);
    var duration = /video-duration">\s*([0-9:]+)/.exec(b);
    var views = /icon-eye"><\/i>\s*([^<]+)</.exec(b);
    var thumb = /<img[^>]+src="(https:\/\/img\.tnaflix[^"]+)"/.exec(b);
    items.push({
      url: href[1],
      title: util.unescape(title[1]),
      author: author ? util.unescape(author[1]) : "",
      duration: duration ? util.duration(duration[1]) : -1,
      views: views ? util.number(views[1]) : -1,
      thumb: thumb ? thumb[1] : null
    });
  }
  return { items: items, next: items.length && html.indexOf("page=" + (page + 1)) >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html);
  var cap = env.tor ? 720 : 1080, best = -1, file = null;
  var re = /<source[^>]+src="([^"]+)"[^>]*size="(\d+)"/g, m;
  while ((m = re.exec(html))) {
    var h = parseInt(m[2], 10);
    if (h <= cap && h > best) {
      best = h;
      file = util.unescape(m[1]);
    }
  }
  if (!file) throw new Error("no stream");
  return { url: file, hls: false, title: title ? util.unescape(title[1]) : "" };
}
