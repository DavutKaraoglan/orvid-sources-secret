var SITE = "https://pornone.com";

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var q = encodeURIComponent(query);
  var html = http.get(page > 1 ? SITE + "/search/" + page + "?q=" + q : SITE + "/search?q=" + q);
  var re = /<a href="(https:\/\/pornone\.com\/[^"]+\/\d+\/)"[^>]*videocard[^>]*>/g, m, cards = [];
  while ((m = re.exec(html))) cards.push({ at: m.index, link: m[1] });
  var items = [], seen = {};
  for (var i = 0; i < cards.length; i++) {
    var end = i + 1 < cards.length ? cards[i + 1].at : Math.min(html.length, cards[i].at + 6000);
    var b = html.substring(cards[i].at, end);
    if (seen[cards[i].link]) continue;
    seen[cards[i].link] = true;
    var thumb = /<img src="(https:\/\/[^"]+)"\s+alt="([^"]*)"[^>]*imgvideo/.exec(b);
    var title = /class="videotitle[^"]*">\s*([^<]+)</.exec(b);
    var name = title ? title[1] : thumb ? thumb[2] : null;
    if (!name) continue;
    var duration = /durlabel">(?:\s*<img[^>]*>)?\s*([0-9:]+)/.exec(b);
    items.push({
      url: cards[i].link,
      title: util.unescape(name),
      author: "",
      duration: duration ? util.duration(duration[1]) : -1,
      thumb: thumb ? thumb[1] : null
    });
  }
  return { items: items, next: items.length && html.indexOf("/search/" + (page + 1) + "?q=") >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html);
  var cap = env.tor ? 720 : 1080, best = -1, lowest = 1e9, file = null, smallest = null;
  var re = /<source[^>]+src="([^"]+)"[^>]*res="(\d+)"/g, m, qualities = [];
  while ((m = re.exec(html))) {
    var h = parseInt(m[2], 10);
    qualities.push({ url: m[1], height: h });
    if (h <= cap && h > best) {
      best = h;
      file = m[1];
    }
    if (h < lowest) {
      lowest = h;
      smallest = m[1];
    }
  }
  file = file || smallest;
  if (!file) throw new Error("no stream");
  var out = { url: file, hls: false, title: title ? util.unescape(title[1]) : "", qualities: qualities };
  var slide = /slideImage:\s*'([^']+\/sprite\/[^']+-(\d+)-(\d+)-(\d+)-\d+-[0-9a-f]+\.jpg)'/.exec(html);
  if (slide) {
    var n = parseInt(slide[4], 10);
    out.sprite = { url: slide[1], width: parseInt(slide[2], 10), height: parseInt(slide[3], 10), cols: n, rows: 1, count: n };
  }
  return out;
}
